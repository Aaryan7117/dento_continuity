"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, X, ArrowRight } from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import type { AppointmentWithPatient } from "@/lib/contract";

export default function InteractiveCalendarClient({
  initialAppointments,
}: {
  initialAppointments: AppointmentWithPatient[];
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  function prevMonth() {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  }

  function goToToday() {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.getDate());
  }

  const { blanks, days, appointmentsByDay } = useMemo(() => {
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const firstDayOfWeek = startOfMonth.getDay();
    const blanksArr = Array(firstDayOfWeek).fill(null);
    const daysArr = Array.from({ length: endOfMonth.getDate() }, (_, i) => i + 1);

    const byDay: Record<number, AppointmentWithPatient[]> = {};
    initialAppointments.forEach((apt) => {
      const aptDate = new Date(apt.startsAt);
      if (aptDate.getFullYear() === currentYear && aptDate.getMonth() === currentMonth) {
        const d = aptDate.getDate();
        if (!byDay[d]) byDay[d] = [];
        byDay[d].push(apt);
      }
    });

    return { blanks: blanksArr, days: daysArr, appointmentsByDay: byDay };
  }, [currentYear, currentMonth, initialAppointments]);

  const selectedDayAppointments = selectedDay ? appointmentsByDay[selectedDay] || [] : [];
  const realToday = new Date();
  const isCurrentMonth = realToday.getFullYear() === currentYear && realToday.getMonth() === currentMonth;

  return (
    <div className="space-y-5">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
            {monthName} {currentYear}
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Month Navigation Controls */}
          <div
            className="flex items-center rounded-xl overflow-hidden shrink-0"
            style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
          >
            <button
              onClick={prevMonth}
              className="px-3 py-2 text-ink-muted hover:bg-canvas transition-colors border-r border-line"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-[13px] font-semibold text-ink hover:bg-canvas transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="px-3 py-2 text-ink-muted hover:bg-canvas transition-colors border-l border-line"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Link
            href="/appointments/new"
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-white rounded-xl text-sm font-semibold w-full sm:w-auto shrink-0 shadow-sm hover:opacity-95 transition-opacity"
            style={{ background: "var(--grad-brand)" }}
          >
            <Plus className="w-4 h-4" />
            Schedule
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 card overflow-hidden">
          {/* Weekday headers */}
          <div
            className="grid grid-cols-7 bg-canvas/50"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-faint"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 auto-rows-[115px]">
            {blanks.map((_, i) => (
              <div
                key={`blank-${i}`}
                className="p-2 bg-canvas/40"
                style={{
                  borderBottom: "1px solid var(--line)",
                  borderRight: "1px solid var(--line)",
                }}
              />
            ))}

            {days.map((day, idx) => {
              const dayAppointments = appointmentsByDay[day] || [];
              const isToday = isCurrentMonth && day === realToday.getDate();
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`p-2 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-brand/5 ring-2 ring-inset ring-brand/30"
                      : isToday
                      ? "bg-brand/3 hover:bg-brand/10"
                      : "hover:bg-canvas/80 bg-surface"
                  }`}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    borderRight: "1px solid var(--line)",
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "text-white pulse-today"
                          : isSelected
                          ? "bg-ink text-canvas"
                          : "text-ink"
                      }`}
                      style={{
                        background: isToday
                          ? "var(--grad-brand)"
                          : undefined,
                      }}
                    >
                      {day}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-raised text-ink-muted">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-y-auto max-h-[70px] pr-0.5">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className="px-1.5 py-[2px] text-[10px] rounded truncate font-medium bg-brand/10 text-brand border border-brand/20"
                      >
                        {new Date(apt.startsAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {apt.patient.firstName} {apt.patient.lastName[0]}.
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <span className="block text-[9px] font-bold text-ink-faint pl-1">
                        +{dayAppointments.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Inspector Panel */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="font-bold text-sm text-ink flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-brand" />
                {selectedDay ? `${monthName} ${selectedDay}, ${currentYear}` : "Select a day"}
              </h3>
              <p className="text-xs text-ink-faint mt-0.5">
                {selectedDayAppointments.length} appointment{selectedDayAppointments.length !== 1 ? "s" : ""}
              </p>
            </div>
            {selectedDay && (
              <Link
                href="/appointments/new"
                className="p-1.5 bg-brand/10 text-brand hover:bg-brand/20 rounded-lg transition-colors"
                title="Book appointment on this day"
              >
                <Plus className="w-4 h-4" />
              </Link>
            )}
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {selectedDayAppointments.length === 0 ? (
              <div className="p-6 text-center text-ink-faint">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-ink-muted">No bookings for this date</p>
                <p className="text-[11px] text-ink-faint mt-0.5">Click &ldquo;Schedule&rdquo; to add a new visit.</p>
                <Link
                  href="/appointments/new"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  Schedule visit <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              selectedDayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3 rounded-xl border border-line bg-canvas/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">
                      {new Date(apt.startsAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <StatusBadge status={apt.status} />
                  </div>

                  <Link
                    href={`/patients/${apt.patientId}`}
                    className="flex items-center gap-2 text-xs font-semibold text-ink hover:text-brand transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-ink-faint" />
                    {apt.patient.firstName} {apt.patient.lastName}
                  </Link>

                  {apt.reason && (
                    <p className="text-[11px] text-ink-muted line-clamp-1">{apt.reason}</p>
                  )}

                  {apt.estimatedValue != null && (
                    <div className="text-[11px] font-medium text-emerald-700">
                      Est. Value: ₹{apt.estimatedValue.toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
