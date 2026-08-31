"use client";

import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useReveal } from "./use-reveal";

/**
 * Every figure here has to survive a dentist asking "where does that come from?".
 * So: one number measured off the seeded demo dataset, and two that are
 * structural facts about the build rather than benchmarks.
 */
const METRICS = [
  {
    from: 0,
    to: 120000,
    prefix: "₹",
    suffix: "",
    label: "Recovered across the seeded dataset",
    note: "Every recovery traced back to a follow-up that a human approved before it sent.",
    tone: "var(--gold-light)",
  },
  {
    from: 0,
    to: 3,
    prefix: "",
    suffix: "",
    label: "Clicks from flagged no-show to approved follow-up",
    note: "The whole recovery path, start to finish, on the front-desk screen.",
    tone: "var(--teal-light)",
  },
  {
    from: 0,
    to: 10,
    prefix: "",
    suffix: "",
    label: "Finding types on the odontogram",
    note: "Charted per tooth in FDI notation, down to individual surfaces where it matters.",
    tone: "var(--ink)",
  },
];

export default function MetricsProof() {
  const { ref, shown } = useReveal<HTMLDivElement>(0.3);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setLive(true), 180);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <section className="relative mx-auto max-w-[1180px] px-6 py-16 sm:py-24">
      <div ref={ref} data-shown={shown} className="reveal">
        <div className="rule-fade" />
        <div className="grid gap-px sm:grid-cols-3">
          {METRICS.map((m) => (
            <div key={m.label} className="px-2 py-10 text-center sm:px-6">
              <div
                className="numeral text-[clamp(2.8rem,6vw,4.2rem)] leading-none"
                style={{ color: m.tone }}
              >
                {m.prefix}
                <NumberFlow value={live ? m.to : m.from} locales="en-IN" />
                {m.suffix}
              </div>
              <p
                className="mx-auto mt-4 max-w-[15rem] text-[13px]"
                style={{ color: "var(--ink-soft)" }}
              >
                {m.label}
              </p>
              <p
                className="mx-auto mt-2 max-w-[17rem] text-[11px] leading-relaxed"
                style={{ color: "var(--ink-faint)" }}
              >
                {m.note}
              </p>
            </div>
          ))}
        </div>
        <div className="rule-fade" />
      </div>
    </section>
  );
}
