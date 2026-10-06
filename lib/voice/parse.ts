/**
 * Spoken-command grammar. Pure and synchronous, so it runs in the browser in
 * the user's own timezone, which is the clinic's. Nothing here touches data:
 * the output is an intent the server then resolves (which patient, which
 * slot) and the user confirms.
 *
 * English first, with the Hindi words front-desk staff actually mix in.
 */

import * as chrono from "chrono-node";
import { stripSpokenPunctuation, wordsToDigits } from "@/lib/voice/numbers";
import type { AppointmentStatus } from "@/app/generated/prisma/enums";

export type Page =
  | "front-desk"
  | "dashboard"
  | "patients"
  | "calendar"
  | "settings"
  | "new-appointment"
  | "new-patient";

export type Metric =
  | "appointmentsToday"
  | "noShowsToday"
  | "pendingDrafts"
  | "recallsDue"
  | "overdueBalances"
  | "recovered"
  | "waiting"
  | "nextAppointment";

export type Intent =
  | { kind: "navigate"; page: Page }
  | { kind: "query"; metric: Metric }
  | { kind: "searchPatient"; name: string }
  | {
      kind: "book";
      name: string;
      /** ISO instant when a usable date/time was spoken, else null. */
      startsAt: string | null;
      /** The words that produced the time, for the confirmation card. */
      whenText: string | null;
      durationMins: number | null;
      providerName: string | null;
      reason: string | null;
      walkIn: boolean;
    }
  | { kind: "reschedule"; name: string; startsAt: string | null; whenText: string | null }
  | { kind: "status"; name: string; to: AppointmentStatus; reason: string | null }
  | { kind: "waitlist"; name: string; preferredTime: "morning" | "afternoon" | "any" }
  /** "new patient Priya Sharma, phone …": opens the form with the sentence ready to fill. */
  | { kind: "newPatient"; transcript: string }
  | { kind: "unknown"; text: string };

/** Hindi / Hinglish words staff mix into commands, mapped to the English the grammar knows. */
const HINGLISH: [RegExp, string][] = [
  [/\bparso+n?\b/g, "day after tomorrow"],
  [/\bkal\b/g, "tomorrow"],
  [/\baaj\b/g, "today"],
  [/\bsubah\b/g, "morning"],
  [/\bdopahar\b/g, "afternoon"],
  [/\bshaa?m\b/g, "evening"],
  [/\bbaje\b/g, "o'clock"],
  [/\b(aa gaya|aa gayi|aa gaye|aaya hai|aayi hai|aa chuka|aa chuki)\b/g, "has arrived"],
  [/\b(nahi aaya|nahi aayi|nahi aaye)\b/g, "did not come"],
  [/\bbook karo\b/g, "book"],
  [/\bcancel karo\b/g, "cancel"],
  [/\bkholo\b/g, "open"],
  [/\bdikhao\b/g, "show"],
  [/\bkitne\b/g, "how many"],
  [/\bmareez\b/g, "patient"],
];

const PAGES: [RegExp, Page][] = [
  [/\b(front ?desk|schedule|today'?s? (list|schedule)|reception)\b/, "front-desk"],
  [/\bdashboard\b/, "dashboard"],
  [/\b(new patient|register (a )?patient|add (a )?patient)\b/, "new-patient"],
  [/\b(new appointment|booking form)\b/, "new-appointment"],
  [/\bpatients?( list| directory)?\b/, "patients"],
  [/\bcalendar\b/, "calendar"],
  [/\bsettings?\b/, "settings"],
];

const METRICS: [RegExp, Metric][] = [
  [/\b(no[- ]?shows?|missed|didn'?t come)\b/, "noShowsToday"],
  [/\b(drafts?|recommendations?|approvals?|continuity)\b/, "pendingDrafts"],
  [/\brecalls?\b/, "recallsDue"],
  [/\b(overdue|balances?|dues?|pending payments?)\b/, "overdueBalances"],
  [/\b(recovered|recovery|revenue)\b/, "recovered"],
  [/\b(waiting|in the waiting|who'?s waiting)\b/, "waiting"],
  [/\b(next|who'?s next|who is next)\b/, "nextAppointment"],
  [/\b(appointments?|patients?|bookings?|visits?)\b/, "appointmentsToday"],
];

const STATUS_PATTERNS: { re: RegExp; to: AppointmentStatus; nameGroup: number }[] = [
  { re: /^(?:check ?in|checkin)\s+(.+)$/, to: "CHECKED_IN", nameGroup: 1 },
  { re: /^(.+?)\s+(?:is here|has arrived|arrived|has come|came|is at the desk)$/, to: "CHECKED_IN", nameGroup: 1 },
  { re: /^(?:take|send|move)\s+(.+?)\s+(?:to|into)\s+(?:the\s+)?chair(?:\s*(?:\d+|one|two|too|three|four))?$/, to: "IN_CHAIR", nameGroup: 1 },
  { re: /^(.+?)\s+(?:to|in|into)\s+(?:the\s+)?chair(?:\s*(?:\d+|one|two|too|three|four))?$/, to: "IN_CHAIR", nameGroup: 1 },
  { re: /^(?:complete|completed|finish|finished|done with|finished with)\s+(.+)$/, to: "COMPLETED", nameGroup: 1 },
  { re: /^(.+?)\s+(?:is )?(?:done|complete|completed|finished)$/, to: "COMPLETED", nameGroup: 1 },
  { re: /^(?:mark\s+)?(.+?)\s+(?:as\s+)?(?:a\s+)?no[- ]?show$/, to: "NO_SHOW", nameGroup: 1 },
  { re: /^no[- ]?show\s+(?:for\s+)?(.+)$/, to: "NO_SHOW", nameGroup: 1 },
  { re: /^(.+?)\s+(?:did ?n[o']?t|didn'?t|has ?n[o']?t)\s+(?:come|show|turn up|arrive|show up)$/, to: "NO_SHOW", nameGroup: 1 },
  { re: /^cancel\s+(.+?)(?:'s)?(?:\s+appointment)?$/, to: "CANCELLED", nameGroup: 1 },
  { re: /^confirm\s+(.+?)(?:'s)?(?:\s+(?:appointment|visit))?$/, to: "CONFIRMED", nameGroup: 1 },
];

const FILLERS = /^(?:please|hey|ok|okay|dento|hi|um+|uh+)\s+|\s+(?:please|thanks|thank you)$/g;

export function normalize(raw: string): string {
  // Engines add punctuation and spell numbers out; the grammar wants neither.
  let t = wordsToDigits(stripSpokenPunctuation(raw))
    .toLowerCase()
    .trim()
    .replace(/[.,!?]+$/g, "")
    .replace(/\s+/g, " ");
  for (const [re, en] of HINGLISH) t = t.replace(re, en);
  t = t.replace(FILLERS, "").trim();
  return t;
}

/** Hours 1–7 spoken without am/pm mean afternoon in a clinic ("book at 4"). */
function clinicHour(parsed: chrono.ParsedResult): Date {
  const d = parsed.start.date();
  if (parsed.start.isCertain("hour") && !parsed.start.isCertain("meridiem")) {
    const h = d.getHours();
    if (h >= 1 && h <= 7) d.setHours(h + 12);
  }
  return d;
}

function extractWhen(text: string, ref: Date): { startsAt: string | null; whenText: string | null; rest: string } {
  // chrono reads "day after tomorrow" as "tomorrow"; handle it first.
  let t = text;
  let offsetDays = 0;
  if (/\bday after tomorrow\b/.test(t)) {
    offsetDays = 2;
    t = t.replace(/\bday after tomorrow\b/, "tomorrow");
  }
  const results = chrono.parse(t, ref, { forwardDate: true });
  const r = results[0];
  if (!r) return { startsAt: null, whenText: null, rest: text };

  const d = clinicHour(r);
  if (offsetDays) d.setDate(d.getDate() + 1); // "tomorrow" already added one
  const rest = (t.slice(0, r.index) + " " + t.slice(r.index + r.text.length))
    .replace(/\b(at|on|for|around|by)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const whenText = offsetDays ? r.text.replace("tomorrow", "day after tomorrow") : r.text;
  // A bare date with no time is still useful: the slot picker takes over.
  return { startsAt: r.start.isCertain("hour") ? d.toISOString() : dateOnly(d), whenText, rest };
}

/** Midnight local for "tomorrow" with no time; the server offers slots for that day. */
function dateOnly(d: Date): string {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  return m.toISOString();
}

function extractDuration(text: string): { durationMins: number | null; rest: string } {
  const m = text.match(/\b(?:for\s+)?(\d+)\s*(?:min|mins|minutes)\b|\b(?:for\s+)?(an?|one|two|1|2)\s*(?:hour|hours|hr|hrs)\b|\bhalf an hour\b/);
  if (!m) return { durationMins: null, rest: text };
  let mins: number;
  if (m[0].includes("half")) mins = 30;
  else if (m[1]) mins = parseInt(m[1], 10);
  else mins = ({ a: 60, an: 60, one: 60, "1": 60, two: 120, "2": 120 } as Record<string, number>)[m[2]] ?? 60;
  return { durationMins: mins, rest: (text.slice(0, m.index) + " " + text.slice(m.index! + m[0].length)).replace(/\s+/g, " ").trim() };
}

function extractProvider(text: string): { providerName: string | null; rest: string } {
  const m = text.match(/\bwith\s+(?:dr\.?\s*|doctor\s+)?([a-z]+(?:\s+[a-z]+)?)\b/);
  if (!m) return { providerName: null, rest: text };
  return {
    providerName: m[1],
    rest: (text.slice(0, m.index) + " " + text.slice(m.index! + m[0].length)).replace(/\s+/g, " ").trim(),
  };
}

function extractReason(text: string): { reason: string | null; rest: string } {
  const m = text.match(/\bfor\s+(?:a\s+|an\s+)?([a-z][a-z\s-]{2,})$/);
  if (!m) return { reason: null, rest: text };
  return { reason: m[1].trim(), rest: text.slice(0, m.index).trim() };
}

function cleanName(s: string): string {
  return s
    .replace(/\b(?:patient|mr|mrs|ms|miss|dr|the|a|an|appointment|for)\b/g, " ")
    .replace(/'s\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCommand(raw: string, now: Date = new Date()): Intent {
  const text = normalize(raw);
  if (!text) return { kind: "unknown", text: raw };

  // Registration spoken in one go goes to the form, which fills itself from the words.
  const np = text.match(/^(?:new patient|register(?: a)?(?: new)? patient|add(?: a)?(?: new)? patient)\b\s*(.*)$/);
  if (np && np[1].trim()) return { kind: "newPatient", transcript: raw };

  // Navigation: "open dashboard", "go to settings", "show me today's schedule"
  const nav = text.match(/^(?:open|go to|goto|show(?: me)?|take me to|switch to)\s+(?:the\s+)?(.+)$/);
  if (nav) {
    for (const [re, page] of PAGES) if (re.test(nav[1])) return { kind: "navigate", page };
  }

  // Questions: "how many no-shows today", "who is waiting", "what's recovered"
  if (/^(?:how many|how much|what'?s|what is|who'?s|who is|any|do we have|show)\b/.test(text) || /\?$/.test(raw.trim())) {
    for (const [re, metric] of METRICS) if (re.test(text)) return { kind: "query", metric };
  }

  // Waitlist: "add priya to the waitlist", "waitlist rahul for mornings"
  const wl = text.match(/^(?:add\s+)?(.+?)\s+(?:to\s+)?(?:the\s+)?wait ?list(?:\s+(?:for\s+)?(morning|afternoon)s?)?$/) ??
    text.match(/^wait ?list\s+(.+?)(?:\s+(?:for\s+)?(morning|afternoon)s?)?$/);
  if (wl) {
    return { kind: "waitlist", name: cleanName(wl[1]), preferredTime: (wl[2] as "morning" | "afternoon") ?? "any" };
  }

  // Reschedule: "move priya to tomorrow 5 pm", "reschedule rahul to monday 10"
  const rs = text.match(/^(?:move|reschedule|shift|change)\s+(.+?)(?:'s)?(?:\s+appointment)?\s+to\s+(.+)$/);
  if (rs) {
    const when = extractWhen(rs[2], now);
    return { kind: "reschedule", name: cleanName(rs[1]), startsAt: when.startsAt, whenText: when.whenText };
  }

  // Booking: "book priya tomorrow at 5 for a cleaning with dr adeleke", "walk-in for rahul"
  const walk = text.match(/^(?:walk[- ]?in|walkin)\s+(?:for\s+)?(.+)$/);
  const bk = text.match(/^(?:book|schedule|appointment for|new appointment for|fix|set up)\s+(?:an?\s+)?(?:appointment\s+(?:for\s+)?)?(.+)$/);
  if (walk || bk) {
    let rest = (walk ?? bk)![1];
    const when = walk ? { startsAt: null, whenText: null, rest } : extractWhen(rest, now);
    rest = when.rest;
    const dur = extractDuration(rest);
    rest = dur.rest;
    const prov = extractProvider(rest);
    rest = prov.rest;
    const rsn = extractReason(rest);
    rest = rsn.rest;
    return {
      kind: "book",
      name: cleanName(rest),
      startsAt: when.startsAt,
      whenText: when.whenText,
      durationMins: dur.durationMins,
      providerName: prov.providerName,
      reason: rsn.reason,
      walkIn: !!walk,
    };
  }

  // Status moves: "priya is here", "check in rahul", "take priya to chair", "rahul didn't come", "cancel priya"
  for (const p of STATUS_PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      let name = m[p.nameGroup];
      let reason: string | null = null;
      const because = name.match(/^(.+?)\s+(?:because|reason|as)\s+(.+)$/);
      if (because) {
        name = because[1];
        reason = because[2];
      }
      return { kind: "status", name: cleanName(name), to: p.to, reason };
    }
  }

  // Search: "find priya", "search rahul sharma", "open priya's chart"
  const srch = text.match(/^(?:find|search(?: for)?|look up|lookup|open|show)\s+(?:patient\s+)?(.+?)(?:'s)?(?:\s+(?:chart|record|file|details|profile))?$/);
  if (srch && !PAGES.some(([re]) => re.test(srch[1]))) {
    return { kind: "searchPatient", name: cleanName(srch[1]) };
  }

  return { kind: "unknown", text: raw };
}
