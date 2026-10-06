"use server";

/**
 * Turns a parsed spoken intent into something concrete the user can confirm:
 * which patient, which dentist, which slot, and what would change. Nothing is
 * written until `executeAction` runs with the user's confirmation.
 */

import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  bookAppointment,
  conflictMessage,
  findSlotConflict,
  rescheduleAppointment,
  transitionAppointment,
} from "@/lib/appointments";
import { getAvailableSlots, getClinicSettings } from "@/lib/clinic";
import { addToWaitlist } from "@/lib/waitlist";
import { getDashboardSummary } from "@/lib/queries";
import { HOLDS_SLOT, STATUS_LABEL, TRANSITION_LABEL, canTransition, waitingMinutes } from "@/lib/schedule-rules";
import { utcToZoned } from "@/lib/opening-hours";
import type { Intent, Metric, Page } from "@/lib/voice/parse";
import type { AppointmentStatus } from "@/app/generated/prisma/enums";

export interface Candidate {
  id: string;
  label: string;
  detail?: string;
}

/** A proposed change, shown on the confirmation card. */
export type Proposal =
  | { kind: "message"; text: string; navigateTo?: string }
  | {
      kind: "choose";
      /** What is missing before the action can be proposed. */
      choose: "patient" | "slot" | "appointment";
      prompt: string;
      candidates: Candidate[];
      /** Re-submitted with the chosen id filled in. */
      intent: Intent;
    }
  | { kind: "confirm"; summary: string; action: Action };

export type Action =
  | { type: "book"; patientId: string; providerId: string | null; startsAt: string; endsAt: string; reason: string | null; walkIn: boolean }
  | { type: "status"; appointmentId: string; to: AppointmentStatus; reason: string | null }
  | { type: "reschedule"; appointmentId: string; startsAt: string; endsAt: string }
  | { type: "waitlist"; patientId: string; preferredTime: "morning" | "afternoon" | "any" };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

// ---------------------------------------------------------------------------
// Matching people
// ---------------------------------------------------------------------------

/** Edit distance with transpositions; names come back from speech slightly bent. */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  return d[a.length][b.length];
}

/** Collapses the spellings speech engines confuse: Varma/Verma, Belo/Bello, Zina/Zainab. */
function soundKey(s: string): string {
  const letters = s.toLowerCase().replace(/[^a-z]/g, "").replace(/ph/g, "f").replace(/ck/g, "k");
  let out = "";
  for (let i = 0; i < letters.length; i++) {
    const ch = letters[i];
    if (i > 0 && "aeiouy".includes(ch)) continue; // keep only the leading vowel
    if (out[out.length - 1] === ch) continue; // drop doubled letters
    out += ch;
  }
  return out;
}

function tokenScore(token: string, word: string): number {
  const t = token.toLowerCase();
  const w = word.toLowerCase();
  if (t === w) return 4;
  if (w.startsWith(t) || t.startsWith(w)) return 3;
  const st = soundKey(t);
  const sw = soundKey(w);
  if (st === sw) return 2.5;
  // "Tobola" → "tbl" is the start of "Tobiloba" → "tblb": the engine dropped a syllable.
  if (st.length >= 3 && sw.length >= 2 && (sw.startsWith(st) || st.startsWith(sw))) return 2;
  const dist = editDistance(t, w);
  if (dist <= Math.max(1, Math.floor(Math.max(t.length, w.length) / 4))) return 2;
  if (w.includes(t)) return 1;
  return 0;
}

async function findPatients(name: string, limit = 5): Promise<Candidate[]> {
  const tokens = name.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];
  // Clinics are small enough to score every patient in memory; a database
  // "contains" filter would miss exactly the bent spellings this must catch.
  const rows = await prisma.patient.findMany({
    select: { id: true, firstName: true, lastName: true, phone: true },
    take: 5000,
  });
  const scored = rows
    .map((p) => {
      const words = [p.firstName, p.lastName].flatMap((n) => n.split(/\s+/));
      let s = 0;
      for (const t of tokens) s += Math.max(0, ...words.map((w) => tokenScore(t, w)));
      return { p, s };
    })
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s);
  // Keep only candidates close to the best; a clear winner stands alone.
  const best = scored[0]?.s ?? 0;
  return scored
    .filter((x) => x.s >= best - 1)
    .slice(0, limit)
    .map(({ p }) => ({ id: p.id, label: `${p.firstName} ${p.lastName}`, detail: p.phone }));
}

async function findProvider(name: string | null): Promise<{ id: string; name: string } | null> {
  if (!name) return null;
  const rows = await prisma.user.findMany({
    where: { role: "DENTIST", isActive: true, name: { contains: name.split(/\s+/).pop()!, mode: "insensitive" } },
    select: { id: true, name: true },
    take: 2,
  });
  return rows.length === 1 ? rows[0] : null;
}

/** Today's live appointments for a patient, for status moves spoken by name. */
async function todaysAppointmentsFor(patientIds: string[]) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return prisma.appointment.findMany({
    where: { patientId: { in: patientIds }, startsAt: { gte: dayStart, lt: dayEnd } },
    include: { patient: { select: { firstName: true, lastName: true } } },
    orderBy: { startsAt: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Resolving intents
// ---------------------------------------------------------------------------

const intentSchema = z.custom<Intent>((v) => !!v && typeof v === "object" && typeof (v as Intent).kind === "string");

export async function resolveIntent(
  rawIntent: Intent,
  chosen?: { patientId?: string; appointmentId?: string; startsAt?: string }
): Promise<Proposal> {
  const parsed = intentSchema.safeParse(rawIntent);
  if (!parsed.success) return { kind: "message", text: "I could not read that command." };
  const intent = parsed.data;

  switch (intent.kind) {
    case "navigate":
      return { kind: "message", text: "", navigateTo: pageHref(intent.page) };

    case "newPatient":
      return { kind: "message", text: "", navigateTo: `/patients/new?voice=${encodeURIComponent(intent.transcript)}` };

    case "query":
      return answerMetric(intent.metric);

    case "unknown":
      return {
        kind: "message",
        text: `I didn't understand "${intent.text}". Try "book Priya tomorrow at 5", "Rahul is here", or "how many no-shows today".`,
      };

    case "searchPatient": {
      const found = await findPatients(intent.name);
      if (found.length === 0) return { kind: "message", text: `No patient called ${intent.name}.` };
      if (found.length === 1) return { kind: "message", text: "", navigateTo: `/patients/${found[0].id}` };
      return { kind: "choose", choose: "patient", prompt: "Which patient?", candidates: found, intent };
    }

    case "waitlist": {
      const patient = await pickPatient(intent.name, chosen?.patientId);
      if ("proposal" in patient) return patient.proposal(intent);
      return {
        kind: "confirm",
        summary: `Add ${patient.label} to the waitlist${intent.preferredTime === "any" ? "" : ` for ${intent.preferredTime}s`}.`,
        action: { type: "waitlist", patientId: patient.id, preferredTime: intent.preferredTime },
      };
    }

    case "status": {
      const patient = await pickPatient(intent.name, chosen?.patientId);
      if ("proposal" in patient) return patient.proposal(intent);
      const appts = await todaysAppointmentsFor([patient.id]);
      const movable = appts.filter((a) => canTransition(a.status, intent.to));
      if (movable.length === 0) {
        const reason = appts.length === 0
          ? `${patient.label} has no appointment today.`
          : `${patient.label}'s visit today is ${STATUS_LABEL[appts[0].status].toLowerCase()}; it cannot move to ${STATUS_LABEL[intent.to].toLowerCase()}.`;
        return { kind: "message", text: reason };
      }
      let appt = movable[0];
      if (movable.length > 1) {
        if (!chosen?.appointmentId) {
          return {
            kind: "choose",
            choose: "appointment",
            prompt: `${patient.label} has ${movable.length} visits today. Which one?`,
            candidates: movable.map((a) => ({ id: a.id, label: fmt(a.startsAt.toISOString()), detail: a.reason ?? undefined })),
            intent,
          };
        }
        appt = movable.find((a) => a.id === chosen.appointmentId) ?? appt;
      }
      return {
        kind: "confirm",
        summary: `${TRANSITION_LABEL[intent.to]}: ${patient.label}, ${fmt(appt.startsAt.toISOString())}${intent.reason ? ` (${intent.reason})` : ""}.`,
        action: { type: "status", appointmentId: appt.id, to: intent.to, reason: intent.reason },
      };
    }

    case "reschedule": {
      const patient = await pickPatient(intent.name, chosen?.patientId);
      if ("proposal" in patient) return patient.proposal(intent);
      const live = await prisma.appointment.findFirst({
        where: { patientId: patient.id, status: { in: ["SCHEDULED", "CONFIRMED"] }, endsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
      });
      if (!live) return { kind: "message", text: `${patient.label} has no upcoming appointment to move.` };
      const durationMs = live.endsAt.getTime() - live.startsAt.getTime();
      const start = chosen?.startsAt ?? intent.startsAt;
      if (!start) return { kind: "message", text: "Say when to move it to, for example \"move Priya to tomorrow 5 pm\"." };
      if (!chosen?.startsAt && isDateOnly(start)) {
        return slotChoice(intent, start, Math.round(durationMs / 60000), live.providerId, live.chairId, live.id);
      }
      const endsAt = new Date(new Date(start).getTime() + durationMs).toISOString();
      const conflict = await findSlotConflict({ patientId: patient.id, providerId: live.providerId, chairId: live.chairId, startsAt: new Date(start), endsAt: new Date(endsAt), excludeId: live.id });
      if (conflict) return { kind: "message", text: conflictMessage(conflict) };
      return {
        kind: "confirm",
        summary: `Move ${patient.label} from ${fmt(live.startsAt.toISOString())} to ${fmt(start)}.`,
        action: { type: "reschedule", appointmentId: live.id, startsAt: start, endsAt },
      };
    }

    case "book": {
      const patient = await pickPatient(intent.name, chosen?.patientId);
      if ("proposal" in patient) return patient.proposal(intent);
      const settings = await getClinicSettings();
      const durationMins = intent.durationMins ?? settings.defaultVisitMinutes;
      const provider = await findProvider(intent.providerName);
      if (intent.providerName && !provider) {
        return { kind: "message", text: `I don't know a dentist called ${intent.providerName}.` };
      }

      if (intent.walkIn) {
        const startsAt = new Date();
        const endsAt = new Date(startsAt.getTime() + durationMins * 60000);
        return {
          kind: "confirm",
          summary: `Walk-in: check in ${patient.label} now for ${durationMins} minutes${provider ? ` with ${provider.name}` : ""}${intent.reason ? ` (${intent.reason})` : ""}.`,
          action: { type: "book", patientId: patient.id, providerId: provider?.id ?? null, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: intent.reason, walkIn: true },
        };
      }

      const start = chosen?.startsAt ?? intent.startsAt;
      if (!start) return { kind: "message", text: `When should I book ${patient.label}? Say a day and time, for example "tomorrow at 5".` };
      if (!chosen?.startsAt && isDateOnly(start)) {
        return slotChoice(intent, start, durationMins, provider?.id ?? null, null);
      }
      const endsAt = new Date(new Date(start).getTime() + durationMins * 60000).toISOString();
      const conflict = await findSlotConflict({ patientId: patient.id, providerId: provider?.id ?? null, startsAt: new Date(start), endsAt: new Date(endsAt) });
      if (conflict) {
        const alt = await nearbySlots(start, durationMins, provider?.id ?? null);
        return {
          kind: "choose",
          choose: "slot",
          prompt: `${conflictMessage(conflict)} Nearby free times:`,
          candidates: alt.map((iso) => ({ id: iso, label: fmt(iso) })),
          intent: { ...intent, name: patient.label },
        };
      }
      return {
        kind: "confirm",
        summary: `Book ${patient.label} on ${fmt(start)} for ${durationMins} minutes${provider ? ` with ${provider.name}` : ""}${intent.reason ? ` (${intent.reason})` : ""}.`,
        action: { type: "book", patientId: patient.id, providerId: provider?.id ?? null, startsAt: start, endsAt, reason: intent.reason, walkIn: false },
      };
    }
  }
}

type Picked = { id: string; label: string } | { proposal: (intent: Intent) => Proposal };

async function pickPatient(name: string, chosenId?: string): Promise<Picked> {
  if (chosenId) {
    const p = await prisma.patient.findUnique({ where: { id: chosenId }, select: { id: true, firstName: true, lastName: true } });
    if (p) return { id: p.id, label: `${p.firstName} ${p.lastName}` };
  }
  if (!name) return { proposal: () => ({ kind: "message", text: "Which patient? Say their name." }) };
  const found = await findPatients(name);
  if (found.length === 0) return { proposal: () => ({ kind: "message", text: `No patient called ${name}.` }) };
  if (found.length === 1) return { id: found[0].id, label: found[0].label };
  // Exact full-name match beats the rest even when there are several hits.
  const exact = found.filter((f) => f.label.toLowerCase() === name.toLowerCase());
  if (exact.length === 1) return { id: exact[0].id, label: exact[0].label };
  return {
    proposal: (intent) => ({ kind: "choose", choose: "patient", prompt: `Which ${name}?`, candidates: found, intent }),
  };
}

const isDateOnly = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() === 0 && d.getMinutes() === 0 && utcToZoned(d, "Asia/Kolkata").time === "00:00";
};

async function slotChoice(
  intent: Intent,
  dayIso: string,
  durationMins: number,
  providerId: string | null,
  chairId: string | null,
  excludeAppointmentId?: string
): Promise<Proposal> {
  const { date } = utcToZoned(new Date(dayIso), "Asia/Kolkata");
  const { slots, closed } = await getAvailableSlots({ date, durationMins, providerId, chairId, excludeAppointmentId });
  if (closed) return { kind: "message", text: `The clinic is closed on ${date}.` };
  if (slots.length === 0) return { kind: "message", text: `No free ${durationMins}-minute slot on ${date}.` };
  return {
    kind: "choose",
    choose: "slot",
    prompt: "Which time?",
    candidates: slots.slice(0, 12).map((iso) => ({ id: iso, label: fmt(iso) })),
    intent,
  };
}

async function nearbySlots(start: string, durationMins: number, providerId: string | null): Promise<string[]> {
  const { date } = utcToZoned(new Date(start), "Asia/Kolkata");
  const { slots } = await getAvailableSlots({ date, durationMins, providerId });
  const t = new Date(start).getTime();
  return slots.sort((a, b) => Math.abs(new Date(a).getTime() - t) - Math.abs(new Date(b).getTime() - t)).slice(0, 6);
}

function pageHref(page: Page): string {
  return (
    {
      "front-desk": "/front-desk",
      dashboard: "/dashboard",
      patients: "/patients",
      calendar: "/calendar",
      settings: "/settings",
      "new-appointment": "/appointments/new",
      "new-patient": "/patients/new",
    } as Record<string, string>
  )[page];
}

// ---------------------------------------------------------------------------
// Answering questions
// ---------------------------------------------------------------------------

async function answerMetric(metric: Metric): Promise<Proposal> {
  const s = await getDashboardSummary();
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  switch (metric) {
    case "appointmentsToday":
      return { kind: "message", text: `${n(s.todayAppointmentCount, "appointment", "appointments")} today, ${n(s.todayNoShowCount, "no-show", "no-shows")} so far.`, navigateTo: "/front-desk" };
    case "noShowsToday":
      return { kind: "message", text: s.todayNoShowCount === 0 ? "No no-shows today." : `${n(s.todayNoShowCount, "no-show", "no-shows")} today, ${n(s.pendingRecommendationCount, "follow-up draft", "follow-up drafts")} waiting for approval.`, navigateTo: "/front-desk?filter=NO_SHOW" };
    case "pendingDrafts":
      return { kind: "message", text: s.pendingRecommendationCount === 0 ? "Nothing waiting for approval." : `${n(s.pendingRecommendationCount, "draft", "drafts")} waiting for your approval.`, navigateTo: "/front-desk#continuity" };
    case "recallsDue":
      return { kind: "message", text: `${n(s.recallsDueCount, "recall", "recalls")} due in the next 30 days.`, navigateTo: "/patients" };
    case "overdueBalances":
      return { kind: "message", text: `${n(s.outstandingBalanceCount, "balance", "balances")} outstanding.`, navigateTo: "/patients" };
    case "recovered":
      return { kind: "message", text: `${n(s.recoveredAppointmentCount, "appointment", "appointments")} recovered, worth ₹${s.revenueRecovered.toLocaleString("en-IN")}.`, navigateTo: "/dashboard" };
    case "waiting": {
      const waiting = await prisma.appointment.findMany({
        where: { status: "CHECKED_IN" },
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { checkedInAt: "asc" },
      });
      if (waiting.length === 0) return { kind: "message", text: "Nobody is waiting." };
      const parts = waiting.map((a) => {
        const mins = waitingMinutes({ status: a.status, checkedInAt: a.checkedInAt?.toISOString() ?? null, inChairAt: null });
        return `${a.patient.firstName} ${a.patient.lastName} (${mins ?? 0} min)`;
      });
      return { kind: "message", text: `Waiting: ${parts.join(", ")}.`, navigateTo: "/front-desk" };
    }
    case "nextAppointment": {
      const next = await prisma.appointment.findFirst({
        where: { status: { in: [...HOLDS_SLOT] }, startsAt: { gte: new Date() } },
        include: { patient: { select: { firstName: true, lastName: true } }, provider: { select: { name: true } } },
        orderBy: { startsAt: "asc" },
      });
      if (!next) return { kind: "message", text: "Nothing else booked today." };
      return { kind: "message", text: `Next: ${next.patient.firstName} ${next.patient.lastName} at ${fmt(next.startsAt.toISOString())}${next.provider ? ` with ${next.provider.name}` : ""}${next.reason ? `, ${next.reason}` : ""}.`, navigateTo: "/front-desk" };
    }
  }
}

// ---------------------------------------------------------------------------
// Executing a confirmed action
// ---------------------------------------------------------------------------

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("book"), patientId: z.uuid(), providerId: z.uuid().nullable(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime(), reason: z.string().max(500).nullable(), walkIn: z.boolean() }),
  z.object({ type: z.literal("status"), appointmentId: z.uuid(), to: z.enum(["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_CHAIR", "COMPLETED", "CANCELLED", "NO_SHOW"]), reason: z.string().max(300).nullable() }),
  z.object({ type: z.literal("reschedule"), appointmentId: z.uuid(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime() }),
  z.object({ type: z.literal("waitlist"), patientId: z.uuid(), preferredTime: z.enum(["morning", "afternoon", "any"]) }),
]);

export async function executeAction(raw: Action): Promise<{ ok: true; text: string; navigateTo?: string } | { ok: false; text: string }> {
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, text: "That action is not valid." };
  const action = parsed.data;

  // Outside a Next.js request (scripts, the MCP server) there is no cache to
  // invalidate; the call throws, and that must not undo a completed write.
  const refresh = () => {
    try {
      revalidatePath("/front-desk");
      revalidatePath("/dashboard");
      revalidatePath("/calendar");
    } catch {
      // no request scope
    }
  };

  switch (action.type) {
    case "book": {
      const r = await bookAppointment({
        patientId: action.patientId,
        providerId: action.providerId,
        startsAt: action.startsAt,
        endsAt: action.endsAt,
        reason: action.reason,
        walkIn: action.walkIn,
        status: action.walkIn ? "CHECKED_IN" : "SCHEDULED",
      });
      if (!r.ok) return { ok: false, text: r.reason === "conflict" ? conflictMessage(r.conflict) : "Could not book that." };
      refresh();
      try {
        revalidatePath(`/patients/${action.patientId}`);
      } catch {
        // no request scope
      }
      return { ok: true, text: action.walkIn ? "Checked in." : `Booked for ${fmt(action.startsAt)}.`, navigateTo: "/front-desk" };
    }
    case "status": {
      const r = await transitionAppointment(action.appointmentId, action.to, action.reason ?? undefined);
      if (!r.ok) return { ok: false, text: r.reason === "notFound" ? "Appointment not found." : "That move is not allowed any more." };
      refresh();
      return { ok: true, text: action.to === "NO_SHOW" ? "Flagged. A follow-up draft is in the Continuity queue." : `Done: ${STATUS_LABEL[action.to].toLowerCase()}.` };
    }
    case "reschedule": {
      const r = await rescheduleAppointment(action.appointmentId, { startsAt: action.startsAt, endsAt: action.endsAt });
      if (!r.ok) return { ok: false, text: r.reason === "conflict" ? conflictMessage(r.conflict) : "Could not move it." };
      refresh();
      return { ok: true, text: `Moved to ${fmt(action.startsAt)}.` };
    }
    case "waitlist": {
      const r = await addToWaitlist({ patientId: action.patientId, preferredTime: action.preferredTime });
      if (!r.ok) return { ok: false, text: r.reason === "alreadyWaiting" ? "Already on the waitlist." : "Patient not found." };
      refresh();
      return { ok: true, text: "Added to the waitlist." };
    }
  }
}
