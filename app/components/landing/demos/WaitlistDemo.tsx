"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, Loader2, RotateCcw, Zap } from "lucide-react";

interface Candidate {
  name: string;
  procedure: string;
  minutes: number;
  score: number;
  factors: { label: string; ok: boolean }[];
}

const GAP = { day: "Tue", time: "14:30", minutes: 60, chair: "Chair 2", was: "Ananya Iyer" };

/**
 * The factor chips mirror what the waitlist route actually ranks on — preferred
 * day, preferred time of day, and how long the patient has waited. Procedure and
 * duration are shown as context on each row because the front desk judges chair
 * fit, not the scorer. Nothing here claims a signal the product doesn't hold.
 */
const CANDIDATES: Candidate[] = [
  {
    name: "Priya Raghavan",
    procedure: "Composite restoration · #14",
    minutes: 45,
    score: 96,
    factors: [
      { label: "Prefers Tuesday", ok: true },
      { label: "Prefers afternoon", ok: true },
      { label: "Waiting 11 days", ok: true },
    ],
  },
  {
    name: "Rohit Deshpande",
    procedure: "Scale & polish",
    minutes: 30,
    score: 74,
    factors: [
      { label: "Prefers afternoon", ok: true },
      { label: "Tuesday not preferred", ok: false },
      { label: "Waiting 4 days", ok: true },
    ],
  },
  {
    name: "Kavya Menon",
    procedure: "Crown prep · #26",
    minutes: 90,
    score: 58,
    factors: [
      { label: "Any day, any time", ok: true },
      { label: "Waiting 2 days", ok: true },
    ],
  },
];

type Phase = "idle" | "scanning" | "filled";

export default function WaitlistDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [revealed, setRevealed] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const run = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("scanning");
    setRevealed(0);

    CANDIDATES.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => setRevealed(i + 1), 260 + i * 300),
      );
    });
    timers.current.push(setTimeout(() => setPhase("filled"), 260 + CANDIDATES.length * 300 + 420));
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
    setRevealed(0);
  };

  const winner = CANDIDATES[0];

  return (
    <div className="flex h-full flex-col">
      {/* The gap */}
      <div
        className="rounded-[8px] p-4"
        style={{
          background: phase === "filled" ? "rgb(var(--brand-rgb) / 0.08)" : "rgba(239,68,68,0.06)",
          border: `1px solid ${
            phase === "filled" ? "rgb(var(--brand-rgb) / 0.35)" : "rgba(239,68,68,0.25)"
          }`,
          transition:
            "background 520ms var(--ease-out), border-color 520ms var(--ease-out)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="numeral text-2xl" style={{ color: "var(--ink)" }}>
              {GAP.time}
            </span>
            <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              {GAP.day} · {GAP.minutes}m · {GAP.chair}
            </span>
          </div>
          <span
            className="rounded-[6px] px-2.5 py-1 text-[9.5px] font-semibold uppercase"
            style={{
              letterSpacing: 0,
              background: phase === "filled" ? "rgb(var(--brand-rgb) / 0.16)" : "rgba(239,68,68,0.14)",
              color: phase === "filled" ? "var(--teal-light)" : "#f87171",
            }}
          >
            {phase === "filled" ? "Filled" : "Cancelled"}
          </span>
        </div>

        <div
          className="mt-3 overflow-hidden"
          style={{
            height: phase === "filled" ? 44 : 22,
            transition: "height 520ms var(--ease-out)",
          }}
        >
          {phase === "filled" ? (
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[10px] font-semibold"
                style={{ background: "rgb(var(--brand-rgb) / 0.18)", color: "var(--teal-light)" }}
              >
                PR
              </span>
              <div>
                <p className="text-[12.5px] font-medium" style={{ color: "var(--ink)" }}>
                  {winner.name}
                </p>
                <p className="text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
                  {winner.procedure} · {winner.minutes}m
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[11.5px] line-through" style={{ color: "var(--ink-faint)" }}>
              {GAP.was} · Whitening consult
            </p>
          )}
        </div>
      </div>

      {/* Candidates */}
      <ul className="mt-3 flex-1 space-y-2">
        {CANDIDATES.map((c, i) => {
          const shown = revealed > i;
          const isWinner = phase === "filled" && i === 0;
          const removed = phase === "filled" && i === 0;
          return (
            <li
              key={c.name}
              className="rounded-xl px-3 py-2.5"
              style={{
                background: isWinner ? "rgba(212,175,55,0.07)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${isWinner ? "var(--gold-hairline)" : "var(--hairline)"}`,
                opacity: removed ? 0.45 : 1,
                transition:
                  "background 460ms var(--ease-out), border-color 460ms var(--ease-out), opacity 460ms var(--ease-out)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                    {c.name}
                  </p>
                  <p className="truncate text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
                    {c.procedure} · {c.minutes}m
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* Score meter */}
                  <div
                    className="h-1 w-14 overflow-hidden rounded-full"
                    style={{ background: "var(--glass-fill)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: shown ? `${c.score}%` : "0%",
                        background:
                          c.score >= 90
                            ? "linear-gradient(90deg,var(--teal-light),var(--gold-light))"
                            : c.score >= 60
                              ? "var(--teal)"
                              : "var(--ink-faint)",
                        transition: "width 620ms var(--ease-out)",
                      }}
                    />
                  </div>
                  <span
                    className="numeral w-7 text-right text-[13px]"
                    style={{
                      color: shown
                        ? c.score >= 90
                          ? "var(--gold-light)"
                          : "var(--ink-muted)"
                        : "transparent",
                      transition: "color 300ms var(--ease-out)",
                    }}
                  >
                    {shown ? c.score : "—"}
                  </span>
                </div>
              </div>

              {/* Factor chips for the match that wins */}
              <div
                className="flex flex-wrap gap-1.5 overflow-hidden"
                style={{
                  maxHeight: isWinner ? 56 : 0,
                  marginTop: isWinner ? 8 : 0,
                  opacity: isWinner ? 1 : 0,
                  transition:
                    "max-height 520ms var(--ease-out), margin-top 520ms var(--ease-out), opacity 520ms var(--ease-out)",
                }}
              >
                {c.factors.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px]"
                    style={{
                      background: f.ok ? "rgb(var(--brand-rgb) / 0.1)" : "rgba(239,68,68,0.1)",
                      color: f.ok ? "var(--teal-light)" : "#f87171",
                    }}
                  >
                    {f.ok ? <Check className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                    {f.label}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={phase === "filled" ? reset : run}
        disabled={phase === "scanning"}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] text-[12px] font-medium disabled:cursor-wait"
        style={
          phase === "filled"
            ? {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--hairline)",
                color: "var(--ink-muted)",
              }
            : {
                background: "var(--gold-wash)",
                border: "1px solid var(--gold-hairline)",
                color: "var(--gold-light)",
              }
        }
      >
        {phase === "scanning" ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Scoring waitlist…
          </>
        ) : phase === "filled" ? (
          <>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset demo
          </>
        ) : (
          <>
            <Zap className="h-3.5 w-3.5" />
            Rank the waitlist
          </>
        )}
      </button>
    </div>
  );
}
