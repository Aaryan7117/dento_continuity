"use client";

import { useState, useEffect } from "react";
import {
  Users, Clock, Phone, ArrowRight, X, Zap, Star,
  Calendar, Loader2, CheckCircle2, Plus,
} from "lucide-react";
import { toast } from "sonner";

type WaitlistCandidate = {
  id: string;
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  preferredDays: string | null;
  preferredTime: string | null;
  procedureType: string | null;
  estimatedMins: number | null;
  note: string | null;
  addedAt: string;
  waitDays: number;
  score: number;
};

type SmartWaitlistProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Day context from the cancelled/no-show slot */
  slotDay?: string;
  /** Time context: "morning" or "afternoon" */
  slotTime?: string;
  /** The original slot time for display */
  slotLabel?: string;
};

export default function SmartWaitlist({
  isOpen,
  onClose,
  slotDay,
  slotTime,
  slotLabel,
}: SmartWaitlistProps) {
  const [candidates, setCandidates] = useState<WaitlistCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const params = new URLSearchParams();
      if (slotDay) params.set("day", slotDay);
      if (slotTime) params.set("time", slotTime);

      fetch(`/api/waitlist?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          setCandidates(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, slotDay, slotTime]);

  async function handleSendOffer(candidate: WaitlistCandidate) {
    setSendingId(candidate.id);
    // Simulate sending a slot offer — in production this would use the Recommendation pipeline
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast.success(`Slot offer sent to ${candidate.patient.firstName} ${candidate.patient.lastName}`, {
      description: `Via SMS to ${candidate.patient.phone}`,
    });
    setSendingId(null);
    // Remove from list
    setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 scrim"
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col"
        style={{
          background: "var(--canvas)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-8px 0 32px var(--shadow-contact)",
          animation: "slideInRight 250ms var(--ease-drawer) forwards",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--ink)" }}>
              <Zap className="w-5 h-5" style={{ color: "#f59e0b" }} />
              Smart Waitlist
            </h2>
            {slotLabel && (
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                Fill the gap at <strong>{slotLabel}</strong>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-raised transition-colors"
          >
            <X className="w-4 h-4" style={{ color: "var(--ink-muted)" }} />
          </button>
        </div>

        {/* Candidates */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand)" }} />
              <p className="text-xs mt-3" style={{ color: "var(--ink-muted)" }}>
                Finding best-fit patients…
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--raised)" }}
              >
                <Users className="w-6 h-6" style={{ color: "var(--ink-faint)" }} />
              </div>
              <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                No patients on the waitlist
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ink-faint)" }}>
                Patients can be added from their chart or during booking.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ink-faint)" }}>
                {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} ranked by fit
              </p>
              {candidates.map((candidate, idx) => (
                <div
                  key={candidate.id}
                  className="rounded-xl p-4 stagger-item"
                  style={{
                    border: "1px solid var(--line)",
                    background: idx === 0 ? "rgb(var(--tone-amber) / 0.04)" : "var(--surface)",
                    transition: "transform 150ms var(--ease-out)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                        style={{
                          background: idx === 0
                            ? "linear-gradient(135deg, #f59e0b, #b45309)"
                            : "var(--grad-brand-deep)",
                        }}
                      >
                        {candidate.patient.firstName[0]}
                        {candidate.patient.lastName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                            {candidate.patient.firstName} {candidate.patient.lastName}
                          </span>
                          {idx === 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgb(var(--tone-amber) / 0.15)", color: "var(--tone-amber-ink)" }}>
                              <Star className="w-2.5 h-2.5" /> Best Match
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: "var(--ink-faint)" }}>
                          <Phone className="w-3 h-3" />
                          {candidate.patient.phone}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0"
                      style={{
                        background: candidate.score >= 80 ? "rgb(var(--tone-emerald) / 0.1)" : candidate.score >= 60 ? "rgb(var(--tone-sky) / 0.1)" : "var(--raised)",
                        color: candidate.score >= 80 ? "var(--tone-emerald-ink)" : candidate.score >= 60 ? "var(--tone-sky-ink)" : "var(--ink-faint)",
                      }}
                    >
                      {candidate.score}% fit
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {candidate.procedureType && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" style={{ color: "var(--brand)" }} />
                        {candidate.procedureType}
                      </span>
                    )}
                    {candidate.preferredDays && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {candidate.preferredDays}
                      </span>
                    )}
                    {candidate.preferredTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {candidate.preferredTime}
                      </span>
                    )}
                    {candidate.estimatedMins && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{candidate.estimatedMins} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      Waiting {candidate.waitDays} day{candidate.waitDays !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {candidate.note && (
                    <p className="text-[11px] mt-2 italic" style={{ color: "var(--ink-faint)" }}>
                      &ldquo;{candidate.note}&rdquo;
                    </p>
                  )}

                  {/* Action */}
                  <button
                    onClick={() => handleSendOffer(candidate)}
                    disabled={sendingId === candidate.id}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{
                      background: "var(--grad-brand)",
                    }}
                  >
                    {sendingId === candidate.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <ArrowRight className="w-3.5 h-3.5" />
                        Send Slot Offer
                      </>
                    )}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0.5;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
