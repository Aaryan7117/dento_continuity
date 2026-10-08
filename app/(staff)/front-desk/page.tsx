import { getTodaySchedule, getPendingRecommendations } from "@/lib/queries";
import ApproveRecommendationCard from "@/app/components/ApproveRecommendationCard";
import { AlertCircle, Sparkles, Shield, ArrowRight } from "lucide-react";
import FrontDeskScheduleClient from "./FrontDeskScheduleClient";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import type { RecommendationWithContext } from "@/lib/contract";

export const dynamic = "force-dynamic";

export default async function FrontDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const [schedule, recommendations, session] = await Promise.all([
    getTodaySchedule(),
    getPendingRecommendations(),
    getSession(),
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

  // Fallback demo recommendation matching reference image if none are currently in the database
  const demoFallbackRec: RecommendationWithContext = {
    id: "demo-marcus-delgado",
    patientId: "demo-marcus",
    appointmentId: "demo-apt",
    status: "PENDING",
    channel: "SMS",
    reason:
      "Marcus missed visit 2 of an accepted 3-visit crown plan and is currently wearing a temporary crown. He has attended all five previous appointments, so this is out of character. Leaving the temporary in place risks failure and rework, and ₹86,000 of the accepted plan is unbilled.",
    draftMessage:
      "Hi Marcus, we missed you this morning for your crown fitting with Dr. Adeleke. Since you're still in a temporary crown we'd like to get you rescheduled soon. We have openings Thursday or Friday — please let us know what works best for you.",
    estimatedValue: 620,
    approvedAt: null,
    approvedById: null,
    sentAt: null,
    dismissedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    patient: {
      id: "demo-marcus",
      firstName: "Marcus",
      lastName: "Delgado",
      phone: "+234 801 224 7788",
      dateOfBirth: "1981-05-12",
    },
    approvedBy: null,
    missedAppointment: {
      id: "demo-apt",
      patientId: "demo-marcus",
      providerId: "demo-provider",
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: "NO_SHOW",
      reason: "Crown fitting — visit 2 of 3",
      walkIn: false,
      rebookedFromId: null,
      chairId: null,
      checkedInAt: null,
      inChairAt: null,
      completedAt: null,
      cancellationReason: null,
      noShowReason: null,
      estimatedValue: 620,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const activeRecs =
    recommendations.length > 0 ? recommendations : [demoFallbackRec];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_360px] gap-4 xl:gap-5 items-start">
      {/* ── Main Center Workspace (Schedule & KPIs & Quick Actions) ── */}
      <div className="min-w-0 w-full space-y-3.5 xl:space-y-4">
        <FrontDeskScheduleClient
          schedule={filteredSchedule}
          filter={filter}
          filterLabel={filterLabel}
          userName={session?.name || "Dr. Simisola"}
        />
      </div>

      {/* ── Dedicated Right Continuity Intelligence Panel matching reference image ── */}
      <div id="continuity" className="w-full shrink-0 space-y-3.5 xl:sticky xl:top-2">
        {/* Continuity Header matching reference: Shield icon, "Continuity", badge count 1, View all → */}
        <div className="flex items-center justify-between pb-0.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-2xs">
              <Shield className="w-3.5 h-3.5 fill-teal-600/10" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Continuity
            </h2>
            <span className="w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
              {activeRecs.length}
            </span>
          </div>

          <Link
            href="/front-desk#continuity"
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 transition-colors flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Action Required Banner matching reference image */}
        <div className="rounded-xl p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <h4 className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              Action Required
            </h4>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-snug">
              Review and approve draft messages for recent no-shows.
            </p>
          </div>
        </div>

        {/* Render Recommendations list with smooth internal scroll */}
        <div className="space-y-3 max-h-[calc(100vh-160px)] overflow-y-auto pr-0.5">
          {activeRecs.map((rec) => (
            <div key={rec.id} className="stagger-item">
              <ApproveRecommendationCard rec={rec} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
