"use client";

import { useState } from "react";
import {
  CalendarCheck,
  CalendarPlus,
  CircleDot,
  FileText,
  Sparkles,
  ThumbsUp,
  UserMinus,
} from "lucide-react";

const EVENTS = [
  {
    date: "12 Mar",
    kind: "Appointment",
    title: "Scale & polish completed",
    icon: CalendarCheck,
    tone: "var(--brand)",
    detail:
      "Chair 1 · Dr. Smith · 40 min. Encounter note signed the same day. Recall set for 6 months.",
  },
  {
    date: "12 Mar",
    kind: "Odontogram",
    title: "Caries charted — #23 distal",
    icon: CircleDot,
    tone: "#ef4444",
    detail:
      "Early enamel lesion on the distal surface of the upper left canine. Charted against FDI #23 during the same encounter.",
  },
  {
    date: "12 Mar",
    kind: "Treatment plan",
    title: "Plan proposed — ₹1,85,000",
    icon: FileText,
    tone: "#d4af37",
    detail:
      "Three stages: composite restoration #23, replacement of the #14 composite, and a whitening course. Billing state opens as pending.",
  },
  {
    date: "14 Mar",
    kind: "Treatment plan",
    title: "Patient accepted the plan",
    icon: ThumbsUp,
    tone: "#0ea5e9",
    detail:
      "Accepted at the front desk. State machine moves proposed → accepted; stage one is booked for 2 April.",
  },
  {
    date: "02 Apr",
    kind: "Exception",
    title: "No-show — stage one missed",
    icon: UserMinus,
    tone: "#ef4444",
    detail:
      "Appointment marked no_show at 15:10. ₹68,000 of accepted treatment now at risk, and the chair sat empty for 60 minutes.",
  },
  {
    date: "02 Apr",
    kind: "Retention Agent",
    title: "Follow-up drafted, then approved",
    icon: Sparkles,
    tone: "#d4af37",
    detail:
      "The agent read the accepted plan and the missed stage, drafted a message referencing both, and held it for review. Front desk approved it at 15:26 — nothing sends without a human.",
  },
  {
    date: "09 Apr",
    kind: "Recovered",
    title: "Rebooked — ₹68,000 recovered",
    icon: CalendarPlus,
    tone: "var(--brand)",
    detail:
      "Patient replied and took a Tuesday morning slot. The new appointment is linked back to the one it replaces, so the recovery is attributable.",
  },
];

export default function JourneyDemo() {
  const [open, setOpen] = useState(5);

  return (
    <ol className="relative flex h-full flex-col">
      {/* Spine */}
      <span
        aria-hidden
        className="absolute left-[13px] top-2 bottom-2 w-px"
        style={{ background: "var(--hairline)" }}
      />
      <span
        aria-hidden
        className="absolute left-[13px] top-2 w-px"
        style={{
          height: `${((open + 1) / EVENTS.length) * 100}%`,
          background: "linear-gradient(180deg, var(--teal), var(--gold))",
          transition: "height 560ms var(--ease-out)",
        }}
      />

      {EVENTS.map((e, i) => {
        const isOpen = open === i;
        return (
          <li key={e.title} className="relative pl-10">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-expanded={isOpen}
              className="w-full py-2 text-left"
            >
              <span
                aria-hidden
                className="absolute left-0 top-2.5 flex h-[27px] w-[27px] items-center justify-center rounded-[8px]"
                style={{
                  background: isOpen ? `${e.tone}22` : "var(--ash)",
                  border: `1px solid ${isOpen ? e.tone : "var(--hairline)"}`,
                  transition:
                    "background 380ms var(--ease-out), border-color 380ms var(--ease-out)",
                }}
              >
                <e.icon
                  className="h-3.5 w-3.5"
                  style={{
                    color: isOpen ? e.tone : "var(--ink-faint)",
                    transition: "color 380ms var(--ease-out)",
                  }}
                />
              </span>

              <span className="flex items-baseline gap-2">
                <span
                  className="numeral shrink-0 text-[11px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {e.date}
                </span>
                <span
                  className="text-[9px] uppercase"
                  style={{ letterSpacing: 0, color: e.tone }}
                >
                  {e.kind}
                </span>
              </span>
              <span
                className="mt-0.5 block text-[12.5px]"
                style={{
                  color: isOpen ? "var(--ink)" : "var(--ink-muted)",
                  transition: "color 300ms var(--ease-out)",
                }}
              >
                {e.title}
              </span>
            </button>

            <div
              className="overflow-hidden"
              style={{
                maxHeight: isOpen ? 130 : 0,
                opacity: isOpen ? 1 : 0,
                transition: "max-height 480ms var(--ease-out), opacity 340ms var(--ease-out)",
              }}
            >
              <p
                className="pb-3 pr-1 text-[11.5px] leading-relaxed"
                style={{ color: "var(--ink-faint)" }}
              >
                {e.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
