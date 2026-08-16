"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  approveRecommendation,
  dismissRecommendation,
} from "@/lib/actions";
import type { RecommendationWithContext } from "@/lib/contract";

export default function ApproveRecommendationCard({
  rec,
}: {
  rec: RecommendationWithContext;
}) {
  const [isPending, startTransition] = useTransition();
  const [editedMessage, setEditedMessage] = useState(rec.draftMessage);
  const [exiting, setExiting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return null;

  function exit(cb: () => void) {
    setExiting(true);
    setTimeout(cb, 220); // match exit animation duration
  }

  function handleApprove() {
    startTransition(async () => {
      const result = await approveRecommendation({
        id: rec.id,
        editedMessage: editedMessage !== rec.draftMessage ? editedMessage : undefined,
      });
      if (result.ok) {
        toast.success(`Message sent to ${rec.patient.firstName} ${rec.patient.lastName}`);
        exit(() => setDone(true));
      } else {
        toast.error(result.error.message);
      }
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissRecommendation({ id: rec.id });
      if (result.ok) {
        toast("Recommendation dismissed", { description: `${rec.patient.firstName} ${rec.patient.lastName}` });
        exit(() => setDone(true));
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <div
      className="card p-5 space-y-4"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(0.95)" : "scale(1)",
        transition: "opacity 200ms var(--ease-out), transform 200ms var(--ease-out)",
      }}
    >
      {/* Patient info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            {rec.patient.firstName} {rec.patient.lastName}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {rec.patient.phone}
          </p>
        </div>
        {rec.estimatedValue != null && (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-lg"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "#047857",
            }}
          >
            ₦{rec.estimatedValue.toLocaleString()}
          </span>
        )}
      </div>

      {/* Agent reasoning */}
      <div
        className="rounded-xl p-3"
        style={{
          background: "rgba(245, 158, 11, 0.06)",
          border: "1px solid rgba(245, 158, 11, 0.15)",
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#b45309" }}>
          Agent reasoning
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "#92400e" }}>
          {rec.reason}
        </p>
      </div>

      {/* Missed appointment */}
      {rec.missedAppointment && (
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Missed:{" "}
          {new Date(rec.missedAppointment.startsAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {rec.missedAppointment.reason && ` — ${rec.missedAppointment.reason}`}
        </p>
      )}

      {/* Draft message (editable) */}
      <div>
        <label
          className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Message to send ({rec.channel})
        </label>
        <textarea
          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
          style={{
            background: "var(--surface-hover)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            transition: "border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out)",
          }}
          rows={3}
          value={editedMessage}
          onChange={(e) => setEditedMessage(e.target.value)}
          disabled={isPending}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#019d8e";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(1, 157, 142, 0.08)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 pt-1">
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-1 text-white text-sm font-semibold py-2.5 px-4 rounded-xl disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #019d8e, #067d73)",
            transition: "opacity 150ms var(--ease-out)",
          }}
        >
          {isPending ? "Sending…" : "Approve & Send"}
        </button>
        <button
          onClick={handleDismiss}
          disabled={isPending}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50"
          style={{
            background: "var(--surface-hover)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            transition: "background 150ms var(--ease-out)",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
