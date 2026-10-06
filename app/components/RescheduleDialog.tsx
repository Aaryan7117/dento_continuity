"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
import { rescheduleAppointment } from "@/lib/actions";

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function RescheduleDialog({
  appointmentId,
  patientName,
  startsAt,
  endsAt,
  onClose,
}: {
  appointmentId: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  onClose: () => void;
}) {
  const start = new Date(startsAt);
  const durationMs = new Date(endsAt).getTime() - start.getTime();

  const [date, setDate] = useState(toDateInput(start));
  const [time, setTime] = useState(toTimeInput(start));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newStart = new Date(`${date}T${time}`);
    if (Number.isNaN(newStart.getTime())) {
      setError("Enter a valid date and time.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await rescheduleAppointment({
        id: appointmentId,
        startsAt: newStart.toISOString(),
        // The visit keeps its length; only the start moves.
        endsAt: new Date(newStart.getTime() + durationMs).toISOString(),
      });

      if (res.ok) {
        toast.success(`Moved ${patientName}`, {
          description: newStart.toLocaleString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        onClose();
      } else {
        setError(res.error.message);
      }
    });
  }

  // Portalled to <body>: the schedule rows animate with transforms, which would
  // otherwise trap a fixed overlay inside the row.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={`Reschedule ${patientName}`}
        className="w-full max-w-sm rounded-2xl p-6 space-y-4 text-left bg-surface border border-line-strong"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div>
          <h3 className="text-base font-bold flex items-center gap-2 text-ink">
            <CalendarClock className="w-4 h-4 text-brand" /> Reschedule
          </h3>
          <p className="text-xs mt-1 text-ink-muted">{patientName}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5 text-[13px] font-semibold text-ink">
            Date
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm font-normal outline-none bg-surface border border-line text-ink"
            />
          </label>
          <label className="space-y-1.5 text-[13px] font-semibold text-ink">
            Time
            <input
              required
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm font-normal outline-none bg-surface border border-line text-ink"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-line text-ink-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-60"
            style={{ background: "var(--grad-brand)" }}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Move appointment
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
