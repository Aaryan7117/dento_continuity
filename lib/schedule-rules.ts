/**
 * Appointment state machine. Pure data, safe to import from client components.
 *
 *   SCHEDULED → CONFIRMED → CHECKED_IN → IN_CHAIR → COMPLETED
 *
 * CANCELLED and NO_SHOW are terminal. A confirmation can be undone; arrival,
 * chair and completion cannot (they carry timestamps the clinic reports on).
 */

import type { AppointmentStatus } from "@/app/generated/prisma/enums";

export const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["SCHEDULED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_CHAIR", "COMPLETED", "CANCELLED"],
  IN_CHAIR: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

/** Statuses that still occupy their slot; cancelled and missed visits free it. */
export const HOLDS_SLOT: readonly AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_CHAIR",
];

/** Transitions where the front desk is asked why. */
export const NEEDS_REASON: readonly AppointmentStatus[] = ["CANCELLED", "NO_SHOW"];

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  IN_CHAIR: "In chair",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

/** Menu wording for moving *to* a status. */
export const TRANSITION_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Undo confirmation",
  CONFIRMED: "Confirm visit",
  CHECKED_IN: "Patient arrived",
  IN_CHAIR: "Take to chair",
  COMPLETED: "Mark completed",
  CANCELLED: "Cancel appointment",
  NO_SHOW: "Flag no-show",
};

/** Minutes between arrival and chair, or arrival and now while still waiting. */
export function waitingMinutes(
  a: { status: AppointmentStatus; checkedInAt: string | null; inChairAt: string | null },
  now: Date = new Date()
): number | null {
  if (!a.checkedInAt) return null;
  const start = new Date(a.checkedInAt).getTime();
  const end =
    a.inChairAt ? new Date(a.inChairAt).getTime() : a.status === "CHECKED_IN" ? now.getTime() : null;
  if (end === null) return null;
  return Math.max(0, Math.round((end - start) / 60000));
}
