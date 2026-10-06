import { prisma } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { getFrontDeskActor, type Actor } from "@/lib/actors";

/** Who to record in the audit log; patients acting through a link pass themselves. */
export interface ActingAs {
  actor?: Actor;
  /** Appears in audit metadata so staff can see the move came from the patient. */
  via?: "patient_link";
}
const auditActor = async (as?: ActingAs) => as?.actor ?? (await getFrontDeskActor());
const viaMeta = (as?: ActingAs): Record<string, string> => (as?.via ? { via: as.via } : {});
import { generateForAppointment } from "@/lib/retention-agent";
import { HOLDS_SLOT, canTransition } from "@/lib/schedule-rules";
import type { AppointmentStatus } from "@/app/generated/prisma/enums";
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
  chair: true,
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
  input: CreateAppointmentRequest,
  as?: ActingAs
): Promise<Appointment> {
  const row = await prisma.appointment.create({
    data: {
      clinicId: await currentClinicId(),
      patientId: input.patientId,
      providerId: input.providerId ?? null,
      chairId: input.chairId ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      status: input.status ?? "SCHEDULED",
      // A walk-in is booked as already arrived, so waiting time starts now.
      ...(input.status === "CHECKED_IN" ? { checkedInAt: new Date() } : {}),
      walkIn: input.walkIn ?? false,
      reason: input.reason ?? null,
      estimatedValue: input.estimatedValue ?? null,
      rebookedFromId: input.rebookedFromId ?? null,
    },
  });

  await recordAudit({
    actor: await auditActor(as),
    action: "appointment.created",
    entityType: "Appointment",
    entityId: row.id,
    metadata: {
      patientId: row.patientId,
      startsAt: row.startsAt.toISOString(),
      status: row.status,
      ...(row.rebookedFromId ? { rebookedFromId: row.rebookedFromId } : {}),
      ...viaMeta(as),
    },
  });

  return toAppointment(row);
}

/** A visit can be moved until the patient has arrived. */
const RESCHEDULABLE: readonly string[] = ["SCHEDULED", "CONFIRMED"];

export type SlotConflict = {
  appointmentId: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  /** Whose time collides: the same patient's, the same provider's, or the same chair's. */
  with: "patient" | "provider" | "chair";
};

/**
 * Finds a live appointment overlapping the window for the same patient or, when
 * a provider or chair is named, the same provider or chair.
 */
export async function findSlotConflict(args: {
  patientId: string;
  providerId?: string | null;
  chairId?: string | null;
  startsAt: Date;
  endsAt: Date;
  excludeId?: string;
}): Promise<SlotConflict | null> {
  const row = await prisma.appointment.findFirst({
    where: {
      ...(args.excludeId ? { id: { not: args.excludeId } } : {}),
      status: { in: [...HOLDS_SLOT] },
      startsAt: { lt: args.endsAt },
      endsAt: { gt: args.startsAt },
      OR: [
        { patientId: args.patientId },
        ...(args.providerId ? [{ providerId: args.providerId }] : []),
        ...(args.chairId ? [{ chairId: args.chairId }] : []),
      ],
    },
    include: { patient: true },
    orderBy: { startsAt: "asc" },
  });
  if (!row) return null;

  return {
    appointmentId: row.id,
    patientName: `${row.patient.firstName} ${row.patient.lastName}`,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    with:
      row.patientId === args.patientId
        ? "patient"
        : args.providerId && row.providerId === args.providerId
          ? "provider"
          : "chair",
  };
}

/** One sentence the front desk can act on. Times are left to the caller's locale. */
export function conflictMessage(conflict: SlotConflict): string {
  switch (conflict.with) {
    case "patient":
      return `${conflict.patientName} already has an appointment in that time.`;
    case "provider":
      return `The provider is already booked with ${conflict.patientName} in that time.`;
    case "chair":
      return `That chair is taken by ${conflict.patientName} in that time.`;
  }
}

/** Creates an appointment only if the slot is free. */
export async function bookAppointment(
  input: CreateAppointmentRequest,
  as?: ActingAs
): Promise<
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: "badWindow" }
  | { ok: false; reason: "conflict"; conflict: SlotConflict }
> {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!(endsAt > startsAt)) return { ok: false, reason: "badWindow" };

  const conflict = await findSlotConflict({
    patientId: input.patientId,
    providerId: input.providerId,
    chairId: input.chairId,
    startsAt,
    endsAt,
  });
  if (conflict) return { ok: false, reason: "conflict", conflict };

  return { ok: true, appointment: await createAppointment(input, as) };
}

/**
 * Moves a live appointment to a new window. The row is kept and the old and new
 * times go to the audit log, so the visit's history survives the move.
 */
export async function rescheduleAppointment(
  id: string,
  window: { startsAt: string; endsAt: string },
  as?: ActingAs
): Promise<
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: "notFound" | "badStatus" | "badWindow" }
  | { ok: false; reason: "conflict"; conflict: SlotConflict }
> {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };
  if (!RESCHEDULABLE.includes(existing.status)) {
    return { ok: false, reason: "badStatus" };
  }

  const startsAt = new Date(window.startsAt);
  const endsAt = new Date(window.endsAt);
  if (!(endsAt > startsAt)) return { ok: false, reason: "badWindow" };

  const conflict = await findSlotConflict({
    patientId: existing.patientId,
    providerId: existing.providerId,
    chairId: existing.chairId,
    startsAt,
    endsAt,
    excludeId: id,
  });
  if (conflict) return { ok: false, reason: "conflict", conflict };

  const row = await prisma.appointment.update({
    where: { id },
    data: { startsAt, endsAt },
  });

  await recordAudit({
    actor: await auditActor(as),
    action: "appointment.rescheduled",
    entityType: "Appointment",
    entityId: id,
    metadata: {
      patientId: row.patientId,
      from: existing.startsAt.toISOString(),
      to: row.startsAt.toISOString(),
      ...viaMeta(as),
    },
  });

  return { ok: true, appointment: toAppointment(row) };
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

/**
 * Cancelling is a status transition; the row and its history are preserved.
 *
 * The caller's `reason` is deliberately not written to `Appointment.reason` —
 * that field is the clinical reason for the visit. It goes to
 * `cancellationReason` and the audit event instead.
 */
export async function cancelAppointment(
  id: string,
  reason?: string,
  as?: ActingAs
): Promise<
  { ok: true; appointment: Appointment } | { ok: false; reason: "notFound" | "badStatus" }
> {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };
  if (!canTransition(existing.status, "CANCELLED")) {
    return { ok: false, reason: "badStatus" };
  }

  const row = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancellationReason: reason?.trim() || null },
  });

  await recordAudit({
    actor: await auditActor(as),
    action: "appointment.cancelled",
    entityType: "Appointment",
    entityId: id,
    metadata: {
      patientId: row.patientId,
      from: existing.status,
      ...(reason ? { reason } : {}),
      ...viaMeta(as),
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
  id: string,
  reason?: string
): Promise<MarkNoShowResponse | null> {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return null;

  const alreadyFlagged = existing.status === "NO_SHOW";
  const row = alreadyFlagged
    ? existing
    : await prisma.appointment.update({
        where: { id },
        data: { status: "NO_SHOW", noShowReason: reason?.trim() || null },
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
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
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

const TRANSITION_AUDIT: Partial<Record<AppointmentStatus, "appointment.confirmed" | "appointment.checked_in" | "appointment.in_chair" | "appointment.completed">> = {
  CONFIRMED: "appointment.confirmed",
  CHECKED_IN: "appointment.checked_in",
  IN_CHAIR: "appointment.in_chair",
  COMPLETED: "appointment.completed",
};

/**
 * Moves a visit along the day-of-visit flow. Cancellation and no-show keep
 * their own functions (they free the slot and, for no-shows, wake the
 * Retention Agent); everything else lands here and stamps its timestamp.
 */
export async function transitionAppointment(
  id: string,
  to: AppointmentStatus,
  reason?: string,
  as?: ActingAs
): Promise<
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: "notFound" | "badTransition" }
> {
  if (to === "CANCELLED") {
    const r = await cancelAppointment(id, reason, as);
    return r.ok ? r : { ok: false, reason: r.reason === "notFound" ? "notFound" : "badTransition" };
  }
  if (to === "NO_SHOW") {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) return { ok: false, reason: "notFound" };
    if (!canTransition(existing.status, "NO_SHOW")) return { ok: false, reason: "badTransition" };
    const r = await markNoShow(id, reason);
    return r ? { ok: true, appointment: r.appointment } : { ok: false, reason: "notFound" };
  }

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };
  if (!canTransition(existing.status, to)) return { ok: false, reason: "badTransition" };

  const now = new Date();
  const row = await prisma.appointment.update({
    where: { id },
    data: {
      status: to,
      ...(to === "CHECKED_IN" ? { checkedInAt: now } : {}),
      ...(to === "IN_CHAIR" ? { inChairAt: now } : {}),
      ...(to === "COMPLETED" ? { completedAt: now } : {}),
      // Undoing a confirmation clears nothing: no timestamp was set yet.
    },
  });

  await recordAudit({
    actor: await auditActor(as),
    action: TRANSITION_AUDIT[to] ?? "appointment.updated",
    entityType: "Appointment",
    entityId: id,
    metadata: { patientId: row.patientId, from: existing.status, to, ...viaMeta(as) },
  });

  return { ok: true, appointment: toAppointment(row) };
}
