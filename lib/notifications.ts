import { prisma } from "@/lib/db";

export type NotificationType = "NO_SHOW" | "RECOMMENDATION" | "RECALL" | "BILLING" | "PATIENT";

export interface NotificationItem {
  /** Stable across requests, so the browser can remember read and dismissed items. */
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  at: string;
  link: string;
}

const RECALL_WINDOW_DAYS = 30;
const MAX_PER_KIND = 5;

/**
 * What the front desk should know about right now, derived from live records.
 * Nothing is stored: an item disappears when its cause is resolved.
 */
export async function getNotifications(): Promise<NotificationItem[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const recallHorizon = new Date(
    today.getTime() + RECALL_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [drafts, noShows, recallCount, nextRecall, overdueCount, latestOverdue, patientActions] =
    await Promise.all([
      prisma.recommendation.findMany({
        where: { status: "PENDING" },
        include: { patient: true, appointment: true },
        orderBy: { createdAt: "desc" },
        take: MAX_PER_KIND,
      }),
      prisma.appointment.findMany({
        where: { status: "NO_SHOW", startsAt: { gte: today, lt: tomorrow } },
        include: { patient: true, provider: true },
        orderBy: { startsAt: "desc" },
        take: MAX_PER_KIND,
      }),
      prisma.recall.count({
        where: { completedAt: null, dueAt: { lte: recallHorizon } },
      }),
      prisma.recall.findFirst({
        where: { completedAt: null, dueAt: { lte: recallHorizon } },
        orderBy: { dueAt: "asc" },
      }),
      prisma.treatmentPlan.count({ where: { billingStatus: "OVERDUE" } }),
      prisma.treatmentPlan.findFirst({
        where: { billingStatus: "OVERDUE" },
        orderBy: { updatedAt: "desc" },
      }),
      // Things patients did themselves through their link.
      prisma.auditEvent.findMany({
        where: {
          createdAt: { gte: since },
          action: { in: ["appointment.confirmed", "appointment.cancelled", "appointment.rescheduled", "appointment.rebooked_by_patient"] },
          metadata: { path: ["via"], equals: "patient_link" },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_PER_KIND,
      }),
    ]);

  const items: NotificationItem[] = [];

  const PATIENT_VERB: Record<string, string> = {
    "appointment.confirmed": "confirmed their visit",
    "appointment.cancelled": "cancelled their visit",
    "appointment.rescheduled": "moved their visit",
    "appointment.rebooked_by_patient": "booked a new visit after missing one",
  };
  const patientIds = patientActions
    .map((e) => (e.metadata as { patientId?: string } | null)?.patientId)
    .filter((id): id is string => typeof id === "string");
  const patients = patientIds.length
    ? await prisma.patient.findMany({ where: { id: { in: patientIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];
  for (const e of patientActions) {
    const pid = (e.metadata as { patientId?: string } | null)?.patientId;
    const who = patients.find((p) => p.id === pid);
    items.push({
      id: `patient:${e.id}`,
      type: "PATIENT",
      title: "Patient replied",
      description: `${who ? `${who.firstName} ${who.lastName}` : "A patient"} ${PATIENT_VERB[e.action] ?? e.action} from their link.`,
      at: e.createdAt.toISOString(),
      link: pid ? `/patients/${pid}` : "/front-desk",
    });
  }

  for (const draft of drafts) {
    const name = `${draft.patient.firstName} ${draft.patient.lastName}`;
    items.push({
      id: `recommendation:${draft.id}`,
      type: "RECOMMENDATION",
      title: "Follow-up draft ready",
      description: draft.appointment?.reason
        ? `Message drafted for ${name} (${draft.appointment.reason}).`
        : `Message drafted for ${name}.`,
      at: draft.createdAt.toISOString(),
      link: "/front-desk#continuity",
    });
  }

  for (const appt of noShows) {
    const name = `${appt.patient.firstName} ${appt.patient.lastName}`;
    const time = appt.startsAt.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
    items.push({
      id: `no-show:${appt.id}`,
      type: "NO_SHOW",
      title: "No-show flagged",
      description: appt.provider
        ? `${name} missed the ${time} appointment with ${appt.provider.name}.`
        : `${name} missed the ${time} appointment.`,
      at: appt.updatedAt.toISOString(),
      link: `/patients/${appt.patientId}`,
    });
  }

  if (recallCount > 0 && nextRecall) {
    items.push({
      // Keyed by count so a changed total shows up as new.
      id: `recalls:${recallCount}`,
      type: "RECALL",
      title: `${recallCount} recall${recallCount === 1 ? "" : "s"} due`,
      description: `Due or overdue within the next ${RECALL_WINDOW_DAYS} days.`,
      at: nextRecall.dueAt.toISOString(),
      link: "/patients",
    });
  }

  if (overdueCount > 0 && latestOverdue) {
    items.push({
      id: `overdue:${overdueCount}`,
      type: "BILLING",
      title: `${overdueCount} overdue balance${overdueCount === 1 ? "" : "s"}`,
      description: "Treatment plans with payment overdue.",
      at: latestOverdue.updatedAt.toISOString(),
      link: "/patients",
    });
  }

  return items;
}
