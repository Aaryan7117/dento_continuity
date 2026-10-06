"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarClock, Clock, Sparkles, Plus, Filter, X, Zap, Armchair } from "lucide-react";
import type { AppointmentWithPatient } from "@/lib/contract";
import AppointmentRowActions from "@/app/components/AppointmentRowActions";
import { waitingMinutes } from "@/lib/schedule-rules";
import SmartWaitlist from "@/app/components/SmartWaitlist";

type Props = {
  schedule: AppointmentWithPatient[];
  filter?: string;
  filterLabel?: string | null;
};

export default function FrontDeskScheduleClient({
  schedule,
  filter,
  filterLabel,
}: Props) {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [slotContext, setSlotContext] = useState<{
    day?: string;
    time?: string;
    label?: string;
  }>({});
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  // Re-renders the waiting-time labels once a minute.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  function handleStatusChanged(
    newStatus: string,
    slot?: { day: string; time: string; label: string }
  ) {
    if (newStatus === "NO_SHOW" || newStatus === "CANCELLED") {
      // Auto-open Smart Waitlist with slot context
      if (slot) {
        setSlotContext(slot);
      }
      setWaitlistOpen(true);
    }
  }

  function handleOpenManualWaitlist() {
    setSlotContext({});
    setWaitlistOpen(true);
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--ink)" }}
          >
            <CalendarClock className="w-6 h-6" style={{ color: "var(--brand)" }} />
            Today&apos;s Schedule
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
            {schedule.length} appointment{schedule.length !== 1 ? "s" : ""}{" "}
            {filterLabel ? (
              <span className="inline-flex items-center gap-1">
                <Filter className="w-3 h-3" />
                filtered: <strong>{filterLabel}</strong>
              </span>
            ) : (
              "scheduled"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filter && (
            <Link
              href="/front-desk"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: "rgb(var(--tone-red) / 0.08)",
                color: "var(--tone-red-ink)",
                border: "1px solid rgb(var(--tone-red) / 0.15)",
              }}
            >
              <X className="w-3.5 h-3.5" />
              Clear Filter
            </Link>
          )}

          <button
            onClick={handleOpenManualWaitlist}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
            style={{
              background: "rgb(var(--tone-amber) / 0.1)",
              color: "var(--tone-amber-ink)",
              border: "1px solid rgb(var(--tone-amber) / 0.25)",
            }}
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            Smart Waitlist
          </button>

          <Link
            href="/appointments/new?walkin=1"
            className="inline-flex justify-center items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-semibold shadow-sm"
            style={{
              background: "var(--grad-brand)",
              transition: "opacity 150ms var(--ease-out)",
            }}
          >
            <Plus className="w-4 h-4" />
            New Walk-in
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {[
                  { label: "Time", icon: Clock, hide: "" },
                  { label: "Patient", hide: "" },
                  { label: "Reason", hide: "hidden md:table-cell" },
                  { label: "Provider", hide: "hidden lg:table-cell" },
                  { label: "Status", hide: "" },
                  { label: "Value", hide: "hidden sm:table-cell" },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={`text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${col.hide}`}
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                        style={{ background: "var(--raised)" }}
                      >
                        <CalendarClock
                          className="w-5 h-5"
                          style={{ color: "var(--ink-faint)" }}
                        />
                      </div>
                      <p
                        className="font-semibold text-sm"
                        style={{ color: "var(--ink)" }}
                      >
                        {filter
                          ? `No ${filterLabel?.toLowerCase()} found`
                          : "No appointments today"}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        {filter
                          ? "Try clearing the filter."
                          : "Your schedule is clear."}
                      </p>
                      {filter && (
                        <Link
                          href="/front-desk"
                          className="mt-3 px-3 py-1.5 bg-raised hover:bg-line text-ink text-xs font-semibold rounded-lg transition-colors"
                        >
                          Show all appointments
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {schedule.map((apt, index) => (
                <tr
                  key={apt.id}
                  className="stagger-row"
                  style={{
                    borderBottom: "1px solid var(--line)",
                    position: "relative",
                    zIndex: activeActionId === apt.id ? 40 : 1,
                    background:
                      apt.status === "NO_SHOW"
                        ? "rgb(var(--tone-red) / 0.03)"
                        : "transparent",
                  }}
                >
                  <td
                    className="px-5 py-4 whitespace-nowrap font-medium text-sm"
                    style={{ color: "var(--ink)" }}
                  >
                    {new Date(apt.startsAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/patients/${apt.patientId}`}
                      className="font-semibold text-sm no-press"
                      data-no-press
                      style={{
                        color: "var(--brand)",
                        transition: "color 150ms var(--ease-out)",
                      }}
                    >
                      {apt.patient.firstName} {apt.patient.lastName}
                    </Link>
                    {apt.walkIn && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md" style={{ background: "var(--raised)", color: "var(--ink-faint)" }}>
                        Walk-in
                      </span>
                    )}
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {apt.patient.phone}
                    </div>
                  </td>
                  <td
                    className="px-5 py-4 hidden md:table-cell"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {apt.reason ?? "—"}
                  </td>
                  <td
                    className="px-5 py-4 hidden lg:table-cell"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {apt.provider?.name ?? "—"}
                    {apt.chair && (
                      <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--ink-faint)" }}>
                        <Armchair className="w-3 h-3" /> {apt.chair.name}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AppointmentRowActions
                        appointmentId={apt.id}
                        currentStatus={apt.status}
                        patientName={`${apt.patient.firstName} ${apt.patient.lastName}`}
                        patientId={apt.patientId}
                        startsAt={apt.startsAt}
                        endsAt={apt.endsAt}
                        openUpward={index >= schedule.length - 2 && schedule.length > 2}
                        onStatusChanged={handleStatusChanged}
                        onOpenChange={(open) => setActiveActionId(open ? apt.id : null)}
                      />
                      {waitingMinutes(apt, now) !== null && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                          title={apt.status === "CHECKED_IN" ? "Waiting since arrival" : "Waited before the chair"}
                          style={{
                            background: apt.status === "CHECKED_IN" && waitingMinutes(apt, now)! >= 20 ? "rgb(var(--tone-red) / 0.1)" : "rgb(var(--tone-sky) / 0.1)",
                            color: apt.status === "CHECKED_IN" && waitingMinutes(apt, now)! >= 20 ? "var(--tone-red-ink)" : "var(--tone-sky-ink)",
                          }}
                        >
                          <Clock className="w-3 h-3" /> {waitingMinutes(apt, now)} min
                        </span>
                      )}
                      {apt.pendingRecommendationId && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                          style={{
                            background: "rgb(var(--tone-amber) / 0.1)",
                            color: "var(--tone-amber-ink)",
                            border: "1px solid rgb(var(--tone-amber) / 0.2)",
                          }}
                        >
                          <Sparkles className="w-3 h-3" /> Agent
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="px-5 py-4 font-medium hidden sm:table-cell"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {apt.estimatedValue != null
                      ? `₹${apt.estimatedValue.toLocaleString("en-IN")}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Smart Waitlist Drawer */}
      <SmartWaitlist
        isOpen={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        slotDay={slotContext.day}
        slotTime={slotContext.time}
        slotLabel={slotContext.label}
      />
    </>
  );
}
