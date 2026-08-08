/**
 * What the Retention Agent actually recovered.
 *
 * A recovery is a chain, not a flag: a no-show, an approved follow-up, and then
 * a replacement booking scheduled after that follow-up went out. Requiring the
 * whole chain is what keeps the dashboard figure honest — an appointment the
 * front desk rebooked on their own, with no approved recommendation behind it,
 * is not something the agent can claim.
 */

import { prisma } from "@/lib/db";
import { toPatientSummary } from "@/lib/serializers";
import type {
  RecoveredAppointment,
  RecoveredPlan,
  RevenueRecoveredResponse,
} from "@/lib/contract";

/**
 * Approved recommendations whose missed appointment now has a rebooking that
 * falls after the approval.
 *
 * Ordered by the missed date, newest first, so the demo's recovery lands at the
 * top of the list the moment it happens.
 */
export async function listRecoveredAppointments(): Promise<
  RecoveredAppointment[]
> {
  const rows = await prisma.recommendation.findMany({
    where: {
      status: "SENT",
      approvedAt: { not: null },
      appointment: { rebookedTo: { isNot: null } },
    },
    include: {
      patient: true,
      appointment: { include: { rebookedTo: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const recoveries: RecoveredAppointment[] = [];

  for (const r of rows) {
    const missed = r.appointment;
    const rebooked = missed?.rebookedTo;
    const approvedAt = r.approvedAt;
    if (!missed || !rebooked || !approvedAt) continue;

    // The rebooking has to be for a date after we reached out. A slot that was
    // already in the diary beforehand was not recovered by this message.
    if (rebooked.startsAt <= approvedAt) continue;

    recoveries.push({
      recommendationId: r.id,
      patient: toPatientSummary(r.patient),
      missedAppointmentId: missed.id,
      missedAt: missed.startsAt.toISOString(),
      rebookedAppointmentId: rebooked.id,
      rebookedFor: rebooked.startsAt.toISOString(),
      approvedAt: approvedAt.toISOString(),
      appointmentValue: rebooked.estimatedValue
        ? Number(rebooked.estimatedValue)
        : missed.estimatedValue
          ? Number(missed.estimatedValue)
          : null,
    });
  }

  return recoveries;
}

export async function countRecoveredAppointments(): Promise<number> {
  return (await listRecoveredAppointments()).length;
}

/**
 * Treatment value put back on track, summed per plan rather than per recovery.
 *
 * A plan counts once no matter how many times its patient was recovered, and
 * only if it was still outstanding when the follow-up went out: accepted and
 * unfinished, or finished afterwards because the patient came back. Anything
 * already completed beforehand was never at risk, and anything still merely
 * proposed was never committed to.
 */
export async function getRevenueRecovered(): Promise<RevenueRecoveredResponse> {
  const recoveries = await listRecoveredAppointments();
  if (recoveries.length === 0) {
    return { revenueRecovered: 0, patientCount: 0, plans: [] };
  }

  // Earliest approval per patient — the moment the agent first intervened.
  const firstApproval = new Map<string, Date>();
  for (const r of recoveries) {
    const at = new Date(r.approvedAt);
    const existing = firstApproval.get(r.patient.id);
    if (!existing || at < existing) firstApproval.set(r.patient.id, at);
  }

  const rows = await prisma.treatmentPlan.findMany({
    where: {
      patientId: { in: [...firstApproval.keys()] },
      status: { in: ["ACCEPTED", "COMPLETED"] },
    },
    include: { patient: true },
    orderBy: { proposedAt: "desc" },
  });

  const plans: RecoveredPlan[] = [];
  for (const plan of rows) {
    const approvedAt = firstApproval.get(plan.patientId);
    if (!approvedAt) continue;
    if (plan.completedAt && plan.completedAt <= approvedAt) continue;

    plans.push({
      id: plan.id,
      patientId: plan.patientId,
      patientName: `${plan.patient.firstName} ${plan.patient.lastName}`,
      title: plan.title,
      status: plan.status,
      billingStatus: plan.billingStatus,
      estimatedCost: plan.estimatedCost ? Number(plan.estimatedCost) : null,
    });
  }

  return {
    revenueRecovered: plans.reduce((sum, p) => sum + (p.estimatedCost ?? 0), 0),
    patientCount: firstApproval.size,
    plans,
  };
}

/** Both figures in one pass, for the dashboard summary. */
export async function getRecoveryStats(): Promise<{
  recoveredAppointmentCount: number;
  revenueRecovered: number;
}> {
  const [recoveries, revenue] = await Promise.all([
    listRecoveredAppointments(),
    getRevenueRecovered(),
  ]);

  return {
    recoveredAppointmentCount: recoveries.length,
    revenueRecovered: revenue.revenueRecovered,
  };
}
