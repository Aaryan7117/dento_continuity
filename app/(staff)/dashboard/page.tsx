import { getDashboardSummary } from "@/lib/queries";
import Link from "next/link";
import {
  CalendarCheck,
  UserMinus,
  Activity,
  TrendingUp,
  AlertCircle,
  RefreshCcw,
  Wallet,
  ArrowRight,
} from "lucide-react";
import AnimatedNumber from "@/app/components/AnimatedNumber";
import ChairHeatmap from "@/app/components/ChairHeatmap";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardSummary();

  const cards = [
    {
      label: "Today's Appointments",
      value: stats.todayAppointmentCount,
      icon: CalendarCheck,
      accent: "#0ea5e9",
      accentBg: "rgba(14, 165, 233, 0.08)",
      href: "/front-desk",
    },
    {
      label: "No-Shows Today",
      value: stats.todayNoShowCount,
      icon: UserMinus,
      accent: stats.todayNoShowCount > 0 ? "#ef4444" : "#a8a29e",
      accentBg: stats.todayNoShowCount > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(168, 162, 158, 0.08)",
      href: "/front-desk?filter=NO_SHOW",
    },
    {
      label: "Pending Agent Tasks",
      value: stats.pendingRecommendationCount,
      icon: Activity,
      accent: stats.pendingRecommendationCount > 0 ? "#f59e0b" : "#a8a29e",
      accentBg: stats.pendingRecommendationCount > 0 ? "rgba(245, 158, 11, 0.08)" : "rgba(168, 162, 158, 0.08)",
      href: "/front-desk#continuity",
    },
    {
      label: "Recalls Due",
      value: stats.recallsDueCount,
      icon: RefreshCcw,
      accent: stats.recallsDueCount > 0 ? "#f59e0b" : "#a8a29e",
      accentBg: stats.recallsDueCount > 0 ? "rgba(245, 158, 11, 0.08)" : "rgba(168, 162, 158, 0.08)",
      href: "/patients?tab=recalls",
    },
    {
      label: "Outstanding Balances",
      value: stats.outstandingBalanceCount,
      icon: AlertCircle,
      accent: stats.outstandingBalanceCount > 0 ? "#ef4444" : "#a8a29e",
      accentBg: stats.outstandingBalanceCount > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(168, 162, 158, 0.08)",
      href: "/patients?tab=balances",
    },
    {
      label: "Recovered Revenue",
      value: stats.revenueRecovered,
      icon: Wallet,
      accent: "#10b981",
      accentBg: "rgba(16, 185, 129, 0.08)",
      isCurrency: true,
      href: "/front-desk?filter=recovered",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Practice Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Here&apos;s what&apos;s happening at your clinic today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card p-5 stagger-item group relative overflow-hidden"
            style={{
              transition: "transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out)",
            }}
            onMouseEnter={undefined}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  {card.label}
                </p>
                <div className="text-[28px] font-bold mt-1.5" style={{ color: "var(--foreground)" }}>
                  {card.isCurrency ? (
                    <AnimatedNumber value={card.value} prefix="₦" />
                  ) : (
                    <AnimatedNumber value={card.value} />
                  )}
                </div>
              </div>
              <div
                className="p-2.5 rounded-xl"
                style={{ background: card.accentBg }}
              >
                <card.icon className="w-5 h-5" style={{ color: card.accent }} />
              </div>
            </div>
            {/* Hover arrow indicator */}
            <div
              className="absolute bottom-4 right-4 flex items-center gap-1 text-xs font-semibold opacity-0 translate-x-1 group-hover:opacity-60 group-hover:translate-x-0"
              style={{
                color: card.accent,
                transition: "opacity 200ms var(--ease-out), transform 200ms var(--ease-out)",
              }}
            >
              View <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Chair Utilization Heatmap */}
      <ChairHeatmap />

      {/* Retention Agent impact banner */}
      {stats.recoveredAppointmentCount > 0 && (
        <div
          className="rounded-2xl p-7 relative overflow-hidden stagger-item"
          style={{
            background: "linear-gradient(135deg, #019d8e 0%, #0d524d 100%)",
          }}
        >
          {/* Decorative icon — subtle, not noisy */}
          <div className="absolute top-0 right-0 -mt-6 -mr-6 opacity-[0.06]">
            <TrendingUp className="w-48 h-48 text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Retention Agent Impact
            </h2>
            <p className="text-teal-100 mt-2 max-w-2xl leading-relaxed">
              Successfully recovered{" "}
              <strong className="text-white">
                {stats.recoveredAppointmentCount} appointment{stats.recoveredAppointmentCount !== 1 ? "s" : ""}
              </strong>{" "}
              worth{" "}
              <strong className="text-white">
                ₦{stats.revenueRecovered.toLocaleString()}
              </strong>{" "}
              in estimated revenue from no-shows.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
