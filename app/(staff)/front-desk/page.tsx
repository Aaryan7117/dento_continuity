import { getTodaySchedule, getPendingRecommendations } from "@/lib/queries";
import StatusBadge from "@/app/components/StatusBadge";
import ApproveRecommendationCard from "@/app/components/ApproveRecommendationCard";
import Link from "next/link";

export default async function FrontDeskPage() {
  const [schedule, recommendations] = await Promise.all([
    getTodaySchedule(),
    getPendingRecommendations(),
  ]);

  return (
    <div className="flex gap-6 items-start">
      {/* Left: Today's Schedule */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">
          Today&apos;s Schedule
        </h1>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Time
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Patient
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Reason
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Provider
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedule.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No appointments today
                  </td>
                </tr>
              )}
              {schedule.map((apt) => (
                <tr
                  key={apt.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    apt.status === "NO_SHOW" ? "bg-red-50/50" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                    {new Date(apt.startsAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/patients/${apt.patientId}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {apt.patient.firstName} {apt.patient.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {apt.reason ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {apt.provider?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={apt.status} />
                    {apt.pendingRecommendationId && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                        ⚡ Agent
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {apt.estimatedValue != null
                      ? `₦${apt.estimatedValue.toLocaleString()}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Continuity Panel */}
      <div className="w-96 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Continuity</h2>
          {recommendations.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {recommendations.length}
            </span>
          )}
        </div>

        {recommendations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-400 text-sm">
              No pending recommendations
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <ApproveRecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
