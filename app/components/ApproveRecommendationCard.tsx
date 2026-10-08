"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  approveRecommendation,
  dismissRecommendation,
} from "@/lib/actions";
import type { RecommendationWithContext } from "@/lib/contract";
import {
  Send,
  Calendar,
  MessageSquare,
  Sparkles,
  Edit2,
  Check,
} from "lucide-react";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export default function ApproveRecommendationCard({
  rec,
}: {
  rec: RecommendationWithContext;
}) {
  const [isPending, startTransition] = useTransition();
  const [editedMessage, setEditedMessage] = useState(rec.draftMessage);
  const [isEditing, setIsEditing] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return null;

  function exit(cb: () => void) {
    setExiting(true);
    setTimeout(cb, 220);
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

  const patientName = `${rec.patient.firstName} ${rec.patient.lastName}`;
  const estimatedVal = rec.estimatedValue ?? 620;

  // Format missed appointment date
  const missedDateStr = rec.missedAppointment?.startsAt
    ? new Date(rec.missedAppointment.startsAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Oct 7, 2026, 9:30 AM";

  const missedReasonStr = rec.missedAppointment?.reason || "Crown fitting — visit 2 of 3";

  return (
    <div
      className="card p-3.5 sm:p-4 space-y-3 bg-surface dark:bg-gradient-to-b dark:from-[#111B25] dark:to-[#152231] border border-line dark:border-[rgba(160,190,210,0.14)] dark:border-l-[3px] dark:border-l-[#00B8A9] rounded-2xl shadow-xs dark:shadow-[0_8px_24px_-4px_rgba(3,7,12,0.6)]"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(0.95)" : "scale(1)",
        transition: "opacity 200ms var(--ease-out), transform 200ms var(--ease-out)",
      }}
    >
      {/* Patient info header matching reference */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 dark:bg-[#4F8CFF]/15 dark:text-[#4F8CFF] font-bold text-xs flex items-center justify-center shrink-0 border border-sky-200/50 dark:border-[#4F8CFF]/30">
            {initials(patientName)}
          </div>
          <div>
            <h4 className="font-bold text-[13px] text-slate-900 dark:text-[#F4F8FA] leading-tight">
              {patientName}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-[#718295] mt-0.5">
              {rec.patient.phone}
            </p>
          </div>
        </div>

        {/* Value badge */}
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-[#42D7B5]/12 dark:text-[#42D7B5] border border-emerald-100 dark:border-[#42D7B5]/25 shadow-2xs">
          ₹{estimatedVal.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Agent reasoning box matching reference */}
      <div className="rounded-xl p-2.5 sm:p-3 bg-amber-50/60 dark:bg-[rgba(246,166,35,0.07)] border border-amber-200/60 dark:border-[rgba(246,166,35,0.25)]">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3 text-amber-600 dark:text-[#F6A623]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-[#F6A623]">
            AGENT REASONING
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-700 dark:text-[#F4F8FA]">
          {rec.reason}
        </p>
      </div>

      {/* Missed appointment info matching reference */}
      <div className="rounded-xl p-2 sm:p-2.5 bg-slate-50 dark:bg-[#152231] border border-slate-200/60 dark:border-[rgba(160,190,210,0.12)] flex items-start gap-2">
        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-[#42D7B5] mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-semibold text-slate-800 dark:text-[#F4F8FA] leading-tight">
            Missed: {missedDateStr}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-[#718295] mt-0.5">
            {missedReasonStr}
          </p>
        </div>
      </div>

      {/* Editable message matching reference */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-[#A7B7C7] flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-[#00B8A9]" />
            MESSAGE TO SEND ({rec.channel || "SMS"})
          </label>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-[10px] font-semibold text-emerald-600 dark:text-[#00B8A9] hover:text-emerald-700 dark:hover:text-[#12CFC0] transition-colors flex items-center gap-1"
          >
            {isEditing ? (
              <>
                <Check className="w-3 h-3" /> Done
              </>
            ) : (
              <>
                <Edit2 className="w-3 h-3" /> Edit
              </>
            )}
          </button>
        </div>
        <textarea
          className={`w-full rounded-xl px-3 py-2 text-[11px] leading-relaxed resize-none outline-none transition-all ${
            isEditing
              ? "bg-white dark:bg-[#111B25] border-2 border-teal-500 dark:border-[#00B8A9] shadow-xs dark:ring-2 dark:ring-[#00B8A9]/20"
              : "bg-slate-50 dark:bg-[#152231] border border-slate-200 dark:border-[rgba(160,190,210,0.12)] text-slate-700 dark:text-[#F4F8FA]"
          }`}
          rows={3}
          value={editedMessage}
          onChange={(e) => setEditedMessage(e.target.value)}
          disabled={isPending || !isEditing}
        />
      </div>

      {/* Actions matching reference: Approve & Send teal button + Dismiss button */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-1 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 dark:bg-[#00B8A9] dark:hover:bg-[#12CFC0] dark:active:bg-[#0E9F94] text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs dark:shadow-[0_4px_18px_rgba(0,184,169,0.35)] disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
          {isPending ? "Sending…" : "Approve & Send"}
        </button>
        <button
          onClick={handleDismiss}
          disabled={isPending}
          className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-[#152231] border border-slate-200 dark:border-[rgba(160,190,210,0.14)] text-slate-700 dark:text-[#A7B7C7] hover:bg-slate-50 dark:hover:bg-[#19283A] dark:hover:text-[#F4F8FA] transition-colors shadow-2xs disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
