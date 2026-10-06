/**
 * Server-side data fetching functions.
 * Called directly from Server Components — NOT "use server" (those are for mutations only).
 */

import { prisma, prismaUnscoped } from "@/lib/db";
import { runAsClinic } from "@/lib/tenant";
import { listPendingRecommendations } from "@/lib/recommendations";
import { getRecoveryStats } from "@/lib/recovery";
import { toAppointment, toAppointmentWithPatient } from "@/lib/serializers";
import type {
  AppointmentWithPatient,
  DashboardSummary,
  EncounterDetail,
  PatientDetail,
  PatientPortalResponse,
  RecommendationWithContext,
  User,
} from "@/lib/contract";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return rows.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Today's schedule
// ---------------------------------------------------------------------------

export async function getTodaySchedule(): Promise<AppointmentWithPatient[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const rows = await prisma.appointment.findMany({
    where: { startsAt: { gte: today, lt: tomorrow } },
    include: {
      patient: true,
      provider: true,
      chair: true,
      recommendations: { where: { status: "PENDING" }, select: { id: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return rows.map(toAppointmentWithPatient);
}

// ---------------------------------------------------------------------------
// Pending recommendations
// ---------------------------------------------------------------------------

/** The approval queue, shared with `GET /api/recommendations/pending`. */
export function getPendingRecommendations(): Promise<
  RecommendationWithContext[]
> {
  return listPendingRecommendations();
}

// ---------------------------------------------------------------------------
// Patient detail (chart view)
// ---------------------------------------------------------------------------

export async function getPatientDetail(
  id: string
): Promise<PatientDetail | null> {
  const p = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        include: { provider: true, rebookedTo: { select: { id: true } } },
        orderBy: { startsAt: "desc" },
      },
      treatmentPlans: { orderBy: { proposedAt: "desc" } },
      toothFindings: { orderBy: { chartedAt: "desc" } },
      images: { orderBy: { createdAt: "desc" } },
      recalls: { orderBy: { dueAt: "asc" } },
      messages: { orderBy: { sentAt: "desc" }, take: 20 },
    },
  });
  if (!p) return null;

  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10),
    phone: p.phone,
    email: p.email,
    address: p.address,
    consentGiven: p.consentGiven,
    consentAt: p.consentAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    appointments: p.appointments.map(toAppointment),
    treatmentPlans: p.treatmentPlans.map((tp) => ({
      id: tp.id,
      patientId: tp.patientId,
      dentistId: tp.dentistId,
      title: tp.title,
      description: tp.description,
      status: tp.status,
      billingStatus: tp.billingStatus,
      estimatedCost: tp.estimatedCost ? Number(tp.estimatedCost) : null,
      proposedAt: tp.proposedAt.toISOString(),
      acceptedAt: tp.acceptedAt?.toISOString() ?? null,
      completedAt: tp.completedAt?.toISOString() ?? null,
      createdAt: tp.createdAt.toISOString(),
      updatedAt: tp.updatedAt.toISOString(),
    })),
    toothFindings: p.toothFindings.map((tf) => ({
      id: tf.id,
      patientId: tf.patientId,
      encounterId: tf.encounterId,
      chartedById: tf.chartedById,
      toothCode: tf.toothCode,
      finding: tf.finding,
      surfaces: tf.surfaces,
      note: tf.note,
      chartedAt: tf.chartedAt.toISOString(),
      resolvedAt: tf.resolvedAt?.toISOString() ?? null,
      createdAt: tf.createdAt.toISOString(),
      updatedAt: tf.updatedAt.toISOString(),
    })),
    images: p.images.map((img) => ({
      id: img.id,
      patientId: img.patientId,
      encounterId: img.encounterId,
      uploadedById: img.uploadedById,
      kind: img.kind,
      storagePath: img.storagePath,
      mimeType: img.mimeType,
      sizeBytes: img.sizeBytes,
      caption: img.caption,
      capturedAt: img.capturedAt?.toISOString() ?? null,
      createdAt: img.createdAt.toISOString(),
      updatedAt: img.updatedAt.toISOString(),
    })),
    recalls: p.recalls.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      treatmentPlanId: r.treatmentPlanId,
      dueAt: r.dueAt.toISOString(),
      reason: r.reason,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    recentMessages: p.messages.map((m) => ({
      id: m.id,
      patientId: m.patientId,
      recommendationId: m.recommendationId,
      sentById: m.sentById,
      channel: m.channel,
      direction: m.direction,
      body: m.body,
      sentAt: m.sentAt.toISOString(),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Encounter detail
// ---------------------------------------------------------------------------

export async function getEncounterDetail(
  id: string
): Promise<EncounterDetail | null> {
  const e = await prisma.encounter.findUnique({
    where: { id },
    include: {
      provider: true,
      notes: { include: { author: true }, orderBy: { createdAt: "asc" } },
      toothFindings: { orderBy: { chartedAt: "desc" } },
      images: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!e) return null;

  return {
    id: e.id,
    patientId: e.patientId,
    appointmentId: e.appointmentId,
    providerId: e.providerId,
    occurredAt: e.occurredAt.toISOString(),
    summary: e.summary,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    provider: e.provider
      ? { id: e.provider.id, name: e.provider.name, role: e.provider.role }
      : null,
    notes: e.notes.map((n) => ({
      id: n.id,
      encounterId: n.encounterId,
      authorId: n.authorId,
      body: n.body,
      signed: n.signed,
      signedAt: n.signedAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
    toothFindings: e.toothFindings.map((tf) => ({
      id: tf.id,
      patientId: tf.patientId,
      encounterId: tf.encounterId,
      chartedById: tf.chartedById,
      toothCode: tf.toothCode,
      finding: tf.finding,
      surfaces: tf.surfaces,
      note: tf.note,
      chartedAt: tf.chartedAt.toISOString(),
      resolvedAt: tf.resolvedAt?.toISOString() ?? null,
      createdAt: tf.createdAt.toISOString(),
      updatedAt: tf.updatedAt.toISOString(),
    })),
    images: e.images.map((img) => ({
      id: img.id,
      patientId: img.patientId,
      encounterId: img.encounterId,
      uploadedById: img.uploadedById,
      kind: img.kind,
      storagePath: img.storagePath,
      mimeType: img.mimeType,
      sizeBytes: img.sizeBytes,
      caption: img.caption,
      capturedAt: img.capturedAt?.toISOString() ?? null,
      createdAt: img.createdAt.toISOString(),
      updatedAt: img.updatedAt.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Patient portal (read-only)
// ---------------------------------------------------------------------------

export async function getPatientPortal(
  patientId: string
): Promise<PatientPortalResponse | null> {
  // The portal is reached by a patient, not a signed-in staff member, so the
  // clinic comes from the patient record itself. Step 3 (self-action links)
  // replaces this with a signed, expiring link.
  const owner = await prismaUnscoped.patient.findUnique({
    where: { id: patientId },
    select: { clinicId: true },
  });
  if (!owner) return null;
  return runAsClinic(owner.clinicId, () => loadPatientPortal(patientId));
}

async function loadPatientPortal(
  patientId: string
): Promise<PatientPortalResponse | null> {
  const p = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      appointments: {
        include: { provider: true, rebookedTo: { select: { id: true } } },
        orderBy: { startsAt: "desc" },
      },
      treatmentPlans: { orderBy: { proposedAt: "desc" } },
      messages: { orderBy: { sentAt: "desc" } },
    },
  });
  if (!p) return null;

  return {
    patient: {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10),
    },
    appointments: p.appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      status: a.status,
      reason: a.reason,
      providerName: a.provider?.name ?? null,
      rebookedToId: a.rebookedTo?.id ?? null,
    })),
    treatmentPlans: p.treatmentPlans.map((tp) => ({
      id: tp.id,
      title: tp.title,
      status: tp.status,
      billingStatus: tp.billingStatus,
      estimatedCost: tp.estimatedCost ? Number(tp.estimatedCost) : null,
    })),
    messages: p.messages.map((m) => ({
      id: m.id,
      channel: m.channel,
      direction: m.direction,
      body: m.body,
      sentAt: m.sentAt.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Dashboard summary
// ---------------------------------------------------------------------------

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayAppointmentCount,
    todayNoShowCount,
    pendingRecommendationCount,
    recovery,
    recallsDueCount,
    outstandingBalanceCount,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { startsAt: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: today, lt: tomorrow },
        status: "NO_SHOW",
      },
    }),
    prisma.recommendation.count({ where: { status: "PENDING" } }),
    getRecoveryStats(),
    prisma.recall.count({
      where: { completedAt: null, dueAt: { lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.treatmentPlan.count({
      where: { billingStatus: { in: ["PENDING", "OVERDUE"] } },
    }),
  ]);

  return {
    todayAppointmentCount,
    todayNoShowCount,
    pendingRecommendationCount,
    recoveredAppointmentCount: recovery.recoveredAppointmentCount,
    revenueRecovered: recovery.revenueRecovered,
    recallsDueCount,
    outstandingBalanceCount,
  };
}

// ---------------------------------------------------------------------------
// All Patients (Directory)
// ---------------------------------------------------------------------------

export async function getPatients(): Promise<import("./contract").Patient[]> {
  const rows = await prisma.patient.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  
  return rows.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10),
    phone: p.phone,
    email: p.email,
    address: p.address,
    consentGiven: p.consentGiven,
    consentAt: p.consentAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Calendar Appointments
// ---------------------------------------------------------------------------

export async function getCalendarAppointments(from: Date, to: Date): Promise<import("./contract").AppointmentWithPatient[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: from, lt: to },
    },
    include: {
      patient: true,
      provider: true,
      chair: true,
      recommendations: { where: { status: "PENDING" }, select: { id: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return rows.map(toAppointmentWithPatient);
}

// ---------------------------------------------------------------------------
// Providers (for appointment booking)
// ---------------------------------------------------------------------------

export async function getProviders(): Promise<
  { id: string; name: string; role: string }[]
> {
  return prisma.user.findMany({
    where: { role: "DENTIST" },
    select: { id: true, name: true, role: true },
  });
}

// ---------------------------------------------------------------------------
// Recalls Due (for patient directory tab)
// ---------------------------------------------------------------------------

export type RecallWithPatient = {
  id: string;
  patientId: string;
  reason: string | null;
  dueAt: string;
  completedAt: string | null;
  patient: { id: string; firstName: string; lastName: string; phone: string };
};

export async function getRecallsDue(): Promise<RecallWithPatient[]> {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const rows = await prisma.recall.findMany({
    where: { completedAt: null, dueAt: { lte: thirtyDaysFromNow } },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
    orderBy: { dueAt: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    patientId: r.patientId,
    reason: r.reason,
    dueAt: r.dueAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    patient: r.patient,
  }));
}

// ---------------------------------------------------------------------------
// Outstanding Balances (for patient directory tab)
// ---------------------------------------------------------------------------

export type BalanceWithPatient = {
  id: string;
  patientId: string;
  title: string;
  billingStatus: string;
  estimatedCost: number | null;
  patient: { id: string; firstName: string; lastName: string; phone: string };
};

export async function getOutstandingBalances(): Promise<BalanceWithPatient[]> {
  const rows = await prisma.treatmentPlan.findMany({
    where: { billingStatus: { in: ["PENDING", "OVERDUE"] } },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
    orderBy: { proposedAt: "desc" },
  });

  return rows.map((tp) => ({
    id: tp.id,
    patientId: tp.patientId,
    title: tp.title,
    billingStatus: tp.billingStatus,
    estimatedCost: tp.estimatedCost ? Number(tp.estimatedCost) : null,
    patient: tp.patient,
  }));
}

// ---------------------------------------------------------------------------
// Chair Utilization (heatmap data)
// ---------------------------------------------------------------------------

export type ChairSlot = {
  dayOfWeek: number; // 0=Sun, 6=Sat
  hour: number;      // 8-17
  count: number;
};

export async function getChairUtilization(weekStart: Date): Promise<ChairSlot[]> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const appointments = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: weekStart, lt: weekEnd },
      status: { notIn: ["CANCELLED"] },
    },
    select: { startsAt: true },
  });

  // Build a map of day-of-week + hour → count
  const slotMap = new Map<string, number>();
  for (const apt of appointments) {
    const d = new Date(apt.startsAt);
    const key = `${d.getDay()}-${d.getHours()}`;
    slotMap.set(key, (slotMap.get(key) || 0) + 1);
  }

  const slots: ChairSlot[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 8; hour <= 17; hour++) {
      const key = `${day}-${hour}`;
      slots.push({ dayOfWeek: day, hour, count: slotMap.get(key) || 0 });
    }
  }

  return slots;
}

