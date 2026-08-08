"use client";

import { useState, useTransition } from "react";
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
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) return null;

  function handleApprove() {
    startTransition(async () => {
      const result = await approveRecommendation({
        id: rec.id,
        editedMessage: editedMessage !== rec.draftMessage ? editedMessage : undefined,
      });
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error.message);
      }
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissRecommendation({ id: rec.id });
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error.message);
      }
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Patient info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">
            {rec.patient.firstName} {rec.patient.lastName}
          </p>
          <p className="text-sm text-gray-500">{rec.patient.phone}</p>
        </div>
        {rec.estimatedValue != null && (
          <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
            ₦{rec.estimatedValue.toLocaleString()}
          </span>
        )}
      </div>

      {/* Reason */}
      <div className="bg-amber-50 border border-amber-200 rounded p-2">
        <p className="text-xs font-medium text-amber-700 mb-1">
          Agent reasoning
        </p>
        <p className="text-sm text-amber-900">{rec.reason}</p>
      </div>

      {/* Missed appointment */}
      {rec.missedAppointment && (
        <p className="text-xs text-gray-500">
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
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Message to send ({rec.channel})
        </label>
        <textarea
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          value={editedMessage}
          onChange={(e) => setEditedMessage(e.target.value)}
          disabled={isPending}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Sending…" : "Approve & Send"}
        </button>
        <button
          onClick={handleDismiss}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
