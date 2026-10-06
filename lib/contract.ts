/**
 * Wire contract between the Next.js frontend and the server layer.
 *
 * These are transport shapes, not database rows: dates are ISO strings and
 * money is a number, because `Date` and `Prisma.Decimal` do not survive
 * serialization across a server/client boundary. Enums are re-exported from the
 * generated Prisma client so they cannot drift from the schema.
 */

import type {
  Role,
  AppointmentStatus,
  FindingType,
  ToothSurface,
  ImageKind,
  TreatmentPlanStatus,
  BillingStatus,
  RecommendationStatus,
  MessageChannel,
  MessageDirection,
} from "@/app/generated/prisma/enums";

export type {
  Role,
  AppointmentStatus,
  FindingType,
  ToothSurface,
  ImageKind,
  TreatmentPlanStatus,
  BillingStatus,
  RecommendationStatus,
  MessageChannel,
  MessageDirection,
};

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type UUID = string;
/** ISO-8601 timestamp, e.g. "2026-08-08T09:30:00.000Z". */
export type ISODateTime = string;
/** Calendar date with no time component, e.g. "1981-05-12". */
export type ISODate = string;

export interface Timestamps {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ListQuery {
  /** 1-based. */
  page?: number;
  pageSize?: number;
  /** Free-text search; per-entity fields are documented on each list request. */
  search?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Uniform failure shape for every endpoint below. */
export interface ApiError {
  message: string;
  /** Field-level messages keyed by path, populated from Zod validation. */
  fieldErrors?: Record<string, string[]>;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface User extends Timestamps {
  id: UUID;
  name: string;
  email: string;
  role: Role;
}

/** Minimal actor shape embedded in other payloads. */
export interface UserSummary {
  id: UUID;
  name: string;
  role: Role;
}

export type ListUsersResponse = User[];
export type GetUserResponse = User;

// ---------------------------------------------------------------------------
// Patient
// ---------------------------------------------------------------------------

export interface Patient extends Timestamps {
  id: UUID;
  firstName: string;
  lastName: string;
  dateOfBirth: ISODate;
  phone: string;
  email: string | null;
  address: string | null;
  consentGiven: boolean;
  consentAt: ISODateTime | null;
}

export interface PatientSummary {
  id: UUID;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: ISODate;
}

/** Patient plus the related records the chart view needs in one round trip. */
export interface PatientDetail extends Patient {
  appointments: Appointment[];
  treatmentPlans: TreatmentPlan[];
  toothFindings: ToothFinding[];
  images: Image[];
  recalls: Recall[];
  recentMessages: Message[];
}

/** `search` matches first name, last name, or phone. */
export type ListPatientsQuery = ListQuery;
export type ListPatientsResponse = Paginated<Patient>;
export type GetPatientResponse = PatientDetail;

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: ISODate;
  phone: string;
  email?: string | null;
  address?: string | null;
  consentGiven: boolean;
}

export type UpdatePatientRequest = Partial<CreatePatientRequest>;
export type CreatePatientResponse = Patient;
export type UpdatePatientResponse = Patient;

// ---------------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------------

export interface Appointment extends Timestamps {
  id: UUID;
  patientId: UUID;
  providerId: UUID | null;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  status: AppointmentStatus;
  reason: string | null;
  estimatedValue: number | null;
  /** Set when this booking replaces an earlier missed appointment. */
  rebookedFromId: UUID | null;
  chairId: UUID | null;
  checkedInAt: ISODateTime | null;
  inChairAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  cancellationReason: string | null;
  noShowReason: string | null;
  walkIn: boolean;
}

/** Row shape for the front-desk schedule. */
export interface AppointmentWithPatient extends Appointment {
  patient: PatientSummary;
  provider: UserSummary | null;
  chair: { id: UUID; name: string } | null;
  /** Present when the Retention Agent has drafted something for this no-show. */
  pendingRecommendationId: UUID | null;
}

export interface ListAppointmentsQuery extends ListQuery {
  patientId?: UUID;
  status?: AppointmentStatus;
  /** Inclusive date-range filter on `startsAt`. */
  from?: ISODateTime;
  to?: ISODateTime;
}

export type ListAppointmentsResponse = Paginated<AppointmentWithPatient>;
export type GetAppointmentResponse = AppointmentWithPatient;

export interface CreateAppointmentRequest {
  patientId: UUID;
  providerId?: UUID | null;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  reason?: string | null;
  estimatedValue?: number | null;
  status?: AppointmentStatus;
  rebookedFromId?: UUID | null;
  chairId?: UUID | null;
  walkIn?: boolean;
}

export type UpdateAppointmentRequest = Partial<CreateAppointmentRequest>;
export type CreateAppointmentResponse = Appointment;
export type UpdateAppointmentResponse = Appointment;

/** Cancelling is a status transition, not a delete — history is preserved. */
export interface CancelAppointmentRequest {
  id: UUID;
  reason?: string;
}
export type CancelAppointmentResponse = Appointment;

/**
 * Flipping an appointment to NO_SHOW is what triggers the Retention Agent, so
 * the response carries the recommendation it generated.
 */
export interface MarkNoShowRequest {
  id: UUID;
}
export interface MarkNoShowResponse {
  appointment: Appointment;
  recommendation: Recommendation | null;
}

// ---------------------------------------------------------------------------
// Encounter and Note
// ---------------------------------------------------------------------------

export interface Encounter extends Timestamps {
  id: UUID;
  patientId: UUID;
  appointmentId: UUID | null;
  providerId: UUID | null;
  occurredAt: ISODateTime;
  summary: string | null;
}

export interface EncounterDetail extends Encounter {
  provider: UserSummary | null;
  notes: Note[];
  toothFindings: ToothFinding[];
  images: Image[];
}

export interface ListEncountersQuery extends ListQuery {
  patientId?: UUID;
}

export type ListEncountersResponse = Paginated<Encounter>;
export type GetEncounterResponse = EncounterDetail;

export interface CreateEncounterRequest {
  patientId: UUID;
  appointmentId?: UUID | null;
  providerId?: UUID | null;
  occurredAt: ISODateTime;
  summary?: string | null;
}

export type UpdateEncounterRequest = Partial<Omit<CreateEncounterRequest, "patientId">>;
export type CreateEncounterResponse = Encounter;
export type UpdateEncounterResponse = Encounter;

export interface Note extends Timestamps {
  id: UUID;
  encounterId: UUID;
  authorId: UUID | null;
  body: string;
  signed: boolean;
  signedAt: ISODateTime | null;
}

export interface NoteWithAuthor extends Note {
  author: UserSummary | null;
}

export interface ListNotesQuery extends ListQuery {
  encounterId?: UUID;
}

export type ListNotesResponse = Paginated<NoteWithAuthor>;
export type GetNoteResponse = NoteWithAuthor;

export interface CreateNoteRequest {
  encounterId: UUID;
  body: string;
}

/** A signed note's body is immutable; only unsigned notes accept a new body. */
export interface UpdateNoteRequest {
  body?: string;
}

export interface SignNoteRequest {
  id: UUID;
}

export type CreateNoteResponse = Note;
export type UpdateNoteResponse = Note;
export type SignNoteResponse = Note;

// ---------------------------------------------------------------------------
// ToothFinding (odontogram)
// ---------------------------------------------------------------------------

export interface ToothFinding extends Timestamps {
  id: UUID;
  patientId: UUID;
  encounterId: UUID | null;
  chartedById: UUID | null;
  /** FDI notation: 11-48 permanent, 51-85 primary. */
  toothCode: number;
  finding: FindingType;
  /** Empty for whole-tooth findings such as MISSING or CROWN. */
  surfaces: ToothSurface[];
  note: string | null;
  chartedAt: ISODateTime;
  resolvedAt: ISODateTime | null;
}

/**
 * Full chart payload. Findings are sparse — a tooth with no entry is healthy,
 * so the frontend renders from absence rather than from a per-tooth row.
 */
export interface OdontogramResponse {
  patientId: UUID;
  findings: ToothFinding[];
}

export interface ListToothFindingsQuery extends ListQuery {
  patientId?: UUID;
  toothCode?: number;
  /** Omit for all; false returns only currently-active findings. */
  includeResolved?: boolean;
}

export type ListToothFindingsResponse = Paginated<ToothFinding>;
export type GetToothFindingResponse = ToothFinding;

export interface CreateToothFindingRequest {
  patientId: UUID;
  encounterId?: UUID | null;
  toothCode: number;
  finding: FindingType;
  surfaces?: ToothSurface[];
  note?: string | null;
}

export interface UpdateToothFindingRequest {
  finding?: FindingType;
  surfaces?: ToothSurface[];
  note?: string | null;
  /** Set to close out a finding without deleting the history. */
  resolvedAt?: ISODateTime | null;
}

export type CreateToothFindingResponse = ToothFinding;
export type UpdateToothFindingResponse = ToothFinding;

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

export interface Image extends Timestamps {
  id: UUID;
  patientId: UUID;
  encounterId: UUID | null;
  uploadedById: UUID | null;
  kind: ImageKind;
  storagePath: string;
  mimeType: string;
  sizeBytes: number | null;
  caption: string | null;
  capturedAt: ISODateTime | null;
}

export interface ListImagesQuery extends ListQuery {
  patientId?: UUID;
  encounterId?: UUID;
  kind?: ImageKind;
}

export type ListImagesResponse = Paginated<Image>;
export type GetImageResponse = Image;

/** Metadata half of an upload; the file itself rides as multipart form data. */
export interface CreateImageRequest {
  patientId: UUID;
  encounterId?: UUID | null;
  kind: ImageKind;
  caption?: string | null;
  capturedAt?: ISODateTime | null;
}

export interface UpdateImageRequest {
  kind?: ImageKind;
  caption?: string | null;
  capturedAt?: ISODateTime | null;
}

export type CreateImageResponse = Image;
export type UpdateImageResponse = Image;

// ---------------------------------------------------------------------------
// TreatmentPlan
// ---------------------------------------------------------------------------

export interface TreatmentPlan extends Timestamps {
  id: UUID;
  patientId: UUID;
  dentistId: UUID | null;
  title: string;
  description: string | null;
  status: TreatmentPlanStatus;
  billingStatus: BillingStatus;
  estimatedCost: number | null;
  proposedAt: ISODateTime;
  acceptedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
}

export interface TreatmentPlanDetail extends TreatmentPlan {
  patient: PatientSummary;
  dentist: UserSummary | null;
  recalls: Recall[];
}

export interface ListTreatmentPlansQuery extends ListQuery {
  patientId?: UUID;
  status?: TreatmentPlanStatus;
  billingStatus?: BillingStatus;
}

export type ListTreatmentPlansResponse = Paginated<TreatmentPlan>;
export type GetTreatmentPlanResponse = TreatmentPlanDetail;

export interface CreateTreatmentPlanRequest {
  patientId: UUID;
  dentistId?: UUID | null;
  title: string;
  description?: string | null;
  estimatedCost?: number | null;
}

export interface UpdateTreatmentPlanRequest {
  title?: string;
  description?: string | null;
  estimatedCost?: number | null;
  billingStatus?: BillingStatus;
}

/**
 * Status moves through the state machine rather than being set freely:
 * proposed -> accepted -> completed. The server rejects illegal jumps.
 */
export interface TransitionTreatmentPlanRequest {
  id: UUID;
  status: TreatmentPlanStatus;
}

export type CreateTreatmentPlanResponse = TreatmentPlan;
export type UpdateTreatmentPlanResponse = TreatmentPlan;
export type TransitionTreatmentPlanResponse = TreatmentPlan;

// ---------------------------------------------------------------------------
// Recall
// ---------------------------------------------------------------------------

export interface Recall extends Timestamps {
  id: UUID;
  patientId: UUID;
  treatmentPlanId: UUID | null;
  dueAt: ISODateTime;
  reason: string | null;
  completedAt: ISODateTime | null;
}

export interface RecallWithPatient extends Recall {
  patient: PatientSummary;
}

export interface ListRecallsQuery extends ListQuery {
  patientId?: UUID;
  /** Only recalls due on or before this date; used for the "due soon" list. */
  dueBefore?: ISODateTime;
  includeCompleted?: boolean;
}

export type ListRecallsResponse = Paginated<RecallWithPatient>;
export type GetRecallResponse = Recall;

export interface CreateRecallRequest {
  patientId: UUID;
  treatmentPlanId?: UUID | null;
  dueAt: ISODateTime;
  reason?: string | null;
}

export interface UpdateRecallRequest {
  dueAt?: ISODateTime;
  reason?: string | null;
  completedAt?: ISODateTime | null;
}

export type CreateRecallResponse = Recall;
export type UpdateRecallResponse = Recall;

// ---------------------------------------------------------------------------
// Recommendation (Retention Agent)
// ---------------------------------------------------------------------------

export interface Recommendation extends Timestamps {
  id: UUID;
  patientId: UUID;
  appointmentId: UUID | null;
  approvedById: UUID | null;
  status: RecommendationStatus;
  reason: string;
  draftMessage: string;
  channel: MessageChannel;
  approvedAt: ISODateTime | null;
  sentAt: ISODateTime | null;
  dismissedAt: ISODateTime | null;
}

/**
 * Everything the approval screen shows without a second fetch: who, what they
 * missed, and what it is worth if recovered.
 */
export interface RecommendationWithContext extends Recommendation {
  patient: PatientSummary;
  missedAppointment: Appointment | null;
  approvedBy: UserSummary | null;
  /** Mirrors the missed appointment's estimatedValue at read time. */
  estimatedValue: number | null;
}

export interface ListRecommendationsQuery extends ListQuery {
  patientId?: UUID;
  status?: RecommendationStatus;
}

export type ListRecommendationsResponse = Paginated<RecommendationWithContext>;
export type GetRecommendationResponse = RecommendationWithContext;

/** Approval queue — the front desk's landing view for the demo. */
export type GetPendingRecommendationsResponse = RecommendationWithContext[];

/**
 * Approve and log as sent. Requires a front_desk actor; the agent never sends
 * on its own. `editedMessage` lets the approver amend the draft before it goes,
 * which is the point of having a human in the loop.
 */
export interface ApproveRecommendationRequest {
  id: UUID;
  editedMessage?: string;
  channel?: MessageChannel;
}

export interface ApproveRecommendationResponse {
  recommendation: Recommendation;
  /** The mocked send, written to the communications log. */
  message: Message;
}

export interface DismissRecommendationRequest {
  id: UUID;
  reason?: string;
}
export type DismissRecommendationResponse = Recommendation;

/** Regenerating replaces the draft in place, leaving status PENDING. */
export interface RegenerateRecommendationRequest {
  id: UUID;
}
export type RegenerateRecommendationResponse = Recommendation;

/**
 * Result of sweeping for no-shows the agent has not drafted for yet. Normally a
 * no-op, because `markNoShow` drafts on the transition itself.
 */
export interface RunRetentionAgentResponse {
  generated: Recommendation[];
}

// ---------------------------------------------------------------------------
// Message (communications log)
// ---------------------------------------------------------------------------

export interface Message extends Timestamps {
  id: UUID;
  patientId: UUID;
  recommendationId: UUID | null;
  sentById: UUID | null;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string;
  sentAt: ISODateTime;
}

export interface ListMessagesQuery extends ListQuery {
  patientId?: UUID;
  channel?: MessageChannel;
}

export type ListMessagesResponse = Paginated<Message>;
export type GetMessageResponse = Message;

/** Sending is mocked — this writes a log row and contacts no provider. */
export interface CreateMessageRequest {
  patientId: UUID;
  recommendationId?: UUID | null;
  channel: MessageChannel;
  body: string;
}

export type CreateMessageResponse = Message;

// ---------------------------------------------------------------------------
// AuditEvent (append-only — no update or delete)
// ---------------------------------------------------------------------------

export interface AuditEvent {
  id: UUID;
  actorId: UUID | null;
  actorRole: Role | null;
  action: string;
  entityType: string;
  entityId: UUID | null;
  metadata: Record<string, unknown> | null;
  createdAt: ISODateTime;
}

export interface AuditEventWithActor extends AuditEvent {
  actor: UserSummary | null;
}

export interface ListAuditEventsQuery extends ListQuery {
  entityType?: string;
  entityId?: UUID;
  actorId?: UUID;
  from?: ISODateTime;
  to?: ISODateTime;
}

export type ListAuditEventsResponse = Paginated<AuditEventWithActor>;

// ---------------------------------------------------------------------------
// Dashboard and patient portal
// ---------------------------------------------------------------------------

/** Backs the closing screen of the demo. */
export interface DashboardSummary {
  todayAppointmentCount: number;
  todayNoShowCount: number;
  pendingRecommendationCount: number;
  /** Missed appointments rebooked after an approved recommendation went out. */
  recoveredAppointmentCount: number;
  /** Treatment value put back on track for those patients. */
  revenueRecovered: number;
  recallsDueCount: number;
  outstandingBalanceCount: number;
}

/**
 * One completed recovery chain: missed, followed up, rebooked. Attributed to
 * the agent only because an approved recommendation sits between the two
 * appointments.
 */
export interface RecoveredAppointment {
  recommendationId: UUID;
  patient: PatientSummary;
  missedAppointmentId: UUID;
  missedAt: ISODateTime;
  rebookedAppointmentId: UUID;
  rebookedFor: ISODateTime;
  approvedAt: ISODateTime;
  /** The rebooking's own value, falling back to the slot that was missed. */
  appointmentValue: number | null;
}

export interface RecoveredAppointmentsResponse {
  recoveredAppointmentCount: number;
  items: RecoveredAppointment[];
}

/** A plan counted towards recovered revenue, listed so the total is auditable. */
export interface RecoveredPlan {
  id: UUID;
  patientId: UUID;
  patientName: string;
  title: string;
  status: TreatmentPlanStatus;
  billingStatus: BillingStatus;
  estimatedCost: number | null;
}

export interface RevenueRecoveredResponse {
  /** Summed `estimatedCost` of `plans`, each counted once. */
  revenueRecovered: number;
  patientCount: number;
  plans: RecoveredPlan[];
}

export interface PortalAppointment {
  id: UUID;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  status: AppointmentStatus;
  reason: string | null;
  providerName: string | null;
  /** Set when a missed or cancelled visit already has a replacement booking. */
  rebookedToId: UUID | null;
}

export interface PortalTreatmentPlan {
  id: UUID;
  title: string;
  status: TreatmentPlanStatus;
  billingStatus: BillingStatus;
  estimatedCost: number | null;
}

export interface PortalMessage {
  id: UUID;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string;
  sentAt: ISODateTime;
}

/** Read-only by design; the portal exposes no mutations. */
export interface PatientPortalResponse {
  patient: PatientSummary;
  appointments: PortalAppointment[];
  treatmentPlans: PortalTreatmentPlan[];
  messages: PortalMessage[];
}
