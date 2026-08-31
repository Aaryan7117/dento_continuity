"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Download,
  ScrollText,
  Sparkles,
  Stethoscope,
  WandSparkles,
} from "lucide-react";
import HeroOdontogram from "./HeroOdontogram";

/**
 * Figures here are deliberately either structural facts about the product (FDI
 * has 32 teeth; approval is enforced, so it is always 100%) or explicitly
 * labelled as coming from the seeded demo dataset. Nothing is an invented
 * benchmark — the audience is practising dentists who will ask.
 */
const SIGNALS = [
  { label: "Recovered in the demo dataset", value: "₹1.2L", tone: "var(--champagne)" },
  { label: "Follow-ups a human approved first", value: "100%", tone: "var(--jade)" },
  { label: "Teeth per record, FDI notation", value: "32", tone: "var(--ivory)" },
];

const OPS = [
  {
    icon: CalendarCheck,
    title: "Appointment marked no-show",
    detail: "The status change is what starts a recovery",
  },
  {
    icon: Stethoscope,
    title: "Finding charted on FDI #23",
    detail: "Linked to the treatment plan it belongs to",
  },
  {
    icon: WandSparkles,
    title: "Follow-up message drafted",
    detail: "Held until the front desk approves it",
  },
];

export default function HeroArch() {
  return (
    <section id="arch" className="relative isolate min-h-[100svh] overflow-hidden pt-24 sm:pt-28">
      <div aria-hidden className="absolute inset-0 -z-20">
        <Image
          src="/dento-hero-luxury.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[63%_center]"
        />
      </div>

      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,9,9,0.96)_0%,rgba(8,9,9,0.88)_32%,rgba(8,9,9,0.48)_64%,rgba(8,9,9,0.22)_100%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_21%_20%,rgba(216,184,104,0.28),transparent_31%),radial-gradient(circle_at_62%_32%,rgba(24,172,157,0.18),transparent_36%)]" />

      <div className="relative mx-auto grid min-h-[calc(100svh-6rem)] max-w-[1220px] items-center gap-10 px-5 pb-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
        <div className="max-w-[680px] py-8 text-white">
          <div className="hero-kicker flex items-center gap-3">
            <span className="h-px w-8" style={{ background: "rgb(216 184 104 / 0.55)" }} />
            <span className="eyebrow text-[var(--champagne)]">DENTO Continuity</span>
          </div>

          <h1 className="hero-title display mt-7 max-w-[13ch] text-[clamp(3rem,7.6vw,6.75rem)]">
            <span style={{ color: "#ffffff" }}>
              The dental record that <em>follows up</em> for you.
            </span>
          </h1>

          <p className="mt-7 max-w-[34rem] text-[1rem] leading-8 text-white/76 sm:text-[1.08rem]">
            One structured patient record in place of paper and spreadsheets —
            charting, encounters, imaging and treatment plans. When an
            appointment is missed, a retention agent drafts the follow-up and
            waits for your front desk to approve it.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/front-desk"
              className="btn-gold group inline-flex h-12 items-center justify-center gap-2 rounded-[8px] px-7 text-[13px]"
            >
              <Download className="h-4 w-4" />
              Download Studio (.exe)
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/front-desk"
              className="btn-glass inline-flex h-12 items-center justify-center gap-2 rounded-[8px] px-7 text-[13px]"
            >
              <Sparkles className="h-4 w-4 text-[var(--champagne)]" />
              Launch Web Demo
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--jade)]" />
            <span>Windows 10/11 (.exe) · macOS (.dmg) · Realtime Supabase Cloud Sync</span>
          </div>

          <div className="mt-10 grid max-w-[34rem] grid-cols-3 divide-x divide-white/10 border-y border-white/10">
            {SIGNALS.map((signal) => (
              <div key={signal.label} className="py-4 pr-4 pl-3 first:pl-0">
                <p className="numeral text-[clamp(1.55rem,3vw,2.3rem)] leading-none" style={{ color: signal.tone }}>
                  {signal.value}
                </p>
                <p className="mt-2 text-[10px] uppercase leading-4 text-white/48">
                  {signal.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-console relative mx-auto w-full max-w-[620px] lg:ml-auto">
          <div className="absolute -inset-5 -z-10 rounded-[18px] bg-[radial-gradient(circle_at_50%_0%,rgba(216,184,104,0.20),transparent_58%)] blur-xl" />
          <div className="pane relative overflow-hidden rounded-[8px] shadow-[var(--lift-2)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#ef6f67]" />
              <span className="h-2 w-2 rounded-full bg-[#d6ad55]" />
              <span className="h-2 w-2 rounded-full bg-[#38b8a6]" />
              <span className="ml-2 text-[10px] uppercase text-white/42">
                Patient record
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-[6px] border border-white/12 bg-white/[0.05] px-2 py-1 text-[10px] text-white/52">
                Demo data
              </span>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[8px] border border-white/10 bg-black/24 p-3">
                <HeroOdontogram />
              </div>

              <div className="flex flex-col gap-3">
                {OPS.map((item, index) => (
                  <div
                    key={item.title}
                    className="hero-stagger rounded-[8px] border border-white/10 bg-white/[0.045] p-3"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--jade)]/12 text-[var(--jade)]">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[13px] text-white">{item.title}</p>
                        <p className="mt-1 text-[11.5px] text-white/50">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-auto rounded-[8px] border border-[var(--champagne)]/24 bg-[linear-gradient(145deg,rgba(216,184,104,0.14),rgba(255,255,255,0.035))] p-4">
                  <div className="flex items-center gap-2 text-[var(--champagne)]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[11px] uppercase">Approval guardrail</span>
                  </div>
                  <p className="mt-3 text-[13px] leading-6 text-white/72">
                    The agent drafts and recommends. It cannot send a recovery
                    message until someone on your team says yes.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-white/42">
                    <ScrollText className="h-3.5 w-3.5" />
                    Every approval and send lands in the audit log
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
