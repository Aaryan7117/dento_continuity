"use client";

import { useState, useTransition, useRef, useEffect, type ComponentType } from "react";
import { toast } from "sonner";
import { changeAppointmentStatus, createPatientLink } from "@/lib/actions";
import {
  NEEDS_REASON,
  STATUS_LABEL,
  TRANSITIONS,
  TRANSITION_LABEL,
} from "@/lib/schedule-rules";
import type { AppointmentStatus } from "@/app/generated/prisma/enums";
import StatusBadge from "./StatusBadge";
import RescheduleDialog from "./RescheduleDialog";
import ReasonDialog from "./ReasonDialog";
import {
  Armchair,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Link2,
  Loader2,
  LogIn,
  Undo2,
  UserX,
  XCircle,
} from "lucide-react";

const ICON: Record<AppointmentStatus, { icon: ComponentType<{ className?: string }>; color: string }> = {
  SCHEDULED: { icon: Undo2, color: "text-status-scheduled" },
  CONFIRMED: { icon: Check, color: "text-status-confirmed" },
  CHECKED_IN: { icon: LogIn, color: "text-sky-600" },
  IN_CHAIR: { icon: Armchair, color: "text-indigo-600" },
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-600" },
  NO_SHOW: { icon: UserX, color: "text-red-600" },
  CANCELLED: { icon: XCircle, color: "text-ink-muted" },
};

const RESCHEDULABLE: readonly string[] = ["SCHEDULED", "CONFIRMED"];

export default function AppointmentRowActions({
  appointmentId,
  currentStatus,
  patientName,
  patientId,
  startsAt,
  endsAt,
  openUpward = false,
  onStatusChanged,
  onOpenChange,
}: {
  appointmentId: string;
  currentStatus: string;
  patientName: string;
  patientId?: string;
  startsAt?: string;
  endsAt?: string;
  openUpward?: boolean;
  onStatusChanged?: (newStatus: string, slotContext?: { day: string; time: string; label: string }) => void;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [askingReason, setAskingReason] = useState<"CANCELLED" | "NO_SHOW" | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  const status = currentStatus as AppointmentStatus;
  const options = TRANSITIONS[status] ?? [];
  const canReschedule = !!startsAt && !!endsAt && RESCHEDULABLE.includes(status);
  const hasMenu = options.length > 0 || canReschedule || !!patientId;

  function copyPatientLink() {
    if (!patientId) return;
    toggleOpen(false);
    startTransition(async () => {
      const res = await createPatientLink({ patientId, appointmentId });
      if (!res.ok) return void toast.error(res.error.message);
      try {
        await navigator.clipboard.writeText(res.data.url);
        toast.success("Patient link copied", { description: "Paste it into a message to the patient. Valid 30 days." });
      } catch {
        toast.info("Patient link", { description: res.data.url, duration: 15000 });
      }
    });
  }

  const toggleOpen = (next: boolean) => {
    setIsOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOpenChange]);

  function applyStatus(next: AppointmentStatus, reason?: string) {
    startTransition(async () => {
      const res = await changeAppointmentStatus({ id: appointmentId, status: next, reason });
      if (!res.ok) {
        toast.error("Could not update status", { description: res.error.message });
        return;
      }
      setAskingReason(null);

      if (next === "NO_SHOW") {
        toast.warning(`No-show flagged for ${patientName}`, {
          description: "The Retention Agent has drafted a follow-up in the Continuity queue.",
        });
      } else if (next === "CHECKED_IN") {
        toast.success(`${patientName} checked in`, { description: "Waiting time is now being tracked." });
      } else {
        toast.success(`${patientName}: ${STATUS_LABEL[next]}`);
      }

      if (onStatusChanged) {
        const d = startsAt ? new Date(startsAt) : new Date();
        const dayName = d.toLocaleDateString(undefined, { weekday: "long" });
        onStatusChanged(next, {
          day: dayName,
          time: d.getHours() < 12 ? "morning" : "afternoon",
          label: `${dayName} ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`,
        });
      }
    });
  }

  function handleSelect(next: AppointmentStatus) {
    toggleOpen(false);
    if (NEEDS_REASON.includes(next)) {
      setAskingReason(next as "CANCELLED" | "NO_SHOW");
      return;
    }
    applyStatus(next);
  }

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${isOpen ? "z-50" : "z-10"}`}>
      <button
        onClick={() => hasMenu && toggleOpen(!isOpen)}
        disabled={isPending || !hasMenu}
        className="inline-flex items-center gap-1 group py-0.5 px-1 rounded-lg hover:bg-raised/80 transition-colors cursor-pointer disabled:cursor-default"
        title={hasMenu ? "Change status" : STATUS_LABEL[status] ?? currentStatus}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted font-medium px-2 py-0.5">
            <Loader2 className="w-3 h-3 animate-spin text-brand" /> Updating…
          </span>
        ) : (
          <>
            <StatusBadge status={currentStatus} />
            {hasMenu && (
              <ChevronDown className="w-3 h-3 text-ink-faint group-hover:text-ink transition-transform group-hover:translate-y-0.5" />
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 sm:left-0 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } w-52 rounded-xl shadow-2xl z-50 overflow-hidden border border-line-strong py-1 bg-surface`}
          style={{
            backgroundColor: "var(--surface)",
            boxShadow: "0 10px 38px -10px rgba(0, 0, 0, 0.5), 0 10px 20px -15px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint border-b border-line">
            {STATUS_LABEL[status] ?? currentStatus}
          </div>
          {options.map((next) => {
            const { icon: Icon, color } = ICON[next];
            return (
              <button
                key={next}
                onClick={() => handleSelect(next)}
                className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-raised text-ink"
              >
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span>{TRANSITION_LABEL[next]}</span>
              </button>
            );
          })}
          {canReschedule && (
            <button
              onClick={() => {
                toggleOpen(false);
                setIsRescheduling(true);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-raised text-ink border-t border-line"
            >
              <CalendarClock className="w-3.5 h-3.5 text-brand" />
              <span>Reschedule…</span>
            </button>
          )}
          {patientId && (
            <button
              onClick={copyPatientLink}
              className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-raised text-ink border-t border-line"
            >
              <Link2 className="w-3.5 h-3.5 text-brand" />
              <span>Copy patient link</span>
            </button>
          )}
          {options.length === 0 && !canReschedule && !patientId && (
            <div className="px-3 py-2 text-xs text-ink-faint flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Nothing further
            </div>
          )}
        </div>
      )}

      {isRescheduling && startsAt && endsAt && (
        <RescheduleDialog
          appointmentId={appointmentId}
          patientName={patientName}
          startsAt={startsAt}
          endsAt={endsAt}
          onClose={() => setIsRescheduling(false)}
        />
      )}

      {askingReason && (
        <ReasonDialog
          kind={askingReason}
          patientName={patientName}
          pending={isPending}
          onConfirm={(reason) => applyStatus(askingReason, reason || undefined)}
          onClose={() => setAskingReason(null)}
        />
      )}
    </div>
  );
}
