"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  FileText,
  Calendar,
  Plus,
  Activity,
  GitBranch,
} from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import OdontogramChart from "@/app/components/OdontogramChart";
import TreatmentPlanActions from "@/app/components/TreatmentPlanActions";
import PatientTimeline from "@/app/components/PatientTimeline";
import type { PatientDetail } from "@/lib/contract";

type ViewTab = "chart" | "timeline";

type Props = {
  patientId: string;
  patient: PatientDetail;
  upcomingAppointments: PatientDetail["appointments"];
  pastAppointments: PatientDetail["appointments"];
};

export default function PatientDetailTabs({
  patientId,
  patient,
  upcomingAppointments,
  pastAppointments,
}: Props) {
  const [activeTab, setActiveTab] = useState<ViewTab>("chart");

  return (
    <>
      {/* Tab Bar */}
      <div
        className="flex items-center rounded-xl p-1 gap-0.5 w-fit"
        style={{ background: "var(--raised)", border: "1px solid var(--line)" }}
      >
        <button
          onClick={() => setActiveTab("chart")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "chart"
              ? "bg-surface shadow-sm text-brand"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Chart & Plans
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "timeline"
              ? "bg-surface shadow-sm text-[#8b5cf6]"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Journey Timeline
        </button>
      </div>

      {/* Chart Tab */}
      {activeTab === "chart" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Clinical */}
          <div className="lg:col-span-2 space-y-6">
            {/* Odontogram */}
            <div className="card p-6 stagger-item">
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--ink)" }}>
                Clinical Charting
              </h2>
              <div className="rounded-xl p-4" style={{ background: "var(--raised)", border: "1px solid var(--line)" }}>
                <OdontogramChart findings={patient.toothFindings} />
              </div>
            </div>

            {/* Treatment Plans */}
            <div className="card p-6 stagger-item">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--ink)" }}>
                  <FileText className="w-5 h-5" style={{ color: "var(--ink-faint)" }} />
                  Treatment Plans
                </h2>
                <Link
                  href={`/patients/${patientId}/treatment-plans/new`}
                  className="flex items-center gap-1 text-[13px] font-semibold px-3 py-1.5 rounded-lg no-press"
                  data-no-press
                  style={{
                    color: "var(--brand)",
                    background: "rgb(var(--brand-rgb) / 0.08)",
                    transition: "background 150ms var(--ease-out)",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" /> New Plan
                </Link>
              </div>

              {patient.treatmentPlans.length === 0 ? (
                <div
                  className="text-center py-8 rounded-xl"
                  style={{
                    background: "var(--raised)",
                    border: "1px dashed var(--line-strong)",
                  }}
                >
                  <FileText className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--ink-faint)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
                    No treatment plans yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patient.treatmentPlans.map((tp) => (
                    <div
                      key={tp.id}
                      className="group rounded-xl p-4 stagger-item"
                      style={{
                        border: "1px solid var(--line)",
                        transition: "border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out)",
                      }}
                    >
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                              {tp.title}
                            </h3>
                            <StatusBadge status={tp.status} />
                            <StatusBadge status={tp.billingStatus} />
                          </div>
                          {tp.description && (
                            <p className="text-sm mt-2 line-clamp-2" style={{ color: "var(--ink-muted)" }}>
                              {tp.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: "var(--ink-faint)" }}>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(tp.proposedAt).toLocaleDateString()}
                            </span>
                            {tp.estimatedCost != null && (
                              <span
                                className="font-semibold px-2 py-0.5 rounded-md"
                                style={{
                                  background: "var(--raised)",
                                  color: "var(--ink)",
                                }}
                              >
                                ₹{tp.estimatedCost.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        </div>
                        <TreatmentPlanActions plan={tp} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Upcoming */}
            <div className="card p-5 stagger-item">
              <h2
                className="text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5"
                style={{ color: "var(--brand)" }}
              >
                <Clock className="w-3.5 h-3.5" /> Upcoming
              </h2>
              {upcomingAppointments.length === 0 && patient.recalls.length === 0 ? (
                <p className="text-sm italic" style={{ color: "var(--ink-faint)" }}>
                  No upcoming events.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className="relative pl-5 stagger-item"
                      style={{ borderLeft: "2px solid rgb(var(--brand-rgb) / 0.2)" }}
                    >
                      <div
                        className="absolute left-[-5px] top-[6px] w-2 h-2 rounded-full"
                        style={{ background: "var(--brand)", boxShadow: "0 0 0 3px rgb(var(--brand-rgb) / 0.1)" }}
                      />
                      <div
                        className="rounded-lg p-3"
                        style={{ background: "rgb(var(--brand-rgb) / 0.04)", border: "1px solid rgb(var(--brand-rgb) / 0.1)" }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                            {new Date(apt.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                          <StatusBadge status={apt.status} />
                        </div>
                        <span className="text-xs" style={{ color: "var(--brand)" }}>
                          {new Date(apt.startsAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {apt.reason && (
                          <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                            {apt.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {patient.recalls.map((r) => (
                    <div
                      key={r.id}
                      className="relative pl-5 stagger-item"
                      style={{ borderLeft: "2px solid rgb(var(--tone-amber) / 0.2)" }}
                    >
                      <div
                        className="absolute left-[-5px] top-[6px] w-2 h-2 rounded-full"
                        style={{ background: "#f59e0b", boxShadow: "0 0 0 3px rgb(var(--tone-amber) / 0.1)" }}
                      />
                      <div
                        className="rounded-lg p-3"
                        style={{ background: "rgb(var(--tone-amber) / 0.04)", border: "1px solid rgb(var(--tone-amber) / 0.1)" }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                            Recall Due
                          </span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{
                              background: new Date(r.dueAt) < new Date() ? "rgb(var(--tone-red) / 0.1)" : "rgb(var(--tone-amber) / 0.1)",
                              color: new Date(r.dueAt) < new Date() ? "var(--tone-red-ink)" : "var(--tone-amber-ink)",
                            }}
                          >
                            {new Date(r.dueAt) < new Date() ? "Overdue" : "Upcoming"}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: "#f59e0b" }}>
                          {new Date(r.dueAt).toLocaleDateString()}
                        </span>
                        <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                          {r.reason ?? "Scheduled recall"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            <div className="card p-5 stagger-item">
              <h2
                className="text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5"
                style={{ color: "var(--ink-faint)" }}
              >
                <Clock className="w-3.5 h-3.5" /> Visit History
              </h2>
              {pastAppointments.length === 0 ? (
                <p className="text-sm italic" style={{ color: "var(--ink-faint)" }}>
                  No past visits.
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {pastAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="relative pl-5 stagger-item"
                      style={{
                        borderLeft: `2px solid ${
                          apt.status === "NO_SHOW" ? "rgb(var(--tone-red) / 0.2)" : "var(--line)"
                        }`,
                      }}
                    >
                      <div
                        className="absolute left-[-5px] top-[6px] w-2 h-2 rounded-full"
                        style={{ background: apt.status === "NO_SHOW" ? "#ef4444" : "var(--ink-faint)" }}
                      />
                      <div
                        className="rounded-lg p-3"
                        style={{ background: "var(--raised)", border: "1px solid var(--line)" }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                            {new Date(apt.startsAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <StatusBadge status={apt.status} />
                        </div>
                        {apt.reason && (
                          <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                            {apt.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div className="card p-6">
          <PatientTimeline
            appointments={patient.appointments}
            treatmentPlans={patient.treatmentPlans}
            toothFindings={patient.toothFindings}
            messages={patient.recentMessages}
            recalls={patient.recalls}
            patientId={patientId}
          />
        </div>
      )}
    </>
  );
}
