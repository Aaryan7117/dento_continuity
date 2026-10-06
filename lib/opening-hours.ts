/**
 * Clinic opening hours and slot generation. Pure functions; no database.
 *
 * Hours are stored per weekday as [["09:00","13:00"],["16:00","20:00"]] in
 * the clinic's own timezone. Dates are handled as wall-clock strings and
 * converted with Intl so the server's timezone never leaks in.
 */

export type HourRange = [string, string];
export type OpeningHours = Partial<Record<Weekday, HourRange[]>>;
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Used when a clinic has not set hours yet. Sunday closed. */
export const DEFAULT_OPENING_HOURS: OpeningHours = {
  mon: [["09:00", "13:00"], ["16:00", "20:00"]],
  tue: [["09:00", "13:00"], ["16:00", "20:00"]],
  wed: [["09:00", "13:00"], ["16:00", "20:00"]],
  thu: [["09:00", "13:00"], ["16:00", "20:00"]],
  fri: [["09:00", "13:00"], ["16:00", "20:00"]],
  sat: [["09:00", "14:00"]],
};

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isOpeningHours(value: unknown): value is OpeningHours {
  if (!value || typeof value !== "object") return false;
  for (const [day, ranges] of Object.entries(value as Record<string, unknown>)) {
    if (!WEEKDAYS.includes(day as Weekday) || !Array.isArray(ranges)) return false;
    for (const r of ranges) {
      if (!Array.isArray(r) || r.length !== 2) return false;
      if (!TIME.test(String(r[0])) || !TIME.test(String(r[1])) || r[0] >= r[1]) return false;
    }
  }
  return true;
}

/** Offset of `timeZone` from UTC, in minutes, at the given instant. */
function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Wall-clock `YYYY-MM-DD` + `HH:MM` in `timeZone` → instant. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes handle the rare case where the first guess straddles a DST change.
  const first = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  return new Date(guess - offsetMinutes(new Date(first), timeZone) * 60000);
}

/** Instant → `YYYY-MM-DD` and `HH:MM` wall clock in `timeZone`. */
export function utcToZoned(at: Date, timeZone: string): { date: string; time: string; weekday: Weekday } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    weekday: get("weekday").slice(0, 3).toLowerCase() as Weekday,
  };
}

export function weekdayOf(date: string, timeZone: string): Weekday {
  return utcToZoned(zonedToUtc(date, "12:00", timeZone), timeZone).weekday;
}

export interface Busy {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Start times on the slot grid where a visit of `durationMins` fits inside
 * opening hours and overlaps none of `busy`. `notBefore` hides the past.
 */
export function availableSlots(args: {
  date: string;
  timeZone: string;
  hours: OpeningHours;
  slotMinutes: number;
  durationMins: number;
  busy: Busy[];
  notBefore?: Date;
}): Date[] {
  const ranges = args.hours[weekdayOf(args.date, args.timeZone)] ?? [];
  const out: Date[] = [];
  for (const [open, close] of ranges) {
    const openAt = zonedToUtc(args.date, open, args.timeZone).getTime();
    const closeAt = zonedToUtc(args.date, close, args.timeZone).getTime();
    for (let t = openAt; t + args.durationMins * 60000 <= closeAt; t += args.slotMinutes * 60000) {
      const end = t + args.durationMins * 60000;
      if (args.notBefore && t < args.notBefore.getTime()) continue;
      const clash = args.busy.some((b) => b.startsAt.getTime() < end && b.endsAt.getTime() > t);
      if (!clash) out.push(new Date(t));
    }
  }
  return out;
}
