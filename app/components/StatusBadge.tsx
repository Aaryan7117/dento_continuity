/**
 * Status badge with colored dot indicator. Semi-transparent backgrounds rather
 * than solid fills, so the badge sits on any surface in either theme.
 */

type Tone = "sky" | "indigo" | "emerald" | "amber" | "red" | "neutral";

const DOTS: Record<Tone, string> = {
  sky: "#0ea5e9",
  indigo: "#6366f1",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  neutral: "#78716c",
};

const TONES: Record<string, Tone> = {
  // Appointment
  SCHEDULED: "sky",
  CONFIRMED: "indigo",
  CHECKED_IN: "amber",
  IN_CHAIR: "indigo",
  COMPLETED: "emerald",
  CANCELLED: "neutral",
  NO_SHOW: "red",
  // Treatment plan
  PROPOSED: "amber",
  ACCEPTED: "sky",
  // Billing
  PAID: "emerald",
  PENDING: "amber",
  OVERDUE: "red",
  // Recommendation
  APPROVED: "emerald",
  SENT: "emerald",
  DISMISSED: "neutral",
};

export default function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const tone = TONES[status] ?? "neutral";
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-[2.5px] rounded-md text-[11px] font-semibold uppercase tracking-wide border border-transparent transition-colors ${className}`}
      style={{
        background: `rgb(var(--tone-${tone}) / 0.12)`,
        color: `var(--tone-${tone}-ink)`,
        borderColor: `rgb(var(--tone-${tone}) / 0.22)`,
      }}
      data-no-press
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: `var(--tone-${tone}-ink)` }}
      />
      {label}
    </span>
  );
}
