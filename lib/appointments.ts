import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getFrontDeskActor } from "@/lib/actors";
import { generateForAppointment } from "@/lib/retention-agent";
import {
  toAppointment,
  toAppointmentWithPatient,
  toRecommendation,
} from "@/lib/serializers";
import type {
  Appointment,
  AppointmentWithPatient,
  CreateAppointmentRequest,
  ListAppointmentsResponse,
  MarkNoShowResponse,
  UpdateAppointmentRequest,
} from "@/lib/contract";
import type { z } from "zod/v4";
import type { listAppointmentsQuerySchema } from "@/lib/validation";

type ListArgs = z.output<typeof listAppointmentsQuerySchema>;

/** Everything `AppointmentWithPatient` needs in a single query. */
const withContext = {
  patient: true,
  provider: true,
  recommendations: {
    where: { status: "PENDING" as const },
    select: { id: true },
  },
} as const;

export async function listAppointments({
  page,
  pageSize,
  patientId,
  status,
  from,
  to,
}: ListArgs): Promise<ListAppointmentsResponse> {
  const startsAt =
    from || to
      ? { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) }
      : undefined;

  const where = {
    ...(startsAt ? { startsAt } : {}),
    ...(status ? { status } : {}),
    ...(patientId ? { patientId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: withContext,
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    items: rows.map(toAppointmentWithPatient),
    total,
    page,
    pageSize,
  };
}

export async function getAppointment(
  id: string
): Promise<AppointmentWithPatient | null> {
  const row = await prisma.appointment.findUnique({
    where: { id },
    include: withContext,
  });
  return row ? toAppointmentWithPatient(row) : null;
}

export async function createAppointment(
  input: CreateAppointmentRequest
): Promise<Appointment> {
  const row = await prisma.appointment.create({
    data: {
      patientId: input.patientId,
      providerId: input.providerId ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      status: input.status ?? "SCHEDULED",
      reason: input.reason ?? null,
      estimatedValue: input.estimatedValue ?? null,
      rebookedFromId: input.rebookedFromId ?? null,
    },
  });

  await recordAudit({
    actor: await getFrontDeskActor(),
    action: "appointment.created",
    entityType: "Appointment",
    entityId: row.id,
    metadata: {
      patientId: row.patientId,
      startsAt: row.startsAt.toISOString(),
      status: row.status,
      ...(row.rebookedFromId ? { rebookedFromId: row.rebookedFromId } : {}),
    },
  });

  return toAppointment(row);
}

/**
 * A patch may move only one end of the window, so the invariant is re-checked
 * against the stored row rather than against the payload alone.
 */
export async function updateAppointment(
  id: string,
  input: UpdateAppointmentRequest
): Promise<
  { ok: true; appointment: Appointment } | { ok: false; reason: "notFound" | "badWindow" }
> {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };

  const startsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
  const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
  if (endsAt <= startsAt) return { ok: false, reason: "badWindow" };

  const row = await prisma.appointment.update({
    where: { id },
    data: {
      patientId: input.patientId,
      providerId: input.providerId,
      startsAt,
      endsAt,
      status: input.status,
      reason: input.reason,
      estimatedValue: input.estimatedValue,
      rebookedFromId: input.rebookedFromId,
    },
  });

  await recordAudit({
    actor: await getFrontDeskActor(),
    action: "appointment.updated",
    entityType: "Appointment",
    entityId: id,
    metadata: {
      fields: Object.keys(input),
      ...(input.status && input.status !== existing.status
        ? { statusFrom: existing.status, statusTo: input.status }
        : {}),
    },
  });

  return { ok: true, appointment: toAppointment(row) };
}

const CANCELLABLE: readonly string[] = ["SCHEDULED", "CONFIRMED"];

/**
 * Cancelling is a status transition; the row and its history are preserved.
 *
 * The caller's `reason` is deliberately not written to `Appointment.reason` —
 * that field is the clinical reason for the visit, and overwriting it would
 * corrupt the record. It lands in the audit event's metadata instead.
 */
export async function cancelAppointment(
  id: string,
  reason?: string
): Promise<
  { ok: true; appointment: Appointment } | { ok: false; reason: "notFound" | "badStatus" }
> {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };
  if (!CANCELLABLE.includes(existing.status)) {
    return { ok: false, reason: "badStatus" };
  }

  const row = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await recordAudit({
    actor: await getFrontDeskActor(),
    action: "appointment.cancelled",
    entityType: "Appointment",
    entityId: id,
    metadata: {
      patientId: row.patientId,
      from: existing.status,
      ...(reason ? { reason } : {}),
    },
  });

  return { ok: true, appointment: toAppointment(row) };
}

/**
 * Flips the appointment to NO_SHOW and hands it straight to the Retention Agent.
 *
 * CLAUDE.md ties the two together: a no-show is the agent's trigger, so by the
 * time the front desk's screen repaints, the draft is already sitting in the
 * approval queue. Idempotent — re-marking an existing no-show reports the draft
 * that is already there rather than writing a second one.
 */
export async function markNoShow(
  id: string
): Promise<MarkNoShowResponse | null> {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return null;

  const alreadyFlagged = existing.status === "NO_SHOW";
  const row = alreadyFlagged
    ? existing
    : await prisma.appointment.update({
        where: { id },
        data: { status: "NO_SHOW" },
      });

  // Idempotent call, so only the transition itself is logged — re-marking an
  // existing no-show is not a new clinical event.
  if (!alreadyFlagged) {
    await recordAudit({
      actor: await getFrontDeskActor(),
      action: "appointment.no_show",
      entityType: "Appointment",
      entityId: id,
      metadata: {
        patientId: row.patientId,
        from: existing.status,
        startsAt: row.startsAt.toISOString(),
      },
    });
  }

  // Returns null when this appointment has already been drafted for, in which
  // case the existing recommendation is the one to report — including an
  // already-approved one, so a repeat call still shows what was done about it.
  const generated = await generateForAppointment(id);
  const recommendation =
    generated ??
    (await prisma.recommendation
      .findFirst({
        where: { appointmentId: id },
        orderBy: { createdAt: "desc" },
      })
      .then((r) => (r ? toRecommendation(r) : null)));

  return { appointment: toAppointment(row), recommendation };
}
