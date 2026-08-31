"use client";

import type { ReactNode } from "react";
import { Zap, GitBranch, LayoutGrid } from "lucide-react";
import { useReveal } from "./use-reveal";
import WaitlistDemo from "./demos/WaitlistDemo";
import JourneyDemo from "./demos/JourneyDemo";
import HeatmapDemo from "./demos/HeatmapDemo";

interface Feature {
  id: string;
  index: string;
  eyebrow: string;
  title: ReactNode;
  body: string;
  icon: typeof Zap;
  points: string[];
  demo: ReactNode;
}

const FEATURES: Feature[] = [
  {
    id: "features",
    index: "01",
    eyebrow: "Smart Waitlist",
    title: (
      <>
        Fill tomorrow's gaps before they become losses.
      </>
    ),
    body: "When a slot opens, DENTO Continuity ranks everyone on the waitlist by how well they fit it — preferred day, preferred time of day, and how long they have already been waiting. The procedure and its duration sit on the same card, so the front desk can judge the chair fit at a glance.",
    icon: Zap,
    points: [
      "Ranked by slot fit, not just first-come order",
      "Procedure and duration shown against the length of the gap",
      "Every score shows the factors behind it — no black box",
    ],
    demo: <WaitlistDemo />,
  },
  {
    id: "journey",
    index: "02",
    eyebrow: "Patient Journey",
    title: (
      <>
        Every patient becomes one continuous story.
      </>
    ),
    body: "Appointments, odontogram findings, plans, billing state, and recovery messages stop living in separate corners. They become one chronological record your team can scan before the patient reaches the chair.",
    icon: GitBranch,
    points: [
      "Findings charted against FDI notation, in context",
      "Plan state machine visible end to end",
      "Recovered appointments link back to what they replaced",
    ],
    demo: <JourneyDemo />,
  },
  {
    id: "intelligence",
    index: "03",
    eyebrow: "Chair Utilisation",
    title: (
      <>
        See which chair hours sit empty.
      </>
    ),
    body: "A utilisation heatmap built from the appointments already in the book. Where the week is thin is visible at a glance, which makes extending the busy hours — and filling the quiet ones from the waitlist — an obvious decision rather than a hunch.",
    icon: LayoutGrid,
    points: [
      "Booked appointments per hour, across the whole week",
      "Busy and quiet blocks readable without reading numbers",
      "Quiet blocks are where the waitlist earns its keep",
    ],
    demo: <HeatmapDemo />,
  },
];

function FeatureRow({ feature, flip }: { feature: Feature; flip: boolean }) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      id={feature.id}
      data-shown={shown}
      className="reveal scroll-mt-28 py-16 sm:py-20 lg:py-24"
    >
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        {/* Copy */}
        <div className={`lg:col-span-5 ${flip ? "lg:order-2 lg:col-start-8" : ""}`}>
          <div className="flex items-center gap-3">
            <span className="numeral text-[13px]" style={{ color: "var(--gold)" }}>
              {feature.index}
            </span>
            <span className="h-px w-6" style={{ background: "var(--gold-hairline)" }} />
            <span className="eyebrow">{feature.eyebrow}</span>
          </div>

          <h3 className="display mt-5 text-[clamp(1.9rem,4vw,2.9rem)]">{feature.title}</h3>

          <p
            className="mt-5 text-[14.5px] leading-relaxed"
            style={{ color: "var(--ink-muted)" }}
          >
            {feature.body}
          </p>

          <ul className="mt-7 space-y-0">
            {feature.points.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 py-3 text-[13px]"
                style={{
                  borderTop: "1px solid var(--hairline)",
                  color: "var(--ink-soft)",
                }}
              >
                <span
                  className="mt-[7px] h-1 w-1 shrink-0 rounded-full"
                  style={{ background: "var(--gold)" }}
                />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Demo */}
        <div className={`lg:col-span-7 ${flip ? "lg:order-1 lg:col-start-1" : ""}`}>
          <div
            className="pane-solid relative overflow-hidden rounded-[8px] p-5 sm:p-6"
            style={{ boxShadow: "var(--lift-1)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24"
              style={{ background: "linear-gradient(90deg, transparent, rgba(216,184,104,0.12), transparent)" }}
            />
            <div className="relative flex items-center gap-2.5 pb-4">
              <feature.icon className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
              <span
                className="text-[9.5px] uppercase"
                style={{ letterSpacing: 0, color: "var(--ink-faint)" }}
              >
                Interactive demo
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--teal-light)" }}
                />
                <span className="text-[9.5px]" style={{ color: "var(--ink-faint)" }}>
                  Try it
                </span>
              </span>
            </div>
            <div className="relative">{feature.demo}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeatureShowcase() {
  return (
    <section className="relative mx-auto max-w-[1180px] px-6">
      <div className="rule-fade" />
      <div className="pt-16 text-center sm:pt-20">
        <span className="eyebrow">What it does</span>
        <h2 className="display mx-auto mt-5 max-w-2xl text-[clamp(2rem,4.6vw,3.4rem)]">
          The operating layer your front desk wished existed.
        </h2>
      </div>

      {FEATURES.map((f, i) => (
        <FeatureRow key={f.id} feature={f} flip={i % 2 === 1} />
      ))}
    </section>
  );
}
