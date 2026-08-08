import { getDashboardSummary } from "@/lib/queries";

export default async function DashboardPage() {
  const stats = await getDashboardSummary();

  const cards = [
    {
      label: "Today's Appointments",
      value: stats.todayAppointmentCount,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      label: "No-Shows Today",
      value: stats.todayNoShowCount,
      color: stats.todayNoShowCount > 0
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-gray-50 text-gray-700 border-gray-200",
    },
    {
      label: "Pending Recommendations",
      value: stats.pendingRecommendationCount,
      color: stats.pendingRecommendationCount > 0
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-gray-50 text-gray-700 border-gray-200",
    },
    {
      label: "Recovered Appointments",
      value: stats.recoveredAppointmentCount,
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      label: "Revenue Recovered",
      value: `₦${stats.revenueRecovered.toLocaleString()}`,
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      label: "Recalls Due (30 days)",
      value: stats.recallsDueCount,
      color: stats.recallsDueCount > 0
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-gray-50 text-gray-700 border-gray-200",
    },
    {
      label: "Outstanding Balances",
      value: stats.outstandingBalanceCount,
      color: stats.outstandingBalanceCount > 0
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-gray-50 text-gray-700 border-gray-200",
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">
        Practice Dashboard
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`border rounded-lg p-5 ${card.color}`}
          >
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue highlight */}
      {stats.recoveredAppointmentCount > 0 && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800">
            Retention Agent Impact
          </h2>
          <p className="text-sm text-green-700 mt-1">
            The Retention Agent has recovered{" "}
            <strong>{stats.recoveredAppointmentCount} appointments</strong>{" "}
            worth <strong>₦{stats.revenueRecovered.toLocaleString()}</strong> in
            estimated revenue that would otherwise have been lost to no-shows.
          </p>
        </div>
      )}
    </div>
  );
}
