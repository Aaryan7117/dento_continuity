import { getTodaySchedule, getPendingRecommendations } from "@/lib/queries";
import ApproveRecommendationCard from "@/app/components/ApproveRecommendationCard";
import { AlertCircle, Sparkles } from "lucide-react";
import FrontDeskScheduleClient from "./FrontDeskScheduleClient";

export const dynamic = "force-dynamic";

export default async function FrontDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const [schedule, recommendations] = await Promise.all([
    getTodaySchedule(),
    getPendingRecommendations(),
  ]);

  // Apply filter from dashboard links
  const filteredSchedule = filter
    ? filter === "recovered"
      ? schedule.filter((a) => a.rebookedFromId != null)
      : schedule.filter((a) => a.status === filter)
    : schedule;

  const filterLabel =
    filter === "NO_SHOW"
      ? "No-Shows"
      : filter === "recovered"
        ? "Recovered Bookings"
        : null;

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
      {/* Interactive Schedule & Smart Waitlist */}
      <div className="flex-1 min-w-0 w-full">
        <FrontDeskScheduleClient
          schedule={filteredSchedule}
          filter={filter}
          filterLabel={filterLabel}
        />
      </div>

      {/* Continuity panel */}
      <div id="continuity" className="w-full xl:w-[380px] shrink-0">
        <div className="flex items-center gap-2.5 mb-5">
          <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Continuity
          </h2>
          {recommendations.length > 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: "#ef4444" }}
            >
              {recommendations.length}
            </span>
          )}
        </div>

        {recommendations.length === 0 ? (
          <div className="card p-8 text-center">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(16, 185, 129, 0.1)" }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "#10b981" }} />
            </div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              All caught up
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              No pending recommendations right now.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                background: "rgba(245, 158, 11, 0.06)",
                border: "1px solid rgba(245, 158, 11, 0.15)",
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#d97706" }} />
              <div>
                <h4 className="text-sm font-semibold" style={{ color: "#92400e" }}>
                  Action Required
                </h4>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "#b45309" }}>
                  Review and approve draft messages for recent no-shows.
                </p>
              </div>
            </div>
            {recommendations.map((rec) => (
              <div key={rec.id} className="stagger-item">
                <ApproveRecommendationCard rec={rec} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
