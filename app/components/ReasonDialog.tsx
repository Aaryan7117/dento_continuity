"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

const QUICK_REASONS: Record<"CANCELLED" | "NO_SHOW", string[]> = {
  CANCELLED: ["Patient request", "Unwell", "Clinic rescheduled", "Doctor unavailable"],
  NO_SHOW: ["No answer on call", "Forgot", "Transport", "Cost concern"],
};

/** Asks why before a cancellation or no-show; the answer feeds the Retention Agent. */
export default function ReasonDialog({
  kind,
  patientName,
  pending,
  onConfirm,
  onClose,
}: {
  kind: "CANCELLED" | "NO_SHOW";
  patientName: string;
  pending: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const title = kind === "CANCELLED" ? "Cancel appointment" : "Flag no-show";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(reason.trim());
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl p-6 space-y-4 text-left border border-line-strong"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <p className="text-xs mt-1 text-ink-muted">{patientName}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS[kind].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setReason(q)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border"
              style={{
                borderColor: reason === q ? "var(--brand)" : "var(--line)",
                color: reason === q ? "var(--brand)" : "var(--ink-muted)",
                background: reason === q ? "rgb(var(--brand-rgb) / 0.08)" : "transparent",
              }}
            >
              {q}
            </button>
          ))}
        </div>

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          placeholder="Reason (optional)"
          autoFocus
          className="w-full px-3 py-2 rounded-xl text-sm outline-none bg-surface border border-line text-ink"
        />

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-line text-ink-muted"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-60"
            style={{ background: kind === "NO_SHOW" ? "#ef4444" : "var(--grad-brand)" }}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {title}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
