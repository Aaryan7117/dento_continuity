"use server";

/**
 * Server actions for the staff UI.
 *
 * These are a thin adapter layer: they parse the form-shaped input the
 * components send, delegate to the services in `/lib`, and revalidate the
 * affected pages. The mutation and its audit event live in the service, so the
 * API routes and the UI cannot drift apart or log the same change differently.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { getDentistActor } from "@/lib/actors";
import {
  cancelAppointment,
  markNoShow,
  updateAppointment,
} from "@/lib/appointments";
import {
  approveRecommendation as approveRecommendationRecord,
  dismissRecommendation as dismissRecommendationRecord,
} from "@/lib/recommendations";
import { createEncounter as createEncounterRecord, updateEncounter as updateEncounterRecord } from "@/lib/encounters";
import { createNote, signNote as signNoteRecord } from "@/lib/notes";
import { createToothFinding } from "@/lib/tooth-findings";
import {
  createTreatmentPlan as createTreatmentPlanRecord,
  transitionTreatmentPlan as transitionTreatmentPlanRecord,
} from "@/lib/treatment-plans";
import { createRecall as createRecallRecord } from "@/lib/recalls";
import { FindingType, ToothSurface } from "@/app/generated/prisma/enums";
import type { ApprovalFailure } from "@/lib/recommendations";
import type { ApiResult } from "@/lib/contract";

const invalid = (message = "Validation failed") =>
  ({ ok: false, error: { message } }) as const;

// ---------------------------------------------------------------------------
// Approve recommendation
// ---------------------------------------------------------------------------

const approveSchema = z.object({
  id: z.uuid(),
  editedMessage: z.string().optional(),
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL"]).optional(),
});

export async function approveRecommendation(
  input: z.input<typeof approveSchema>
): Promise<ApiResult<{ recommendationId: string }>> {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const { id, editedMessage, channel } = parsed.data;
  const result = await approveRecommendationRecord(id, {
    editedMessage,
    channel,
  });
  if (!result.ok) return invalid(approvalFailureMessage(result));

  revalidatePath("/front-desk");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${result.recommendation.patientId}`);
  return { ok: true, data: { recommendationId: id } };
}

// ---------------------------------------------------------------------------
// Dismiss recommendation
// ---------------------------------------------------------------------------

const dismissSchema = z.object({
  id: z.uuid(),
  reason: z.string().optional(),
});

export async function dismissRecommendation(
  input: z.input<typeof dismissSchema>
): Promise<ApiResult<{ recommendationId: string }>> {
  const parsed = dismissSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const { id, reason } = parsed.data;
  const result = await dismissRecommendationRecord(id, reason);
  if (!result.ok) return invalid(approvalFailureMessage(result));

  revalidatePath("/front-desk");
  revalidatePath("/dashboard");
  return { ok: true, data: { recommendationId: id } };
}

function approvalFailureMessage(failure: ApprovalFailure): string {
  switch (failure.reason) {
    case "notFound":
      return "Not found";
    case "alreadyProcessed":
      return `Already ${failure.status.toLowerCase()}`;
    case "noApprover":
      return "No front_desk user to approve as";
  }
}

// ---------------------------------------------------------------------------
// Create encounter
// ---------------------------------------------------------------------------

const createEncounterSchema = z.object({
  patientId: z.uuid(),
  appointmentId: z.uuid().optional(),
  providerId: z.uuid().optional(),
  summary: z.string().optional(),
});

export async function createEncounter(
  input: z.input<typeof createEncounterSchema>
): Promise<ApiResult<{ encounterId: string }>> {
  const parsed = createEncounterSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const { patientId, appointmentId, providerId, summary } = parsed.data;

  // The chairside form has no date picker — an encounter is created as the
  // visit happens.
  const encounter = await createEncounterRecord({
    patientId,
    appointmentId: appointmentId ?? null,
    providerId: providerId ?? (await getDentistActor()).id,
    occurredAt: new Date().toISOString(),
    summary: summary ?? null,
  });

  revalidatePath(`/patients/${patientId}`);
  return { ok: true, data: { encounterId: encounter.id } };
}

// ---------------------------------------------------------------------------
// Update encounter (complete / add summary)
// ---------------------------------------------------------------------------

const updateEncounterSchema = z.object({
  id: z.uuid(),
  summary: z.string().optional(),
});

export async function updateEncounter(
  input: z.input<typeof updateEncounterSchema>
): Promise<ApiResult<{ encounterId: string }>> {
  const parsed = updateEncounterSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const { id, summary } = parsed.data;
  const encounter = await updateEncounterRecord(id, { summary });

  revalidatePath(`/patients/${encounter.patientId}`);
  return { ok: true, data: { encounterId: id } };
}

// ---------------------------------------------------------------------------
// Add note
// ---------------------------------------------------------------------------

const addNoteSchema = z.object({
  encounterId: z.uuid(),
  body: z.string().min(1),
});

export async function addNote(
  input: z.input<typeof addNoteSchema>
): Promise<ApiResult<{ noteId: string }>> {
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const note = await createNote(parsed.data, await getDentistActor());

  await revalidatePatientOfEncounter(note.encounterId);
  return { ok: true, data: { noteId: note.id } };
}

// ---------------------------------------------------------------------------
// Sign note
// ---------------------------------------------------------------------------

const signNoteSchema = z.object({ id: z.uuid() });

export async function signNote(
  input: z.input<typeof signNoteSchema>
): Promise<ApiResult<{ noteId: string }>> {
  const parsed = signNoteSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const result = await signNoteRecord(parsed.data.id);
  if (!result.ok) {
    return invalid(
      result.reason === "notFound" ? "Not found" : "Note is already signed"
    );
  }

  await revalidatePatientOfEncounter(result.note.encounterId);
  return { ok: true, data: { noteId: result.note.id } };
}

// ---------------------------------------------------------------------------
// Add tooth finding
// ---------------------------------------------------------------------------

const addToothFindingSchema = z.object({
  patientId: z.uuid(),
  encounterId: z.uuid().optional(),
  toothCode: z.number().int().min(11).max(85),
  finding: z.enum(FindingType),
  surfaces: z.array(z.enum(ToothSurface)).optional(),
  note: z.string().optional(),
});

export async function addToothFinding(
  input: z.input<typeof addToothFindingSchema>
): Promise<ApiResult<{ findingId: string }>> {
  const parsed = addToothFindingSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const finding = await createToothFinding(parsed.data, await getDentistActor());

  revalidatePath(`/patients/${finding.patientId}`);
  return { ok: true, data: { findingId: finding.id } };
}

// ---------------------------------------------------------------------------
// Create treatment plan
// ---------------------------------------------------------------------------

const createTreatmentPlanSchema = z.object({
  patientId: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  estimatedCost: z.number().positive().optional(),
});

export async function createTreatmentPlan(
  input: z.input<typeof createTreatmentPlanSchema>
): Promise<ApiResult<{ planId: string }>> {
  const parsed = createTreatmentPlanSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const plan = await createTreatmentPlanRecord(parsed.data);

  revalidatePath(`/patients/${plan.patientId}`);
  return { ok: true, data: { planId: plan.id } };
}

// ---------------------------------------------------------------------------
// Transition treatment plan (PROPOSED -> ACCEPTED -> COMPLETED)
// ---------------------------------------------------------------------------

const transitionPlanSchema = z.object({
  id: z.uuid(),
  status: z.enum(["PROPOSED", "ACCEPTED", "COMPLETED"]),
});

export async function transitionTreatmentPlan(
  input: z.input<typeof transitionPlanSchema>
): Promise<ApiResult<{ planId: string }>> {
  const parsed = transitionPlanSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const { id, status } = parsed.data;
  const result = await transitionTreatmentPlanRecord(id, status);
  if (!result.ok) {
    return invalid(
      result.reason === "notFound"
        ? "Not found"
        : `Cannot transition from ${result.from} to ${status}`
    );
  }

  revalidatePath(`/patients/${result.plan.patientId}`);
  return { ok: true, data: { planId: id } };
}

// ---------------------------------------------------------------------------
// Create recall
// ---------------------------------------------------------------------------

const createRecallSchema = z.object({
  patientId: z.uuid(),
  treatmentPlanId: z.uuid().optional(),
  dueAt: z.iso.datetime(),
  reason: z.string().optional(),
});

export async function createRecall(
  input: z.input<typeof createRecallSchema>
): Promise<ApiResult<{ recallId: string }>> {
  const parsed = createRecallSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const recall = await createRecallRecord(parsed.data);

  revalidatePath(`/patients/${recall.patientId}`);
  return { ok: true, data: { recallId: recall.id } };
}

// ---------------------------------------------------------------------------
// Update appointment status
// ---------------------------------------------------------------------------

const updateAppointmentStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

/**
 * Cancelling and no-showing are transitions with their own rules and their own
 * audit action, so they route to the dedicated service calls rather than
 * writing the status field directly.
 */
export async function updateAppointmentStatus(
  input: z.input<typeof updateAppointmentStatusSchema>
): Promise<ApiResult<{ appointmentId: string }>> {
  const parsed = updateAppointmentStatusSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const { id, status } = parsed.data;

  if (status === "NO_SHOW") {
    const result = await markNoShow(id);
    if (!result) return invalid("Not found");
  } else if (status === "CANCELLED") {
    const result = await cancelAppointment(id);
    if (!result.ok) {
      return invalid(
        result.reason === "notFound"
          ? "Not found"
          : "Only scheduled or confirmed appointments can be cancelled"
      );
    }
  } else {
    const result = await updateAppointment(id, { status });
    if (!result.ok) return invalid("Not found");
  }

  revalidatePath("/front-desk");
  revalidatePath("/dashboard");
  return { ok: true, data: { appointmentId: id } };
}

// ---------------------------------------------------------------------------

/** Notes hang off an encounter, so the page to refresh is the patient's. */
async function revalidatePatientOfEncounter(encounterId: string) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { patientId: true },
  });
  if (encounter) revalidatePath(`/patients/${encounter.patientId}`);
}
