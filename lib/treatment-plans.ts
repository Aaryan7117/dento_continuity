import { prisma } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { getDentistActor } from "@/lib/actors";
import { toRecall, toTreatmentPlan } from "@/lib/serializers";
import type {
  CreateTreatmentPlanRequest,
  ListTreatmentPlansResponse,
  TreatmentPlan,
  TreatmentPlanDetail,
  TreatmentPlanStatus,
  UpdateTreatmentPlanRequest,
} from "@/lib/contract";
import type { z } from "zod/v4";
import type { listTreatmentPlansQuerySchema } from "@/lib/validation";

type ListArgs = z.output<typeof listTreatmentPlansQuerySchema>;

/**
 * The clinical state machine from CLAUDE.md. Terminal states have no successor,
 * and there is no path backwards — a completed plan stays completed.
 */
const NEXT_STATUS: Record<TreatmentPlanStatus, TreatmentPlanStatus[]> = {
  PROPOSED: ["ACCEPTED"],
  ACCEPTED: ["COMPLETED"],
  COMPLETED: [],
};

export type TransitionFailure =
  | { reason: "notFound" }
  | { reason: "illegalTransition"; from: TreatmentPlanStatus; allowed: TreatmentPlanStatus[] };

export async function listTreatmentPlans({
  page,
  pageSize,
  patientId,
  status,
  billingStatus,
}: ListArgs): Promise<ListTreatmentPlansResponse> {
  const where = {
    ...(patientId ? { patientId } : {}),
    ...(status ? { status } : {}),
    ...(billingStatus ? { billingStatus } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.treatmentPlan.findMany({
      where,
      orderBy: { proposedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.treatmentPlan.count({ where }),
  ]);

  return { items: rows.map(toTreatmentPlan), total, page, pageSize };
}

export async function getTreatmentPlan(
  id: string
): Promise<TreatmentPlanDetail | null> {
  const row = await prisma.treatmentPlan.findUnique({
    where: { id },
    include: {
      patient: true,
      dentist: true,
      recalls: { orderBy: { dueAt: "asc" } },
    },
  });
  if (!row) return null;

  return {
    ...toTreatmentPlan(row),
    patient: {
      id: row.patient.id,
      firstName: row.patient.firstName,
      lastName: row.patient.lastName,
      phone: row.patient.phone,
      dateOfBirth: row.patient.dateOfBirth.toISOString().slice(0, 10),
    },
    dentist: row.dentist
      ? { id: row.dentist.id, name: row.dentist.name, role: row.dentist.role }
      : null,
    recalls: row.recalls.map(toRecall),
  };
}

export async function createTreatmentPlan(
  input: CreateTreatmentPlanRequest
): Promise<TreatmentPlan> {
  const actor = await getDentistActor();

  const row = await prisma.treatmentPlan.create({
    data: {
      clinicId: await currentClinicId(),
      patientId: input.patientId,
      dentistId: input.dentistId ?? actor.id,
      title: input.title,
      description: input.description ?? null,
      estimatedCost: input.estimatedCost ?? null,
      status: "PROPOSED",
      billingStatus: "PENDING",
      proposedAt: new Date(),
    },
  });

  await recordAudit({
    actor,
    action: "treatment_plan.created",
    entityType: "TreatmentPlan",
    entityId: row.id,
    metadata: { patientId: row.patientId, title: row.title },
  });

  return toTreatmentPlan(row);
}

/**
 * Field edits and billing state only. Billing moves freely because a demo needs
 * to correct a mistaken "paid" without a reversal workflow, whereas the clinical
 * status is a one-way machine and lives in `transitionTreatmentPlan`.
 */
export async function updateTreatmentPlan(
  id: string,
  input: UpdateTreatmentPlanRequest
): Promise<TreatmentPlan | null> {
  const existing = await prisma.treatmentPlan.findUnique({ where: { id } });
  if (!existing) return null;

  const actor = await getDentistActor();

  const row = await prisma.treatmentPlan.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      estimatedCost: input.estimatedCost,
      billingStatus: input.billingStatus,
    },
  });

  const billingChanged =
    input.billingStatus !== undefined &&
    input.billingStatus !== existing.billingStatus;

  await recordAudit({
    actor,
    action: billingChanged ? "treatment_plan.billing_updated" : "treatment_plan.updated",
    entityType: "TreatmentPlan",
    entityId: id,
    metadata: billingChanged
      ? { from: existing.billingStatus, to: row.billingStatus }
      : { fields: Object.keys(input) },
  });

  return toTreatmentPlan(row);
}

export async function transitionTreatmentPlan(
  id: string,
  status: TreatmentPlanStatus
): Promise<
  { ok: true; plan: TreatmentPlan } | ({ ok: false } & TransitionFailure)
> {
  const existing = await prisma.treatmentPlan.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };

  const allowed = NEXT_STATUS[existing.status];
  if (!allowed.includes(status)) {
    return { ok: false, reason: "illegalTransition", from: existing.status, allowed };
  }

  const now = new Date();
  const row = await prisma.treatmentPlan.update({
    where: { id },
    data: {
      status,
      acceptedAt: status === "ACCEPTED" ? now : existing.acceptedAt,
      completedAt: status === "COMPLETED" ? now : existing.completedAt,
    },
  });

  await recordAudit({
    actor: await getDentistActor(),
    action: status === "ACCEPTED" ? "treatment_plan.accepted" : "treatment_plan.completed",
    entityType: "TreatmentPlan",
    entityId: id,
    metadata: { from: existing.status, to: status },
  });

  return { ok: true, plan: toTreatmentPlan(row) };
}
