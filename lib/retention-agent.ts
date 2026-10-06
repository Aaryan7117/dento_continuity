/**
 * The Retention Agent.
 *
 * A no-show is the trigger; the output is a Recommendation holding the reason it
 * fired and a follow-up message drafted for a human to approve. The agent never
 * sends anything — `lib/recommendations.ts` owns approval, and CLAUDE.md keeps
 * the send itself mocked.
 *
 * Generation is template-driven rather than an LLM call. The draft has to come
 * out identical on every run of a live demo, it must not depend on a network
 * round trip over conference wifi, and an LLM would be a dependency CLAUDE.md
 * says to ask about first. What makes the output convincing is the patient
 * history the templates are fed, so most of this file is signal gathering.
 */

import { prisma } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import { issuePatientLinkUrl } from "@/lib/patient-links";
import { recordAudit } from "@/lib/audit";
import { toRecommendation } from "@/lib/serializers";
import type { Actor } from "@/lib/actors";
import type { Recommendation } from "@/lib/contract";

/**
 * The agent acts on its own behalf, so there is no user to attribute a draft to.
 * A person's id enters the record at approval, which is the whole point.
 */
const AGENT: Actor = { id: null, role: null };

/** Everything the templates read, fetched in one pass per appointment. */
const historyInclude = {
  provider: true,
  patient: {
    include: {
      treatmentPlans: { orderBy: { proposedAt: "desc" } },
      recalls: { where: { completedAt: null }, orderBy: { dueAt: "asc" } },
      appointments: { orderBy: { startsAt: "desc" } },
      toothFindings: { where: { resolvedAt: null } },
    },
  },
} as const;

/**
 * No-shows the agent has not spoken for yet.
 *
 * "Needs one" means no recommendation of any status, not merely no pending one.
 * Scoping it to PENDING would redraft something the front desk had already
 * dismissed, which reads as the agent overruling the human.
 */
export function findNoShowsNeedingRecommendation() {
  return prisma.appointment.findMany({
    where: { status: "NO_SHOW", recommendations: { none: {} } },
    include: historyInclude,
    orderBy: { startsAt: "desc" },
  });
}

type NoShowWithHistory = Awaited<
  ReturnType<typeof findNoShowsNeedingRecommendation>
>[number];

/**
 * Sweeps every unhandled no-show, in the order they were missed. Written
 * sequentially so the audit log reads in the same order.
 */
export async function runRetentionAgent(): Promise<Recommendation[]> {
  const pending = await findNoShowsNeedingRecommendation();

  const created: Recommendation[] = [];
  for (const appointment of pending) {
    created.push(await writeRecommendation(appointment));
  }
  return created;
}

/**
 * Drafts for one appointment, and returns null if anything already spoke for it.
 * This runs on the NO_SHOW transition itself, so two quick clicks on the same
 * appointment must not produce two drafts.
 */
export async function generateForAppointment(
  appointmentId: string
): Promise<Recommendation | null> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      status: "NO_SHOW",
      recommendations: { none: {} },
    },
    include: historyInclude,
  });
  if (!appointment) return null;

  return writeRecommendation(appointment);
}

/** Redrafts a still-pending recommendation against current history. */
export async function regenerateRecommendation(
  id: string
): Promise<Recommendation | null> {
  const existing = await prisma.recommendation.findUnique({ where: { id } });
  if (!existing || existing.status !== "PENDING" || !existing.appointmentId) {
    return null;
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: existing.appointmentId },
    include: historyInclude,
  });
  if (!appointment) return null;

  const draft = buildDraft(appointment);
  const row = await prisma.recommendation.update({
    where: { id },
    data: { reason: draft.reason, draftMessage: draft.message },
  });

  await recordAudit({
    actor: AGENT,
    action: "recommendation.generated",
    entityType: "Recommendation",
    entityId: id,
    metadata: {
      source: "retention_agent",
      trigger: "regenerate",
      appointmentId: appointment.id,
      signals: draft.signals,
    },
  });

  return toRecommendation(row);
}

async function writeRecommendation(
  appointment: NoShowWithHistory
): Promise<Recommendation> {
  const draft = buildDraft(appointment);
  const clinicId = await currentClinicId();
  // The patient can rebook from the link without calling the clinic.
  const link = await issuePatientLinkUrl({
    patientId: appointment.patientId,
    clinicId,
    appointmentId: appointment.id,
  });

  const row = await prisma.recommendation.create({
    data: {
      clinicId,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      status: "PENDING",
      reason: draft.reason,
      draftMessage: `${draft.message} Pick a new time here: ${link}`,
      channel: "SMS",
    },
  });

  await recordAudit({
    actor: AGENT,
    action: "recommendation.generated",
    entityType: "Recommendation",
    entityId: row.id,
    metadata: {
      source: "retention_agent",
      trigger: "appointment.no_show",
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      signals: draft.signals,
    },
  });

  return toRecommendation(row);
}

// ---------------------------------------------------------------------------
// Signals — what the agent noticed, separated from how it words it
// ---------------------------------------------------------------------------

interface Signals {
  /** Accepted treatment the patient is partway through, richest plan first. */
  openPlan: { title: string; cost: number | null } | null;
  /** Accepted-but-unpaid value across all their plans. */
  unbilled: number;
  overdueBilling: boolean;
  /** Negative days means overdue. */
  recall: { reason: string | null; inDays: number } | null;
  attendance: { kept: number; missed: number };
  unresolvedFindings: number;
  missedValue: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function readSignals(appointment: NoShowWithHistory): Signals {
  const { patient } = appointment;
  const now = Date.now();

  const openPlans = patient.treatmentPlans
    .filter((p) => p.status === "ACCEPTED" && p.completedAt === null)
    .sort((a, b) => Number(b.estimatedCost ?? 0) - Number(a.estimatedCost ?? 0));

  const unbilled = patient.treatmentPlans
    .filter(
      (p) => p.status === "ACCEPTED" && p.billingStatus !== "PAID"
    )
    .reduce((sum, p) => sum + Number(p.estimatedCost ?? 0), 0);

  const nextRecall = patient.recalls[0] ?? null;

  // Only history strictly before the missed slot counts, so the no-show being
  // drafted for is never folded into the patient's own track record.
  const prior = patient.appointments.filter(
    (a) => a.startsAt < appointment.startsAt
  );

  return {
    openPlan: openPlans[0]
      ? {
          title: openPlans[0].title,
          cost: openPlans[0].estimatedCost
            ? Number(openPlans[0].estimatedCost)
            : null,
        }
      : null,
    unbilled,
    overdueBilling: patient.treatmentPlans.some(
      (p) => p.billingStatus === "OVERDUE"
    ),
    recall: nextRecall
      ? {
          reason: nextRecall.reason,
          inDays: Math.round((nextRecall.dueAt.getTime() - now) / DAY_MS),
        }
      : null,
    attendance: {
      kept: prior.filter((a) => a.status === "COMPLETED").length,
      missed: prior.filter((a) => a.status === "NO_SHOW").length,
    },
    unresolvedFindings: patient.toothFindings.length,
    missedValue: appointment.estimatedValue
      ? Number(appointment.estimatedValue)
      : null,
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

interface Draft {
  /** Staff-facing: why this patient is worth chasing. */
  reason: string;
  /** Patient-facing: what the front desk will actually send. */
  message: string;
  /** Which clauses fired, kept in the audit trail so a draft is explainable. */
  signals: string[];
}

function buildDraft(appointment: NoShowWithHistory): Draft {
  const s = readSignals(appointment);
  const first = appointment.patient.firstName;
  const fired: string[] = [];

  // -- Staff-facing reason ---------------------------------------------------
  const reason: string[] = [
    `${first} did not attend ${whenClinical(appointment.startsAt)}${
      appointment.reason ? ` — ${appointment.reason}` : ""
    }.`,
  ];

  if (s.openPlan) {
    fired.push("open_treatment_plan");
    reason.push(
      `It sits inside an accepted plan still in progress: "${s.openPlan.title}"${
        s.openPlan.cost ? ` (${rupees(s.openPlan.cost)})` : ""
      }.`
    );
  }

  if (s.unbilled > 0) {
    fired.push(s.overdueBilling ? "billing_overdue" : "billing_unbilled");
    reason.push(
      `${rupees(s.unbilled)} of accepted treatment is ${
        s.overdueBilling ? "overdue" : "still unbilled"
      }.`
    );
  }

  if (s.recall) {
    fired.push(s.recall.inDays < 0 ? "recall_overdue" : "recall_due");
    reason.push(
      s.recall.inDays < 0
        ? `A recall is ${plural(Math.abs(s.recall.inDays), "day")} overdue${detail(s.recall.reason)}.`
        : `A recall falls due in ${plural(s.recall.inDays, "day")}${detail(s.recall.reason)}.`
    );
  }

  const { kept, missed } = s.attendance;
  if (missed > 0) {
    fired.push("repeat_no_show");
    reason.push(
      `This is not a one-off — they have missed ${plural(missed + 1, "appointment")} in total, so a phone call may land better than a text.`
    );
  } else if (kept >= 3) {
    fired.push("reliable_attender");
    reason.push(
      `They have attended all ${plural(kept, "previous appointment")}, so this is out of character.`
    );
  }

  if (s.unresolvedFindings > 0) {
    fired.push("unresolved_findings");
    reason.push(
      `${plural(s.unresolvedFindings, "charted finding")} on their odontogram ${
        s.unresolvedFindings === 1 ? "is" : "are"
      } still unresolved.`
    );
  }

  // With no clinical hook to point at, the slot's own value is the argument.
  if (fired.length === 0 && s.missedValue) {
    fired.push("slot_value");
    reason.push(`The slot itself was worth ${rupees(s.missedValue)}.`);
  }

  // -- Patient-facing message ------------------------------------------------
  const message: string[] = [
    `Hi ${first}, we missed you ${whenFriendly(appointment.startsAt)} for your ${visitPhrase(appointment.reason)}${
      appointment.provider ? ` with ${appointment.provider.name}` : ""
    }.`,
  ];

  // One reason to come back, not three. Billing is deliberately absent — a
  // retention message that chases money reads as a debt collection text.
  if (s.openPlan) {
    message.push(
      `You're partway through your ${lowerFirst(shortTitle(s.openPlan.title))}, so we'd rather not leave it too long.`
    );
  } else if (s.recall && s.recall.inDays <= 14) {
    message.push(
      `Your ${lowerFirst(s.recall.reason ?? "next check-up")} is coming up too, so we can cover both in one visit.`
    );
  }

  message.push(
    `Can we find you another time? Reply with a day that suits you and we'll hold a slot.`
  );

  return {
    reason: reason.join(" "),
    message: message.join(" "),
    signals: fired,
  };
}

// ---------------------------------------------------------------------------
// Wording helpers
// ---------------------------------------------------------------------------

const rupees = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

const detail = (text: string | null) => (text ? `: ${text}` : "");

const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);

/** "Porcelain crown — upper left first molar" -> "Porcelain crown". */
const shortTitle = (title: string) => title.split(/\s+[—–-]\s+/)[0].trim();

const visitPhrase = (reason: string | null) =>
  reason ? lowerFirst(shortTitle(reason)) : "appointment";

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Precise, for the approver: "this morning's 09:30 appointment". */
function whenClinical(startsAt: Date): string {
  const time = startsAt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay(startsAt, new Date())) {
    return `${partOfDay(startsAt)}'s ${time} appointment`;
  }
  const date = startsAt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `their ${time} appointment on ${date}`;
}

/** Softer, for the patient: "this morning" or "on Tuesday". */
function whenFriendly(startsAt: Date): string {
  return sameDay(startsAt, new Date())
    ? partOfDay(startsAt)
    : `on ${startsAt.toLocaleDateString("en-GB", { weekday: "long" })}`;
}

function partOfDay(at: Date): string {
  const hour = at.getHours();
  if (hour < 12) return "this morning";
  if (hour < 17) return "this afternoon";
  return "this evening";
}
