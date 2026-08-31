"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useReveal } from "./use-reveal";

/**
 * Feature lists are held to CLAUDE.md scope. In particular there is no
 * multi-site tier and no chair-count limits — the build is single-tenant and
 * models neither, so selling either would be selling something that isn't there.
 */
const TIERS = [
  {
    name: "Chairside",
    price: "₹4,999",
    cadence: "per month",
    blurb: "One clean clinical record, in place of paper and spreadsheets.",
    features: [
      "Patient registry with consent capture",
      "Appointments and the day's schedule",
      "Encounters, notes and signing",
      "Odontogram charting in FDI notation",
      "Imaging repository",
      "Treatment plans and billing state",
      "Read-only patient portal",
    ],
    featured: false,
  },
  {
    name: "Continuity",
    price: "₹9,999",
    cadence: "per month",
    blurb: "Adds the retention work — for practices that want missed visits chased.",
    features: [
      "Everything in Chairside",
      "Retention Agent — it drafts, it never sends",
      "Front-desk approval queue",
      "Smart waitlist for freed slots",
      "Chair utilisation heatmap",
      "Recall due dates",
      "Append-only audit log",
    ],
    featured: true,
  },
  {
    name: "Pilot",
    price: "Free",
    cadence: "during the pilot",
    blurb: "For the practices helping us get this right before general release.",
    features: [
      "Everything in Continuity",
      "Onboarding and migration off paper",
      "A direct line to the team building it",
      "Your protocols shape what ships next",
    ],
    featured: false,
  },
];

export default function PricingTiers() {
  const { ref, shown } = useReveal<HTMLDivElement>(0.12);

  return (
    <section id="pricing" className="relative mx-auto max-w-[1180px] scroll-mt-28 px-6 py-16 sm:py-20">
      <div ref={ref} data-shown={shown} className="reveal">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Pricing</span>
          <h2 className="display mt-5 text-[clamp(2rem,4.6vw,3.4rem)]">
            Simple plans for a serious <em>clinical operating system</em>.
          </h2>
          <p className="mt-5 text-[14.5px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Billed per practice, not per seat. Every plan includes the full clinical
            record — the difference is how much continuity work the system does for you.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-[8px] p-7"
              style={{
                background: tier.featured
                  ? "linear-gradient(155deg, rgba(216,184,104,0.16), rgba(18,16,13,0.94) 46%, rgba(8,9,9,0.98))"
                  : "var(--ash)",
                border: `1px solid ${tier.featured ? "var(--gold-hairline)" : "var(--hairline)"}`,
                boxShadow: tier.featured ? "var(--lift-2)" : "var(--lift-1)",
                color: tier.featured ? "#ffffff" : "var(--ink)",
              }}
            >
              {tier.featured && (
                <span
                  className="absolute -top-2.5 left-7 rounded-[6px] px-2.5 py-1 text-[9px] font-semibold uppercase"
                  style={{
                    background: "linear-gradient(140deg,#e5c368,#d4af37)",
                    color: "#100c02",
                  }}
                >
                  Most practices
                </span>
              )}

              <h3 className="display text-[1.6rem]" style={{ color: tier.featured ? "#ffffff" : "var(--ink)" }}>{tier.name}</h3>
              <p className="mt-1.5 text-[12px]" style={{ color: tier.featured ? "rgba(255,255,255,0.54)" : "var(--ink-faint)" }}>
                {tier.blurb}
              </p>

              <div className="mt-6 flex items-baseline gap-2">
                <span
                  className="numeral text-[2.4rem] leading-none"
                  style={{ color: tier.featured ? "var(--champagne)" : "var(--ink)" }}
                >
                  {tier.price}
                </span>
                <span className="text-[11px]" style={{ color: tier.featured ? "rgba(255,255,255,0.45)" : "var(--ink-faint)" }}>
                  {tier.cadence}
                </span>
              </div>

              <ul className="mt-7 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[12.5px]">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      style={{ color: tier.featured ? "var(--champagne)" : "var(--teal)" }}
                    />
                    <span style={{ color: tier.featured ? "rgba(255,255,255,0.74)" : "var(--ink-soft)" }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/front-desk"
                className={
                  tier.featured
                    ? "btn-gold mt-8 inline-flex h-11 items-center justify-center rounded-[8px] text-[12.5px]"
                    : "btn-glass mt-8 inline-flex h-11 items-center justify-center rounded-[8px] text-[12.5px]"
                }
              >
                {tier.featured ? "Start with Continuity" : `Choose ${tier.name}`}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
