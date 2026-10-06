/**
 * Prisma row -> wire contract mappers.
 *
 * The database speaks `Date` and `Decimal`; the contract speaks ISO strings and
 * numbers. Every crossing of that boundary goes through here.
 */

import type {
  AppointmentModel as AppointmentRow,
  EncounterModel as EncounterRow,
  ImageModel as ImageRow,
  MessageModel as MessageRow,
  NoteModel as NoteRow,
  PatientModel as PatientRow,
  RecallModel as RecallRow,
  RecommendationModel as RecommendationRow,
  ToothFindingModel as ToothFindingRow,
  TreatmentPlanModel as TreatmentPlanRow,
  UserModel as UserRow,
} from "@/app/generated/prisma/models";
import type {
  Appointment,
  AppointmentWithPatient,
  Encounter,
  Image,
  Message,
  Note,
  NoteWithAuthor,
  Patient,
  PatientSummary,
  Recall,
  RecallWithPatient,
  Recommendation,
  RecommendationWithContext,
  ToothFinding,
  TreatmentPlan,
  UserSummary,
} from "@/lib/contract";

type Decimalish = { toString(): string } | null;

const iso = (d: Date) => d.toISOString();
const isoOrNull = (d: Date | null) => d?.toISOString() ?? null;
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
const money = (d: Decimalish) => (d === null ? null : Number(d.toString()));

export function toUserSummary(u: UserRow): UserSummary {
  return { id: u.id, name: u.name, role: u.role };
}

export function toPatient(p: PatientRow): Patient {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: dateOnly(p.dateOfBirth),
    phone: p.phone,
    email: p.email,
    address: p.address,
    consentGiven: p.consentGiven,
    consentAt: isoOrNull(p.consentAt),
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  };
}

export function toPatientSummary(p: PatientRow): PatientSummary {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone,
    dateOfBirth: dateOnly(p.dateOfBirth),
  };
}

export function toAppointment(a: AppointmentRow): Appointment {
  return {
    id: a.id,
    patientId: a.patientId,
    providerId: a.providerId,
    startsAt: iso(a.startsAt),
    endsAt: iso(a.endsAt),
    status: a.status,
    reason: a.reason,
    estimatedValue: money(a.estimatedValue),
    rebookedFromId: a.rebookedFromId,
    chairId: a.chairId,
    checkedInAt: a.checkedInAt ? iso(a.checkedInAt) : null,
    inChairAt: a.inChairAt ? iso(a.inChairAt) : null,
    completedAt: a.completedAt ? iso(a.completedAt) : null,
    cancellationReason: a.cancellationReason,
    noShowReason: a.noShowReason,
    walkIn: a.walkIn,
    createdAt: iso(a.createdAt),
    updatedAt: iso(a.updatedAt),
  };
}

export function toAppointmentWithPatient(
  a: AppointmentRow & {
    patient: PatientRow;
    provider: UserRow | null;
    chair?: { id: string; name: string } | null;
    recommendations: { id: string }[];
  }
): AppointmentWithPatient {
  return {
    ...toAppointment(a),
    patient: toPatientSummary(a.patient),
    provider: a.provider ? toUserSummary(a.provider) : null,
    chair: a.chair ? { id: a.chair.id, name: a.chair.name } : null,
    pendingRecommendationId: a.recommendations[0]?.id ?? null,
  };
}

export function toEncounter(e: EncounterRow): Encounter {
  return {
    id: e.id,
    patientId: e.patientId,
    appointmentId: e.appointmentId,
    providerId: e.providerId,
    occurredAt: iso(e.occurredAt),
    summary: e.summary,
    createdAt: iso(e.createdAt),
    updatedAt: iso(e.updatedAt),
  };
}

export function toNote(n: NoteRow): Note {
  return {
    id: n.id,
    encounterId: n.encounterId,
    authorId: n.authorId,
    body: n.body,
    signed: n.signed,
    signedAt: isoOrNull(n.signedAt),
    createdAt: iso(n.createdAt),
    updatedAt: iso(n.updatedAt),
  };
}

export function toNoteWithAuthor(
  n: NoteRow & { author: UserRow | null }
): NoteWithAuthor {
  return {
    ...toNote(n),
    author: n.author ? toUserSummary(n.author) : null,
  };
}

export function toToothFinding(t: ToothFindingRow): ToothFinding {
  return {
    id: t.id,
    patientId: t.patientId,
    encounterId: t.encounterId,
    chartedById: t.chartedById,
    toothCode: t.toothCode,
    finding: t.finding,
    surfaces: t.surfaces,
    note: t.note,
    chartedAt: iso(t.chartedAt),
    resolvedAt: isoOrNull(t.resolvedAt),
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
  };
}

export function toImage(i: ImageRow): Image {
  return {
    id: i.id,
    patientId: i.patientId,
    encounterId: i.encounterId,
    uploadedById: i.uploadedById,
    kind: i.kind,
    storagePath: i.storagePath,
    mimeType: i.mimeType,
    sizeBytes: i.sizeBytes,
    caption: i.caption,
    capturedAt: isoOrNull(i.capturedAt),
    createdAt: iso(i.createdAt),
    updatedAt: iso(i.updatedAt),
  };
}

export function toTreatmentPlan(tp: TreatmentPlanRow): TreatmentPlan {
  return {
    id: tp.id,
    patientId: tp.patientId,
    dentistId: tp.dentistId,
    title: tp.title,
    description: tp.description,
    status: tp.status,
    billingStatus: tp.billingStatus,
    estimatedCost: money(tp.estimatedCost),
    proposedAt: iso(tp.proposedAt),
    acceptedAt: isoOrNull(tp.acceptedAt),
    completedAt: isoOrNull(tp.completedAt),
    createdAt: iso(tp.createdAt),
    updatedAt: iso(tp.updatedAt),
  };
}

export function toRecall(r: RecallRow): Recall {
  return {
    id: r.id,
    patientId: r.patientId,
    treatmentPlanId: r.treatmentPlanId,
    dueAt: iso(r.dueAt),
    reason: r.reason,
    completedAt: isoOrNull(r.completedAt),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

export function toRecallWithPatient(
  r: RecallRow & { patient: PatientRow }
): RecallWithPatient {
  return { ...toRecall(r), patient: toPatientSummary(r.patient) };
}

export function toRecommendation(r: RecommendationRow): Recommendation {
  return {
    id: r.id,
    patientId: r.patientId,
    appointmentId: r.appointmentId,
    approvedById: r.approvedById,
    status: r.status,
    reason: r.reason,
    draftMessage: r.draftMessage,
    channel: r.channel,
    approvedAt: isoOrNull(r.approvedAt),
    sentAt: isoOrNull(r.sentAt),
    dismissedAt: isoOrNull(r.dismissedAt),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

export function toRecommendationWithContext(
  r: RecommendationRow & {
    patient: PatientRow;
    appointment: AppointmentRow | null;
    approvedBy: UserRow | null;
  }
): RecommendationWithContext {
  return {
    ...toRecommendation(r),
    patient: toPatientSummary(r.patient),
    missedAppointment: r.appointment ? toAppointment(r.appointment) : null,
    approvedBy: r.approvedBy ? toUserSummary(r.approvedBy) : null,
    estimatedValue: money(r.appointment?.estimatedValue ?? null),
  };
}

export function toMessage(m: MessageRow): Message {
  return {
    id: m.id,
    patientId: m.patientId,
    recommendationId: m.recommendationId,
    sentById: m.sentById,
    channel: m.channel,
    direction: m.direction,
    body: m.body,
    sentAt: iso(m.sentAt),
    createdAt: iso(m.createdAt),
    updatedAt: iso(m.updatedAt),
  };
}
