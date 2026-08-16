/**
 * Status badge with colored dot indicator. Uses semi-transparent backgrounds
 * that feel more refined than solid Tailwind bg-* colors.
 */

const PALETTE: Record<string, { bg: string; dot: string; text: string }> = {
  // Appointment
  SCHEDULED: { bg: "rgba(14, 165, 233, 0.1)", dot: "#0ea5e9", text: "#0369a1" },
  CONFIRMED: { bg: "rgba(99, 102, 241, 0.1)", dot: "#6366f1", text: "#4338ca" },
  COMPLETED: { bg: "rgba(16, 185, 129, 0.1)", dot: "#10b981", text: "#047857" },
  CANCELLED: { bg: "rgba(120, 113, 108, 0.1)", dot: "#78716c", text: "#57534e" },
  NO_SHOW: { bg: "rgba(239, 68, 68, 0.1)", dot: "#ef4444", text: "#b91c1c" },
  // Treatment plan
  PROPOSED: { bg: "rgba(245, 158, 11, 0.1)", dot: "#f59e0b", text: "#b45309" },
  ACCEPTED: { bg: "rgba(14, 165, 233, 0.1)", dot: "#0ea5e9", text: "#0369a1" },
  // Billing
  PAID: { bg: "rgba(16, 185, 129, 0.1)", dot: "#10b981", text: "#047857" },
  PENDING: { bg: "rgba(245, 158, 11, 0.1)", dot: "#f59e0b", text: "#b45309" },
  OVERDUE: { bg: "rgba(239, 68, 68, 0.1)", dot: "#ef4444", text: "#b91c1c" },
  // Recommendation
  APPROVED: { bg: "rgba(16, 185, 129, 0.1)", dot: "#10b981", text: "#047857" },
  SENT: { bg: "rgba(16, 185, 129, 0.1)", dot: "#10b981", text: "#047857" },
  DISMISSED: { bg: "rgba(120, 113, 108, 0.1)", dot: "#78716c", text: "#57534e" },
};

const FALLBACK = { bg: "rgba(120, 113, 108, 0.08)", dot: "#a8a29e", text: "#78716c" };

export default function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const palette = PALETTE[status] ?? FALLBACK;
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] font-semibold uppercase tracking-wide ${className}`}
      style={{
        background: palette.bg,
        color: palette.text,
      }}
      data-no-press
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: palette.dot }}
      />
      {label}
    </span>
  );
}
