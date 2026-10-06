import { z } from "zod/v4";
import { prisma, prismaUnscoped } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { getCurrentActor } from "@/lib/actors";
import {
  DEFAULT_OPENING_HOURS,
  availableSlots,
  isOpeningHours,
  weekdayOf,
  type OpeningHours,
} from "@/lib/opening-hours";
import { HOLDS_SLOT } from "@/lib/schedule-rules";

export interface ClinicSettings {
  id: string;
  name: string;
  timezone: string;
  openingHours: OpeningHours;
  /** False until the clinic has saved hours of its own. */
  hoursConfigured: boolean;
  slotMinutes: number;
  defaultVisitMinutes: number;
}

export async function getClinicSettings(): Promise<ClinicSettings> {
  const clinic = await prismaUnscoped.clinic.findUniqueOrThrow({
    where: { id: await currentClinicId() },
  });
  const hoursConfigured = isOpeningHours(clinic.openingHours);
  return {
    id: clinic.id,
    name: clinic.name,
    timezone: clinic.timezone,
    openingHours: hoursConfigured ? (clinic.openingHours as OpeningHours) : DEFAULT_OPENING_HOURS,
    hoursConfigured,
    slotMinutes: clinic.slotMinutes,
    defaultVisitMinutes: clinic.defaultVisitMinutes,
  };
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const updateClinicSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  openingHours: z
    .partialRecord(
      z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
      z.array(z.tuple([time, time])).max(4)
    )
    .optional(),
  slotMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30)]).optional(),
  defaultVisitMinutes: z.number().int().min(5).max(240).optional(),
});

export async function updateClinicSettings(
  input: z.output<typeof updateClinicSettingsSchema>
): Promise<{ ok: true } | { ok: false; reason: "badHours" }> {
  if (input.openingHours && !isOpeningHours(input.openingHours)) {
    return { ok: false, reason: "badHours" };
  }
  const clinicId = await currentClinicId();
  await prismaUnscoped.clinic.update({
    where: { id: clinicId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.openingHours !== undefined ? { openingHours: input.openingHours } : {}),
      ...(input.slotMinutes !== undefined ? { slotMinutes: input.slotMinutes } : {}),
      ...(input.defaultVisitMinutes !== undefined
        ? { defaultVisitMinutes: input.defaultVisitMinutes }
        : {}),
    },
  });
  await recordAudit({
    actor: await getCurrentActor(),
    action: "clinic.updated",
    entityType: "Clinic",
    entityId: clinicId,
    metadata: { fields: Object.keys(input) },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Chairs
// ---------------------------------------------------------------------------

export interface ChairSummary {
  id: string;
  name: string;
  isActive: boolean;
}

export function listChairs(includeInactive = false): Promise<ChairSummary[]> {
  return prisma.chair.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: { id: true, name: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

export const chairNameSchema = z.string().trim().min(1).max(40);

export async function createChair(
  name: string
): Promise<{ ok: true; chair: ChairSummary } | { ok: false; reason: "duplicate" }> {
  const clinicId = await currentClinicId();
  const existing = await prisma.chair.findFirst({ where: { name } });
  if (existing) return { ok: false, reason: "duplicate" };

  const chair = await prisma.chair.create({
    data: { clinicId, name },
    select: { id: true, name: true, isActive: true },
  });
  await recordAudit({
    actor: await getCurrentActor(),
    action: "chair.created",
    entityType: "Chair",
    entityId: chair.id,
    metadata: { name },
  });
  return { ok: true, chair };
}

export async function setChairActive(id: string, isActive: boolean): Promise<boolean> {
  const result = await prisma.chair.updateMany({ where: { id }, data: { isActive } });
  if (result.count === 0) return false;
  await recordAudit({
    actor: await getCurrentActor(),
    action: "chair.updated",
    entityType: "Chair",
    entityId: id,
    metadata: { isActive },
  });
  return true;
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

export interface SlotQuery {
  /** `YYYY-MM-DD` in the clinic's timezone. */
  date: string;
  durationMins?: number;
  providerId?: string | null;
  chairId?: string | null;
  /** Lets a reschedule ignore the appointment being moved. */
  excludeAppointmentId?: string;
}

/**
 * Start times a new visit could take on `date`. A slot is free when the
 * provider (if chosen) and the chair (if chosen) are both unbooked; with
 * neither chosen, only opening hours and the slot grid apply.
 */
export async function getAvailableSlots(query: SlotQuery): Promise<{
  slots: string[];
  durationMins: number;
  closed: boolean;
}> {
  const settings = await getClinicSettings();
  const durationMins = query.durationMins ?? settings.defaultVisitMinutes;

  const dayStart = new Date(`${query.date}T00:00:00Z`);
  dayStart.setUTCDate(dayStart.getUTCDate() - 1);
  const dayEnd = new Date(`${query.date}T00:00:00Z`);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 2);

  const resourceFilter = [
    ...(query.providerId ? [{ providerId: query.providerId }] : []),
    ...(query.chairId ? [{ chairId: query.chairId }] : []),
  ];

  const busy =
    resourceFilter.length === 0
      ? []
      : await prisma.appointment.findMany({
          where: {
            ...(query.excludeAppointmentId ? { id: { not: query.excludeAppointmentId } } : {}),
            status: { in: [...HOLDS_SLOT] },
            startsAt: { lt: dayEnd },
            endsAt: { gt: dayStart },
            OR: resourceFilter,
          },
          select: { startsAt: true, endsAt: true },
        });

  const slots = availableSlots({
    date: query.date,
    timeZone: settings.timezone,
    hours: settings.openingHours,
    slotMinutes: settings.slotMinutes,
    durationMins,
    busy,
    notBefore: new Date(),
  });

  const open = settings.openingHours[weekdayOf(query.date, settings.timezone)];
  return {
    slots: slots.map((d) => d.toISOString()),
    durationMins,
    closed: !open || open.length === 0,
  };
}
