/**
 * Zod schemas for every request shape in contract.ts.
 *
 * Query schemas parse from strings because they arrive as URL search params;
 * body schemas parse from JSON and stay strict about types.
 */

import { z } from "zod/v4";
import {
  AppointmentStatus,
  BillingStatus,
  FindingType,
  ImageKind,
  MessageChannel,
  RecommendationStatus,
  ToothSurface,
  TreatmentPlanStatus,
} from "@/app/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const uuid = z.uuid();
const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime();

const pageParam = z.coerce.number().int().min(1).default(1);
const pageSizeParam = z.coerce.number().int().min(1).max(100).default(20);
const booleanParam = z.enum(["true", "false"]).transform((v) => v === "true");

export const listQuerySchema = z.object({
  page: pageParam,
  pageSize: pageSizeParam,
  search: z.string().trim().min(1).optional(),
});

/**
 * FDI notation is positional: the first digit is the quadrant and the second is
 * the tooth within it, so the valid set is sparse rather than a contiguous range.
 */
const toothCode = z.number().int().refine((code) => {
  const quadrant = Math.floor(code / 10);
  const position = code % 10;
  if (quadrant >= 1 && quadrant <= 4) return position >= 1 && position <= 8;
  if (quadrant >= 5 && quadrant <= 8) return position >= 1 && position <= 5;
  return false;
}, "Must be a valid FDI tooth code (11-48 permanent, 51-85 primary)");

// ---------------------------------------------------------------------------
// Patient
// ---------------------------------------------------------------------------

export const listPatientsQuerySchema = listQuerySchema;

export const createPatientSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: isoDate,
  phone: z.string().trim().min(1).max(40),
  email: z.email().nullish(),
  address: z.string().trim().max(500).nullish(),
  consentGiven: z.boolean(),
});

export const updatePatientSchema = createPatientSchema.partial();

// ---------------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------------

export const listAppointmentsQuerySchema = listQuerySchema.extend({
  patientId: uuid.optional(),
  status: z.enum(AppointmentStatus).optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
});

const appointmentFields = z.object({
  patientId: uuid,
  providerId: uuid.nullish(),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  reason: z.string().trim().max(500).nullish(),
  estimatedValue: z.number().nonnegative().nullish(),
  status: z.enum(AppointmentStatus).optional(),
  rebookedFromId: uuid.nullish(),
  chairId: uuid.nullish(),
  walkIn: z.boolean().optional(),
});

const endsAfterStart = (
  value: { startsAt?: string; endsAt?: string },
  ctx: z.RefinementCtx
) => {
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "endsAt must be after startsAt",
    });
  }
};

export const createAppointmentSchema =
  appointmentFields.superRefine(endsAfterStart);

export const updateAppointmentSchema = appointmentFields
  .partial()
  .superRefine(endsAfterStart);

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Encounter
// ---------------------------------------------------------------------------

export const listEncountersQuerySchema = listQuerySchema.extend({
  patientId: uuid.optional(),
});

export const createEncounterSchema = z.object({
  patientId: uuid,
  appointmentId: uuid.nullish(),
  providerId: uuid.nullish(),
  occurredAt: isoDateTime,
  summary: z.string().trim().max(5000).nullish(),
});

export const updateEncounterSchema = createEncounterSchema
  .omit({ patientId: true })
  .partial();

// ---------------------------------------------------------------------------
// Note
// ---------------------------------------------------------------------------

export const listNotesQuerySchema = listQuerySchema.extend({
  encounterId: uuid.optional(),
});

export const createNoteSchema = z.object({
  encounterId: uuid,
  body: z.string().trim().min(1).max(10000),
});

export const updateNoteSchema = z.object({
  body: z.string().trim().min(1).max(10000).optional(),
});

// ---------------------------------------------------------------------------
// ToothFinding
// ---------------------------------------------------------------------------

export const listToothFindingsQuerySchema = listQuerySchema.extend({
  patientId: uuid.optional(),
  toothCode: z.coerce.number().pipe(toothCode).optional(),
  includeResolved: booleanParam.optional(),
});

export const odontogramQuerySchema = z.object({
  includeResolved: booleanParam.optional(),
});

export const createToothFindingSchema = z.object({
  patientId: uuid,
  encounterId: uuid.nullish(),
  toothCode,
  finding: z.enum(FindingType),
  surfaces: z.array(z.enum(ToothSurface)).optional(),
  note: z.string().trim().max(1000).nullish(),
});

export const updateToothFindingSchema = z.object({
  finding: z.enum(FindingType).optional(),
  surfaces: z.array(z.enum(ToothSurface)).optional(),
  note: z.string().trim().max(1000).nullish(),
  resolvedAt: isoDateTime.nullish(),
});

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

export const listImagesQuerySchema = listQuerySchema.extend({
  patientId: uuid.optional(),
  encounterId: uuid.optional(),
  kind: z.enum(ImageKind).optional(),
});

/** Parsed from multipart fields, so every value arrives as a string. */
export const createImageSchema = z.object({
  patientId: uuid,
  encounterId: uuid.optional(),
  kind: z.enum(ImageKind).default(ImageKind.OTHER),
  caption: z.string().trim().max(500).optional(),
  capturedAt: isoDateTime.optional(),
});

export const updateImageSchema = z.object({
  kind: z.enum(ImageKind).optional(),
  caption: z.string().trim().max(500).nullish(),
  capturedAt: isoDateTime.nullish(),
});

// ---------------------------------------------------------------------------
// TreatmentPlan
// ---------------------------------------------------------------------------

export const listTreatmentPlansQuerySchema = listQuerySchema.extend({
  patientId: uuid.optional(),
  status: z.enum(TreatmentPlanStatus).optional(),
  billingStatus: z.enum(BillingStatus).optional(),
});

export const createTreatmentPlanSchema = z.object({
  patientId: uuid,
  dentistId: uuid.nullish(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullish(),
  estimatedCost: z.number().nonnegative().nullish(),
});

/** Clinical status is absent by design — it moves through /transition instead. */
export const updateTreatmentPlanSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullish(),
  estimatedCost: z.number().nonnegative().nullish(),
  billingStatus: z.enum(BillingStatus).optional(),
});

export const transitionTreatmentPlanSchema = z.object({
  status: z.enum(TreatmentPlanStatus),
});

// ---------------------------------------------------------------------------
// Recall
// ---------------------------------------------------------------------------

export const listRecallsQuerySchema = listQuerySchema.extend({
  patientId: uuid.optional(),
  dueBefore: isoDateTime.optional(),
  includeCompleted: booleanParam.optional(),
});

export const createRecallSchema = z.object({
  patientId: uuid,
  treatmentPlanId: uuid.nullish(),
  dueAt: isoDateTime,
  reason: z.string().trim().max(500).nullish(),
});

export const updateRecallSchema = z.object({
  dueAt: isoDateTime.optional(),
  reason: z.string().trim().max(500).nullish(),
  completedAt: isoDateTime.nullish(),
});

// ---------------------------------------------------------------------------
// Recommendation (Retention Agent)
// ---------------------------------------------------------------------------

export const listRecommendationsQuerySchema = listQuerySchema.extend({
  patientId: uuid.optional(),
  status: z.enum(RecommendationStatus).optional(),
});

/** The id travels in the path, so only the approver's edits are in the body. */
export const approveRecommendationSchema = z.object({
  editedMessage: z.string().trim().min(1).max(1000).optional(),
  channel: z.enum(MessageChannel).optional(),
});

export const dismissRecommendationSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// ---------------------------------------------------------------------------
// AuditEvent (read-only — the log is append-only)
// ---------------------------------------------------------------------------

export const listAuditEventsQuerySchema = listQuerySchema.extend({
  entityType: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional(),
  actorId: uuid.optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
});
