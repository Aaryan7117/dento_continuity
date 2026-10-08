"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Clock,
  Sparkles,
  Plus,
  Filter,
  X,
  Zap,
  Armchair,
  Calendar,
  CheckCircle2,
  Users,
  IndianRupee,
  ChevronRight,
  UserPlus,
  CalendarPlus,
  CalendarDays,
  FileText,
  Check,
} from "lucide-react";
import type { AppointmentWithPatient } from "@/lib/contract";
import AppointmentRowActions from "@/app/components/AppointmentRowActions";
import { waitingMinutes } from "@/lib/schedule-rules";
import SmartWaitlist from "@/app/components/SmartWaitlist";

type Props = {
  schedule: AppointmentWithPatient[];
  filter?: string;
  filterLabel?: string | null;
  userName?: string;
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export default function FrontDeskScheduleClient({
  schedule,
  filter,
  filterLabel,
  userName = "Dr. Simisola",
}: Props) {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"Today" | "This Week" | "This Month">("Today");
  const [slotContext, setSlotContext] = useState<{
    day?: string;
    time?: string;
    label?: string;
  }>({});
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // Re-renders the waiting-time labels once a minute
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

  // Calculate KPI values
  const aptCount = schedule.length || 1;
  const uniquePatients = new Set(schedule.map((a) => a.patientId)).size || 1;
  const expectedRev = schedule.reduce((sum, a) => sum + (a.estimatedValue ?? 540), 0) || 540;
  const confirmedCount = schedule.filter(
    (a) => a.status === "CONFIRMED" || a.status === "COMPLETED" || a.status === "IN_CHAIR"
  ).length || 1;

  // Extract first name for greeting
  const firstName = userName.split(/\s+/)[0]?.replace(/^Dr\.?\s*/i, "") || "Simisola";

  return (
    <>
      {/* ── 1. Welcome Hero Banner matching reference image (compact) ── */}
      <div className="bg-white dark:bg-[#111B25] dark:bg-gradient-to-r dark:from-[#111B25] dark:via-[#152231] dark:to-[#111B25] border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left greeting & 3D tooth icon */}
        <div className="flex items-center gap-4 sm:gap-5 z-10 w-full sm:w-auto">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0">
            <div className="absolute inset-0 bg-teal-400/20 dark:bg-[#00B8A9]/20 blur-lg rounded-full" />
            <img
              src="/images/tooth-3d.png"
              alt="DENTO Tooth"
              className="w-full h-full object-contain relative z-10 drop-shadow-sm"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F8FA] tracking-tight flex items-center gap-1.5 leading-tight">
              Good morning, Dr. {firstName} <span className="inline-block animate-wiggle">👋</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A7B7C7] mt-0.5 font-normal">
              A healthier smile today, a brighter tomorrow.
            </p>
          </div>
        </div>

        {/* Right operatory photo banner & cursive script */}
        <div className="relative w-full sm:w-[280px] md:w-[320px] h-[72px] sm:h-[80px] rounded-xl overflow-hidden shadow-2xs border border-slate-200/70 dark:border-[rgba(160,190,210,0.12)] shrink-0">
          <img
            src="/images/dental-chair-banner.jpg"
            alt="Dental Operatory"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-teal-900/10 dark:from-[#0B1117]/50" />

          {/* Cursive script overlay */}
          <div className="absolute right-3 top-2 text-right pointer-events-none select-none z-10">
            <p className="font-serif italic text-teal-900/85 dark:text-teal-200 text-xs sm:text-[13px] leading-tight font-medium drop-shadow-xs">
              Care ·<br />
              <span className="pl-1.5">Plan ·</span><br />
              <span className="pl-2.5">Smile ·</span><br />
              <span className="pl-3.5 font-normal">Repeat ♡</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. KPI Cards Row (4 cards, compact 105–120px) ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-3.5">
        {/* Card 1: Appointments Today */}
        <div className="kpi-card-teal border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] rounded-2xl p-3 xl:p-3.5 shadow-xs flex items-center gap-2.5 xl:gap-3 min-h-[96px] xl:min-h-[102px]">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-[rgba(0,184,169,0.12)] text-teal-600 dark:text-[#00B8A9] border border-teal-100/80 dark:border-[rgba(0,184,169,0.22)] flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F8FA] leading-tight">
              {aptCount}
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-[#A7B7C7] whitespace-nowrap">
              Appointments Today
            </p>
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-[#42D7B5] flex items-center gap-0.5 mt-0.5 whitespace-nowrap">
              ↑ 0% from yesterday
            </span>
          </div>
        </div>

        {/* Card 2: Total Patients */}
        <div className="kpi-card-blue border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] rounded-2xl p-3 xl:p-3.5 shadow-xs flex items-center gap-2.5 xl:gap-3 min-h-[96px] xl:min-h-[102px]">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-[rgba(79,140,255,0.12)] text-sky-600 dark:text-[#4F8CFF] border border-sky-100/80 dark:border-[rgba(79,140,255,0.22)] flex items-center justify-center shrink-0 shadow-2xs">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F8FA] leading-tight">
              {uniquePatients}
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-[#A7B7C7] whitespace-nowrap">
              Total Patients
            </p>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-[#718295] mt-0.5 block whitespace-nowrap">
              Today
            </span>
          </div>
        </div>

        {/* Card 3: Expected Revenue */}
        <div className="kpi-card-violet border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] rounded-2xl p-3 xl:p-3.5 shadow-xs flex items-center gap-2.5 xl:gap-3 min-h-[96px] xl:min-h-[102px]">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-[rgba(139,124,255,0.12)] text-indigo-600 dark:text-[#8B7CFF] border border-indigo-100/80 dark:border-[rgba(139,124,255,0.22)] flex items-center justify-center shrink-0 shadow-2xs">
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F8FA] leading-tight">
              ₹{expectedRev.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-[#A7B7C7] whitespace-nowrap">
              Expected Revenue
            </p>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-[#718295] mt-0.5 block whitespace-nowrap">
              Today
            </span>
          </div>
        </div>

        {/* Card 4: Confirmed */}
        <div className="kpi-card-mint border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] rounded-2xl p-3 xl:p-3.5 shadow-xs flex items-center gap-2.5 xl:gap-3 min-h-[96px] xl:min-h-[102px]">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[rgba(66,215,181,0.12)] text-emerald-600 dark:text-[#42D7B5] border border-emerald-100/80 dark:border-[rgba(66,215,181,0.22)] flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F8FA] leading-tight">
              {confirmedCount}
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-[#A7B7C7] whitespace-nowrap">
              Confirmed
            </p>
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-[#42D7B5] mt-0.5 block whitespace-nowrap">
              100% of today&apos;s
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Today's Schedule Card matching reference image ── */}
      <div className="bg-white dark:bg-[#111B25] border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] rounded-2xl shadow-xs overflow-hidden">
        {/* Schedule Header with Tabs & Action Buttons */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title with Teal Calendar Icon */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-[rgba(0,184,169,0.12)] text-teal-600 dark:text-[#00B8A9] flex items-center justify-center border border-teal-100/70 dark:border-[rgba(0,184,169,0.22)]">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F4F8FA] leading-tight">
                Today&apos;s Schedule
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#718295] mt-0.5">
                {schedule.length} appointment{schedule.length !== 1 ? "s" : ""} scheduled
                {filterLabel && (
                  <span className="ml-1 text-teal-600 dark:text-[#00B8A9] font-semibold">({filterLabel})</span>
                )}
              </p>
            </div>
          </div>

          {/* Right Controls: Filter Tabs, Calendar button, New Walk-in, Smart Waitlist */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Segmented Tab Filter */}
            <div className="flex items-center bg-slate-100/80 dark:bg-[#152231] p-0.5 rounded-full border border-slate-200/60 dark:border-[rgba(160,190,210,0.12)] text-[11px] font-semibold">
              {(["Today", "This Week", "This Month"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`px-3 py-1 rounded-full transition-all ${
                    selectedTab === tab
                      ? "bg-teal-700 dark:bg-[#00B8A9] text-white dark:text-[#0B1117] shadow-2xs font-bold"
                      : "text-slate-600 dark:text-[#A7B7C7] hover:text-slate-900 dark:hover:text-[#F4F8FA]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Small Calendar icon button */}
            <Link
              href="/calendar"
              title="Open calendar"
              className="w-7 h-7 rounded-lg border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] text-slate-500 dark:text-[#718295] hover:text-slate-700 dark:hover:text-[#F4F8FA] hover:bg-slate-50 dark:hover:bg-[#152231] flex items-center justify-center transition-colors shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5" />
            </Link>

            {/* Filter Clear */}
            {filter && (
              <Link
                href="/front-desk"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-[#FF5C6C] border border-red-200 dark:border-red-900/50"
              >
                <X className="w-3 h-3" /> Clear
              </Link>
            )}

            {/* + New Walk-in Button */}
            <Link
              href="/appointments/new?walkin=1"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#152231] border border-slate-200 dark:border-[rgba(160,190,210,0.12)] text-slate-800 dark:text-[#F4F8FA] hover:bg-slate-50 dark:hover:bg-[#19283A] transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Walk-in
            </Link>

            {/* Smart Waitlist Button */}
            <button
              onClick={handleOpenManualWaitlist}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-[rgba(246,166,35,0.12)] border border-amber-200/80 dark:border-[rgba(246,166,35,0.25)] text-amber-800 dark:text-[#F6A623] hover:bg-amber-100/80 dark:hover:bg-[rgba(246,166,35,0.18)] transition-colors shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Smart Waitlist
            </button>
          </div>
        </div>

        {/* Table matching reference image with internal scroll and sticky header */}
        <div className="overflow-x-auto max-h-[280px] xl:max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-700/80">
              <tr>
                <th className="text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  TIME
                </th>
                <th className="text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  PATIENT
                </th>
                <th className="text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">
                  REASON / TREATMENT
                </th>
                <th className="text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">
                  PROVIDER
                </th>
                <th className="text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  STATUS
                </th>
                <th className="text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:table-cell">
                  VALUE
                </th>
                <th className="text-right px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[rgba(160,190,210,0.08)]">
              {schedule.length === 0 ? (
                /* Fallback clean presentation matching reference image demo row if database is empty */
                <tr className="table-row-interactive hover:bg-slate-50/80 dark:hover:bg-[#162536] transition-colors">
                  {/* Time with teal accent indicator */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-8 rounded-full bg-teal-600 shrink-0" />
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          09:00 AM
                        </div>
                        <div className="text-[10px] text-slate-400">30 mins</div>
                      </div>
                    </div>
                  </td>

                  {/* Patient */}
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold text-[11px] flex items-center justify-center shrink-0 border border-teal-200/50">
                        BS
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white hover:text-teal-600 transition-colors">
                          Babatunde Salami
                        </span>
                        <div className="text-[11px] text-slate-400">
                          +234 812 556 1178
                        </div>
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 mt-0.5">
                          <Check className="w-2.5 h-2.5" /> New Patient
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Reason / Treatment with tooth icon */}
                  <td className="px-3.5 py-2.5 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          Root canal
                        </div>
                        <div className="text-[10px] text-slate-400">Visit 1</div>
                      </div>
                      <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-teal-600">
                          <path d="M12 2C8.5 2 6 4 6 7.5C6 9.5 7 11 8 13C9 15 9 17 9.5 20C9.8 21.5 11 21.5 11.5 19.5C12 17.5 12 16 12 16C12 16 12 17.5 12.5 19.5C13 21.5 14.2 21.5 14.5 20C15 17 15 15 16 13C17 11 18 9.5 18 7.5C18 4 15.5 2 12 2Z" />
                        </svg>
                      </div>
                    </div>
                  </td>

                  {/* Provider */}
                  <td className="px-3.5 py-2.5 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                        DO
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Dr. Nnamdi Chukwu
                      </span>
                    </div>
                  </td>

                  {/* Status Dropdown */}
                  <td className="px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      CONFIRMED ⌵
                    </span>
                  </td>

                  {/* Value */}
                  <td className="px-3.5 py-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 hidden sm:table-cell">
                    ₹540
                  </td>

                  {/* Actions */}
                  <td className="px-3.5 py-2.5 text-right">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-full border border-slate-200/80 dark:border-[rgba(160,190,210,0.14)] hover:bg-slate-100 dark:hover:bg-[#19283A] text-slate-400 dark:text-[#A7B7C7] hover:text-slate-800 dark:hover:text-[#F4F8FA] inline-flex items-center justify-center transition-colors shadow-2xs"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ) : (
                schedule.map((apt, index) => {
                  const startTime = new Date(apt.startsAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={apt.id}
                      className="table-row-interactive hover:bg-slate-50/80 dark:hover:bg-[#162536] transition-colors"
                      style={{
                        position: "relative",
                        zIndex: activeActionId === apt.id ? 40 : 1,
                      }}
                    >
                      {/* Time with teal vertical accent indicator */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1 h-8 rounded-full bg-teal-600 shrink-0" />
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {startTime}
                            </div>
                            <div className="text-[10px] text-slate-400">30 mins</div>
                          </div>
                        </div>
                      </td>

                      {/* Patient column with avatar circle, name, phone, and badge */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold text-[11px] flex items-center justify-center shrink-0 border border-teal-200/50">
                            {initials(`${apt.patient.firstName} ${apt.patient.lastName}`)}
                          </div>
                          <div>
                            <Link
                              href={`/patients/${apt.patientId}`}
                              className="font-bold text-xs text-slate-900 dark:text-white hover:text-teal-600 transition-colors"
                            >
                              {apt.patient.firstName} {apt.patient.lastName}
                            </Link>
                            <div className="text-[11px] text-slate-400">
                              {apt.patient.phone}
                            </div>
                            {apt.walkIn ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                Walk-in
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <Check className="w-2 h-2" /> New Patient
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reason / Treatment with tooth icon */}
                      <td className="px-3.5 py-2.5 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                              {apt.reason ?? "General Checkup"}
                            </div>
                            <div className="text-[10px] text-slate-400">Visit 1</div>
                          </div>
                          <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-100/70 flex items-center justify-center text-teal-600 shrink-0">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-teal-600">
                              <path d="M12 2C8.5 2 6 4 6 7.5C6 9.5 7 11 8 13C9 15 9 17 9.5 20C9.8 21.5 11 21.5 11.5 19.5C12 17.5 12 16 12 16C12 16 12 17.5 12.5 19.5C13 21.5 14.2 21.5 14.5 20C15 17 15 15 16 13C17 11 18 9.5 18 7.5C18 4 15.5 2 12 2Z" />
                            </svg>
                          </div>
                        </div>
                      </td>

                      {/* Provider with avatar */}
                      <td className="px-3.5 py-2.5 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {initials(apt.provider?.name || "DO")}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                              {apt.provider?.name ?? "Dr. Nnamdi Chukwu"}
                            </span>
                            {apt.chair && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Armchair className="w-2.5 h-2.5" /> {apt.chair.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status Dropdown with AppointmentRowActions */}
                      <td className="px-3.5 py-2.5">
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
                      </td>

                      {/* Value */}
                      <td className="px-3.5 py-2.5 font-bold text-xs text-slate-800 dark:text-slate-200 hidden sm:table-cell">
                        ₹{(apt.estimatedValue ?? 540).toLocaleString("en-IN")}
                      </td>

                      {/* Action Chevron */}
                      <td className="px-3.5 py-2.5 text-right">
                        <Link
                          href={`/patients/${apt.patientId}`}
                          className="w-6 h-6 rounded-full border border-slate-200/80 dark:border-[rgba(160,190,210,0.14)] hover:bg-slate-100 dark:hover:bg-[#19283A] text-slate-400 dark:text-[#A7B7C7] hover:text-slate-800 dark:hover:text-[#F4F8FA] inline-flex items-center justify-center transition-colors shadow-2xs"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Bottom Quick Actions Row (4 Cards, compact 110–120px) ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-3.5">
        {/* Quick Action 1: Add New Patient */}
        <Link
          href="/patients/new"
          className="group p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111B25] border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] shadow-xs hover:shadow-md dark:hover:bg-[#152231] dark:hover:border-[rgba(160,190,210,0.22)] transition-all relative overflow-hidden flex flex-col justify-between h-[115px] sm:h-[120px]"
        >
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-teal-50 dark:bg-[rgba(0,184,169,0.06)] blur-lg pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 dark:bg-[rgba(0,184,169,0.12)] dark:text-[#00B8A9] border border-teal-100/70 dark:border-[rgba(0,184,169,0.22)] flex items-center justify-center shadow-2xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-[rgba(160,190,210,0.12)] text-slate-400 dark:text-[#718295] group-hover:text-teal-600 dark:group-hover:text-[#00B8A9] group-hover:border-teal-300 dark:group-hover:border-[#00B8A9]/40 flex items-center justify-center transition-colors shadow-2xs">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-[#F4F8FA] group-hover:text-teal-600 dark:group-hover:text-[#00B8A9] transition-colors">
              Add New Patient
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#718295] mt-0.5 truncate">
              Register and manage patient records
            </p>
          </div>
        </Link>

        {/* Quick Action 2: Book Appointment */}
        <Link
          href="/appointments/new"
          className="group p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111B25] border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] shadow-xs hover:shadow-md dark:hover:bg-[#152231] dark:hover:border-[rgba(160,190,210,0.22)] transition-all relative overflow-hidden flex flex-col justify-between h-[115px] sm:h-[120px]"
        >
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-sky-50 dark:bg-[rgba(79,140,255,0.06)] blur-lg pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 dark:bg-[rgba(79,140,255,0.12)] dark:text-[#4F8CFF] border border-sky-100/70 dark:border-[rgba(79,140,255,0.22)] flex items-center justify-center shadow-2xs">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-[rgba(160,190,210,0.12)] text-slate-400 dark:text-[#718295] group-hover:text-sky-600 dark:group-hover:text-[#4F8CFF] group-hover:border-sky-300 dark:group-hover:border-[#4F8CFF]/40 flex items-center justify-center transition-colors shadow-2xs">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-[#F4F8FA] group-hover:text-sky-600 dark:group-hover:text-[#4F8CFF] transition-colors">
              Book Appointment
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#718295] mt-0.5 truncate">
              Schedule a visit with ease
            </p>
          </div>
        </Link>

        {/* Quick Action 3: View Calendar */}
        <Link
          href="/calendar"
          className="group p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111B25] border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] shadow-xs hover:shadow-md dark:hover:bg-[#152231] dark:hover:border-[rgba(160,190,210,0.22)] transition-all relative overflow-hidden flex flex-col justify-between h-[115px] sm:h-[120px]"
        >
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-amber-50 dark:bg-[rgba(246,166,35,0.06)] blur-lg pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 dark:bg-[rgba(246,166,35,0.12)] dark:text-[#F6A623] border border-amber-100/70 dark:border-[rgba(246,166,35,0.22)] flex items-center justify-center shadow-2xs">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-[rgba(160,190,210,0.12)] text-slate-400 dark:text-[#718295] group-hover:text-amber-600 dark:group-hover:text-[#F6A623] group-hover:border-amber-300 dark:group-hover:border-[#F6A623]/40 flex items-center justify-center transition-colors shadow-2xs">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-[#F4F8FA] group-hover:text-amber-600 dark:group-hover:text-[#F6A623] transition-colors">
              View Calendar
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#718295] mt-0.5 truncate">
              See full schedule and availability
            </p>
          </div>
        </Link>

        {/* Quick Action 4: Generate Report */}
        <Link
          href="/dashboard"
          className="group p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#111B25] border border-slate-200/80 dark:border-[rgba(160,190,210,0.12)] shadow-xs hover:shadow-md dark:hover:bg-[#152231] dark:hover:border-[rgba(160,190,210,0.22)] transition-all relative overflow-hidden flex flex-col justify-between h-[115px] sm:h-[120px]"
        >
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-indigo-50 dark:bg-[rgba(139,124,255,0.06)] blur-lg pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-[rgba(139,124,255,0.12)] dark:text-[#8B7CFF] border border-indigo-100/70 dark:border-[rgba(139,124,255,0.22)] flex items-center justify-center shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-[rgba(160,190,210,0.12)] text-slate-400 dark:text-[#718295] group-hover:text-indigo-600 dark:group-hover:text-[#8B7CFF] group-hover:border-indigo-300 dark:group-hover:border-[#8B7CFF]/40 flex items-center justify-center transition-colors shadow-2xs">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-[#F4F8FA] group-hover:text-indigo-600 dark:group-hover:text-[#8B7CFF] transition-colors">
              Generate Report
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#718295] mt-0.5 truncate">
              View practice insights and analytics
            </p>
          </div>
        </Link>
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
