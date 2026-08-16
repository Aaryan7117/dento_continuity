"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { changeAppointmentStatus } from "@/lib/actions";
import StatusBadge from "./StatusBadge";
import { ChevronDown, Check, CheckCircle2, UserX, XCircle, Clock, Loader2 } from "lucide-react";

const STATUS_OPTIONS: { status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED"; label: string; icon: any; color: string }[] = [
  { status: "SCHEDULED", label: "Scheduled", icon: Clock, color: "text-sky-600" },
  { status: "CONFIRMED", label: "Confirm Visit", icon: Check, color: "text-indigo-600" },
  { status: "COMPLETED", label: "Mark Completed", icon: CheckCircle2, color: "text-emerald-600" },
  { status: "NO_SHOW", label: "Flag No-Show (Agent)", icon: UserX, color: "text-red-600" },
  { status: "CANCELLED", label: "Cancel Appointment", icon: XCircle, color: "text-stone-500" },
];

export default function AppointmentRowActions({
  appointmentId,
  currentStatus,
  patientName,
  startsAt,
  onStatusChanged,
}: {
  appointmentId: string;
  currentStatus: string;
  patientName: string;
  startsAt?: string;
  onStatusChanged?: (newStatus: string, slotContext?: { day: string; time: string; label: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectStatus(newStatus: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED") {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    startTransition(async () => {
      const res = await changeAppointmentStatus({
        id: appointmentId,
        status: newStatus,
      });

      if (res.ok) {
        if (newStatus === "NO_SHOW") {
          toast.warning("No-Show flagged for " + patientName, {
            description: "Retention Agent has drafted a recovery message in the Continuity queue.",
          });
        } else if (newStatus === "COMPLETED") {
          toast.success("Appointment completed for " + patientName);
        } else if (newStatus === "CONFIRMED") {
          toast.success("Appointment confirmed for " + patientName);
        } else {
          toast.info("Status updated to " + newStatus.toLowerCase());
        }

        if (onStatusChanged) {
          const d = startsAt ? new Date(startsAt) : new Date();
          const dayName = d.toLocaleDateString(undefined, { weekday: "long" });
          const timePeriod = d.getHours() < 12 ? "morning" : "afternoon";
          const timeLabel = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
          onStatusChanged(newStatus, {
            day: dayName,
            time: timePeriod,
            label: `${dayName} ${timeLabel}`,
          });
        }
      } else {
        toast.error("Failed to update status", { description: res.error.message });
      }
    });
  }

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="inline-flex items-center gap-1 group py-0.5 px-1 rounded-lg hover:bg-stone-100/80 transition-colors cursor-pointer"
        title="Click to change appointment status"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-1 text-xs text-stone-500 font-medium px-2 py-0.5">
            <Loader2 className="w-3 h-3 animate-spin text-[#019d8e]" /> Updating…
          </span>
        ) : (
          <>
            <StatusBadge status={currentStatus} />
            <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-700 transition-transform group-hover:translate-y-0.5" />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 sm:left-0 top-full mt-1.5 w-48 rounded-xl shadow-xl z-50 overflow-hidden border border-stone-200/80 py-1"
          style={{
            background: "var(--surface)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
            Change Status
          </div>
          {STATUS_OPTIONS.map((opt) => {
            const isCurrent = opt.status === currentStatus;
            const Icon = opt.icon;
            return (
              <button
                key={opt.status}
                onClick={() => handleSelectStatus(opt.status)}
                className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                  isCurrent
                    ? "bg-[#019d8e]/10 text-[#019d8e]"
                    : "hover:bg-stone-50 text-stone-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
                  <span>{opt.label}</span>
                </div>
                {isCurrent && <Check className="w-3.5 h-3.5 text-[#019d8e]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
