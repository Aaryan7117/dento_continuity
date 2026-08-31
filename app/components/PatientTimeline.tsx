"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar, Activity, FileText, MessageSquare,
  Stethoscope, AlertTriangle, CheckCircle2, X as XIcon,
  ChevronDown, ChevronUp, Clock,
} from "lucide-react";

// Types for timeline events — all merged from the patient detail data
type TimelineEvent = {
  id: string;
  type: "appointment" | "finding" | "treatment" | "message" | "recall";
  date: string;
  title: string;
  description?: string;
  status?: string;
  color: string;
  bgColor: string;
  icon: typeof Calendar;
  linkHref?: string;
  metadata?: Record<string, string>;
};

type PatientTimelineProps = {
  appointments: {
    id: string;
    startsAt: string;
    status: string;
    reason: string | null;
    patientId: string;
  }[];
  treatmentPlans: {
    id: string;
    title: string;
    status: string;
    billingStatus: string;
    estimatedCost: number | null;
    proposedAt: string;
    description: string | null;
  }[];
  toothFindings: {
    id: string;
    toothCode: number;
    finding: string;
    surfaces: string[];
    note: string | null;
    chartedAt: string;
  }[];
  messages: {
    id: string;
    channel: string;
    direction: string;
    body: string;
    sentAt: string;
  }[];
  recalls: {
    id: string;
    dueAt: string;
    reason: string | null;
    completedAt: string | null;
  }[];
  patientId: string;
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  COMPLETED: { color: "#10b981", bg: "rgb(var(--tone-emerald) / 0.1)" },
  SCHEDULED: { color: "#0ea5e9", bg: "rgb(var(--tone-sky) / 0.1)" },
  CONFIRMED: { color: "var(--brand)", bg: "rgb(var(--brand-rgb) / 0.1)" },
  NO_SHOW: { color: "#ef4444", bg: "rgb(var(--tone-red) / 0.1)" },
  CANCELLED: { color: "var(--ink-faint)", bg: "rgb(var(--tone-neutral) / 0.1)" },
  PROPOSED: { color: "#0ea5e9", bg: "rgb(var(--tone-sky) / 0.1)" },
  ACCEPTED: { color: "var(--brand)", bg: "rgb(var(--brand-rgb) / 0.1)" },
};

export default function PatientTimeline({
  appointments,
  treatmentPlans,
  toothFindings,
  messages,
  recalls,
  patientId,
}: PatientTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const events: TimelineEvent[] = useMemo(() => {
    const all: TimelineEvent[] = [];

    // Appointments
    for (const apt of appointments) {
      all.push({
        id: `apt-${apt.id}`,
        type: "appointment",
        date: apt.startsAt,
        title: apt.reason || "Appointment",
        status: apt.status,
        color: STATUS_COLORS[apt.status]?.color || "var(--ink-faint)",
        bgColor: STATUS_COLORS[apt.status]?.bg || "rgb(var(--tone-neutral) / 0.1)",
        icon: Calendar,
        metadata: {
          Time: new Date(apt.startsAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
          Status: apt.status.replace("_", " "),
        },
      });
    }

    // Treatment Plans
    for (const tp of treatmentPlans) {
      all.push({
        id: `tp-${tp.id}`,
        type: "treatment",
        date: tp.proposedAt,
        title: tp.title,
        description: tp.description || undefined,
        status: tp.status,
        color: STATUS_COLORS[tp.status]?.color || "#0ea5e9",
        bgColor: STATUS_COLORS[tp.status]?.bg || "rgb(var(--tone-sky) / 0.1)",
        icon: FileText,
        metadata: {
          Status: tp.status,
          Billing: tp.billingStatus,
          ...(tp.estimatedCost != null ? { Cost: `₹${tp.estimatedCost.toLocaleString("en-IN")}` } : {}),
        },
      });
    }

    // Tooth Findings
    for (const tf of toothFindings) {
      all.push({
        id: `tf-${tf.id}`,
        type: "finding",
        date: tf.chartedAt,
        title: `Tooth ${tf.toothCode}: ${tf.finding.replace("_", " ")}`,
        description: tf.note || undefined,
        color: "#f59e0b",
        bgColor: "rgb(var(--tone-amber) / 0.1)",
        icon: Stethoscope,
        metadata: {
          Surfaces: tf.surfaces.length > 0 ? tf.surfaces.join(", ") : "Whole tooth",
        },
      });
    }

    // Messages
    for (const msg of messages) {
      all.push({
        id: `msg-${msg.id}`,
        type: "message",
        date: msg.sentAt,
        title: `${msg.direction === "OUTBOUND" ? "Sent" : "Received"} via ${msg.channel}`,
        description: msg.body.length > 120 ? msg.body.slice(0, 120) + "…" : msg.body,
        color: "#8b5cf6",
        bgColor: "rgb(var(--tone-violet) / 0.1)",
        icon: MessageSquare,
        metadata: {
          Direction: msg.direction,
          Channel: msg.channel,
        },
      });
    }

    // Recalls
    for (const r of recalls) {
      const isOverdue = !r.completedAt && new Date(r.dueAt) < new Date();
      all.push({
        id: `recall-${r.id}`,
        type: "recall",
        date: r.dueAt,
        title: r.reason || "Scheduled recall",
        status: r.completedAt ? "COMPLETED" : isOverdue ? "OVERDUE" : "UPCOMING",
        color: r.completedAt ? "#10b981" : isOverdue ? "#ef4444" : "#f59e0b",
        bgColor: r.completedAt
          ? "rgb(var(--tone-emerald) / 0.1)"
          : isOverdue
            ? "rgb(var(--tone-red) / 0.1)"
            : "rgb(var(--tone-amber) / 0.1)",
        icon: r.completedAt ? CheckCircle2 : isOverdue ? AlertTriangle : Clock,
      });
    }

    // Sort by date, newest first
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return all;
  }, [appointments, treatmentPlans, toothFindings, messages, recalls]);

  const visibleEvents = events.slice(0, visibleCount);
  const hasMore = visibleCount < events.length;

  // Group by month/year
  const grouped = useMemo(() => {
    const groups: { label: string; events: TimelineEvent[] }[] = [];
    let currentLabel = "";

    for (const evt of visibleEvents) {
      const d = new Date(evt.date);
      const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      if (label !== currentLabel) {
        groups.push({ label, events: [evt] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].events.push(evt);
      }
    }

    return groups;
  }, [visibleEvents]);

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--raised)" }}
        >
          <Activity className="w-6 h-6" style={{ color: "var(--ink-faint)" }} />
        </div>
        <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
          No events yet
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--ink-faint)" }}>
          Appointments, findings, and treatment plans will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: "var(--ink-muted)" }}>
        {[
          { type: "appointment", label: "Appointments", color: "var(--brand)" },
          { type: "finding", label: "Findings", color: "#f59e0b" },
          { type: "treatment", label: "Treatments", color: "#0ea5e9" },
          { type: "message", label: "Messages", color: "#8b5cf6" },
          { type: "recall", label: "Recalls", color: "#ef4444" },
        ].map((cat) => {
          const count = events.filter((e) => e.type === cat.type).length;
          if (count === 0) return null;
          return (
            <span key={cat.type} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
              {count} {cat.label}
            </span>
          );
        })}
        <span className="ml-auto font-medium" style={{ color: "var(--ink-faint)" }}>
          {events.length} total events
        </span>
      </div>

      {/* Timeline */}
      {grouped.map((group) => (
        <div key={group.label}>
          {/* Month heading */}
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>
              {group.label}
            </h3>
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
          </div>

          <div className="relative pl-6">
            {/* Vertical line */}
            <div
              className="absolute left-[9px] top-2 bottom-2 w-px"
              style={{ background: "var(--line)" }}
            />

            <div className="space-y-3">
              {group.events.map((evt) => {
                const isExpanded = expandedId === evt.id;
                return (
                  <div
                    key={evt.id}
                    className="relative cursor-pointer group"
                    onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                  >
                    {/* Dot on timeline */}
                    <div
                      className="absolute -left-6 top-3.5 w-[18px] h-[18px] rounded-full flex items-center justify-center z-10"
                      style={{
                        background: evt.bgColor,
                        border: `2px solid ${evt.color}`,
                      }}
                    >
                      <evt.icon className="w-2.5 h-2.5" style={{ color: evt.color }} />
                    </div>

                    {/* Event card */}
                    <div
                      className="rounded-xl p-3.5 transition-all duration-150"
                      style={{
                        background: isExpanded ? evt.bgColor : "var(--surface)",
                        border: `1px solid ${isExpanded ? evt.color + "30" : "var(--line)"}`,
                        transition: "background 180ms var(--ease-out), border-color 180ms var(--ease-out)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                              {evt.title}
                            </span>
                            {evt.status && (
                              <span
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase"
                                style={{ background: evt.bgColor, color: evt.color }}
                              >
                                {evt.status.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] mt-1 block" style={{ color: "var(--ink-faint)" }}>
                            {new Date(evt.date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {" · "}
                            {new Date(evt.date).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className="p-1 rounded-md transition-colors"
                          style={{
                            color: "var(--ink-faint)",
                          }}
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${evt.color}20` }}>
                          {evt.description && (
                            <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                              {evt.description}
                            </p>
                          )}
                          {evt.metadata && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {Object.entries(evt.metadata).map(([k, v]) => (
                                <span key={k} className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
                                  <strong style={{ color: "var(--ink-muted)" }}>{k}:</strong> {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + 20)}
          className="w-full py-3 rounded-xl text-xs font-semibold transition-all hover:bg-raised"
          style={{
            color: "var(--brand)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          Show {Math.min(20, events.length - visibleCount)} more events
        </button>
      )}
    </div>
  );
}
