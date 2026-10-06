"use server";

/**
 * What a patient can do from their link: confirm, cancel, move, or (after a
 * missed visit) book a new time. Every call re-verifies the token, scopes to
 * the clinic in it, and checks the appointment belongs to that patient.
 */

import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { runAsClinic } from "@/lib/tenant";
import { verifyPatientLinkToken, type PatientLink } from "@/lib/patient-links";
import {
  bookAppointment,
  conflictMessage,
  rescheduleAppointment,
  transitionAppointment,
  type ActingAs,
} from "@/lib/appointments";
import { getAvailableSlots, getClinicSettings } from "@/lib/clinic";
import { recordAudit } from "@/lib/audit";
import type { ApiResult } from "@/lib/contract";

const PATIENT: ActingAs = { actor: { id: null, role: null }, via: "patient_link" };
const invalid = (message: string) => ({ ok: false, error: { message } }) as const;
const EXPIRED = "This link has expired or is not valid. Please ask the clinic for a new one.";

async function withLink<T>(
  token: string,
  fn: (link: PatientLink) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const link = await verifyPatientLinkToken(token);
  if (!link) return invalid(EXPIRED);
  return runAsClinic(link.clinicId, () => fn(link));
}

/** The appointment must exist in this clinic and belong to the link's patient. */
async function ownAppointment(link: PatientLink, appointmentId: string) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  return appt && appt.patientId === link.patientId ? appt : null;
}

const idSchema = z.uuid();

export async function confirmViaLink(
  token: string,
  appointmentId: string
): Promise<ApiResult<null>> {
  if (!idSchema.safeParse(appointmentId).success) return invalid("Bad request.");
  return withLink(token, async (link) => {
    const appt = await ownAppointment(link, appointmentId);
    if (!appt) return invalid("Appointment not found.");
    if (appt.status === "CONFIRMED") return { ok: true, data: null };
    const r = await transitionAppointment(appt.id, "CONFIRMED", undefined, PATIENT);
    return r.ok ? { ok: true, data: null } : invalid("This visit can no longer be confirmed.");
  });
}

export async function cancelViaLink(
  token: string,
  appointmentId: string,
  reason: string
): Promise<ApiResult<null>> {
  if (!idSchema.safeParse(appointmentId).success) return invalid("Bad request.");
  const why = reason.trim().slice(0, 300);
  return withLink(token, async (link) => {
    const appt = await ownAppointment(link, appointmentId);
    if (!appt) return invalid("Appointment not found.");
    const r = await transitionAppointment(appt.id, "CANCELLED", why || "Cancelled by patient", PATIENT);
    return r.ok ? { ok: true, data: null } : invalid("This visit can no longer be cancelled.");
  });
}

/** Free start times the patient may choose. Visit length comes from the appointment. */
export async function slotsViaLink(
  token: string,
  appointmentId: string,
  date: string
): Promise<ApiResult<{ slots: string[]; closed: boolean; durationMins: number }>> {
  if (!idSchema.safeParse(appointmentId).success) return invalid("Bad request.");
  if (!z.iso.date().safeParse(date).success) return invalid("Bad date.");
  return withLink(token, async (link) => {
    const appt = await ownAppointment(link, appointmentId);
    if (!appt) return invalid("Appointment not found.");
    const durationMins = Math.max(
      5,
      Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000)
    );
    const result = await getAvailableSlots({
      date,
      durationMins,
      providerId: appt.providerId,
      chairId: appt.chairId,
      excludeAppointmentId: appt.id,
    });
    return { ok: true, data: result };
  });
}

export async function rescheduleViaLink(
  token: string,
  appointmentId: string,
  startsAt: string
): Promise<ApiResult<null>> {
  if (!idSchema.safeParse(appointmentId).success) return invalid("Bad request.");
  if (!z.iso.datetime().safeParse(startsAt).success) return invalid("Bad time.");
  return withLink(token, async (link) => {
    const appt = await ownAppointment(link, appointmentId);
    if (!appt) return invalid("Appointment not found.");
    const durationMs = appt.endsAt.getTime() - appt.startsAt.getTime();
    const start = new Date(startsAt);
    if (start.getTime() < Date.now()) return invalid("That time has passed.");
    const r = await rescheduleAppointment(
      appt.id,
      { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + durationMs).toISOString() },
      PATIENT
    );
    if (r.ok) return { ok: true, data: null };
    return invalid(
      r.reason === "conflict"
        ? "That time was just taken. Please pick another."
        : "This visit can no longer be moved. Please call the clinic."
    );
  });
}

/**
 * After a missed or cancelled visit, the patient books a replacement. The new
 * booking points back at the missed one, so the dashboard counts it as
 * recovered — the same attribution the Retention Agent's golden path uses.
 */
export async function rebookViaLink(
  token: string,
  missedAppointmentId: string,
  startsAt: string
): Promise<ApiResult<{ appointmentId: string }>> {
  if (!idSchema.safeParse(missedAppointmentId).success) return invalid("Bad request.");
  if (!z.iso.datetime().safeParse(startsAt).success) return invalid("Bad time.");
  return withLink(token, async (link) => {
    const missed = await ownAppointment(link, missedAppointmentId);
    if (!missed) return invalid("Appointment not found.");
    if (missed.status !== "NO_SHOW" && missed.status !== "CANCELLED") {
      return invalid("This visit is still booked; move it instead.");
    }
    const already = await prisma.appointment.findUnique({ where: { rebookedFromId: missed.id } });
    if (already) return invalid("A new visit has already been booked for this one.");

    const durationMs = missed.endsAt.getTime() - missed.startsAt.getTime();
    const start = new Date(startsAt);
    if (start.getTime() < Date.now()) return invalid("That time has passed.");

    const r = await bookAppointment(
      {
        patientId: missed.patientId,
        providerId: missed.providerId,
        chairId: missed.chairId,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + durationMs).toISOString(),
        reason: missed.reason,
        estimatedValue: missed.estimatedValue ? Number(missed.estimatedValue) : null,
        rebookedFromId: missed.id,
      },
      PATIENT
    );
    if (!r.ok) {
      return invalid(r.reason === "conflict" ? conflictMessage(r.conflict) : "Could not book that time.");
    }
    await recordAudit({
      actor: PATIENT.actor!,
      action: "appointment.rebooked_by_patient",
      entityType: "Appointment",
      entityId: r.appointment.id,
      metadata: { patientId: missed.patientId, rebookedFromId: missed.id, via: "patient_link" },
    });
    return { ok: true, data: { appointmentId: r.appointment.id } };
  });
}

/** Slots for a replacement visit, sized like the missed one. */
export async function rebookSlotsViaLink(
  token: string,
  missedAppointmentId: string,
  date: string
): Promise<ApiResult<{ slots: string[]; closed: boolean; durationMins: number }>> {
  if (!idSchema.safeParse(missedAppointmentId).success) return invalid("Bad request.");
  if (!z.iso.date().safeParse(date).success) return invalid("Bad date.");
  return withLink(token, async (link) => {
    const missed = await ownAppointment(link, missedAppointmentId);
    if (!missed) return invalid("Appointment not found.");
    const settings = await getClinicSettings();
    const durationMins = Math.max(
      5,
      Math.round((missed.endsAt.getTime() - missed.startsAt.getTime()) / 60000) || settings.defaultVisitMinutes
    );
    const result = await getAvailableSlots({
      date,
      durationMins,
      providerId: missed.providerId,
      chairId: missed.chairId,
    });
    return { ok: true, data: result };
  });
}
