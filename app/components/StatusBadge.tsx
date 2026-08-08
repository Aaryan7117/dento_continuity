/**
 * Reusable status badge. Maps appointment, treatment plan, billing,
 * and recommendation statuses to colors.
 */

const COLORS: Record<string, string> = {
  // Appointment
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  NO_SHOW: "bg-red-100 text-red-700",
  // Treatment plan
  PROPOSED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  // Billing
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  // Recommendation
  APPROVED: "bg-green-100 text-green-700",
  SENT: "bg-green-100 text-green-700",
  DISMISSED: "bg-gray-100 text-gray-500",
};

export default function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const color = COLORS[status] ?? "bg-gray-100 text-gray-600";
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color} ${className}`}
    >
      {label}
    </span>
  );
}
