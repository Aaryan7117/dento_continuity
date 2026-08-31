"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowUpRight, CalendarClock, Check, Play } from "lucide-react";
import { useReveal } from "./use-reveal";

const consultationSchema = z.object({
  name: z.string().trim().min(2, "Tell us who you are."),
  clinic: z.string().trim().min(2, "Which practice are you with?"),
  email: z.string().trim().email("That email doesn't look right."),
});

type FieldErrors = Partial<Record<"name" | "clinic" | "email", string>>;

const FOOTER_GROUPS = [
  {
    title: "The Product",
    links: [
      { label: "The Record", href: "#arch" },
      { label: "Smart Waitlist", href: "#features" },
      { label: "Patient Journey", href: "#journey" },
      { label: "Chair Utilisation", href: "#intelligence" },
    ],
  },
  {
    title: "Clinical",
    links: [
      { label: "Front Desk", href: "/front-desk" },
      { label: "Patient Registry", href: "/patients" },
      { label: "Calendar", href: "/calendar" },
      { label: "Practice Overview", href: "/dashboard" },
    ],
  },
  {
    title: "Practice",
    links: [
      { label: "Pricing", href: "#pricing" },
      { label: "New Patient", href: "/patients/new" },
      { label: "Open the demo", href: "/front-desk" },
    ],
  },
];

export default function ClosingCta() {
  const { ref, shown } = useReveal<HTMLDivElement>(0.12);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const parsed = consultationSchema.safeParse({
      name: data.get("name"),
      clinic: data.get("clinic"),
      email: data.get("email"),
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSent(true);
    toast.success("Consultation request noted", {
      description: `We'll reach ${parsed.data.name} at ${parsed.data.email}.`,
    });
  };

  return (
    <>
      <section className="relative mx-auto max-w-[1180px] px-6 pb-20 pt-8 sm:pb-28">
        <div ref={ref} data-shown={shown} className="reveal">
          <div
            className="relative overflow-hidden rounded-[8px] px-7 py-14 text-center sm:px-14 sm:py-20"
            style={{
              background:
                "linear-gradient(145deg, rgba(216,184,104,0.18) 0%, rgba(18,16,13,0.94) 42%, rgba(8,9,9,0.99) 100%)",
              border: "1px solid var(--gold-hairline)",
              boxShadow: "var(--lift-2)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-56 blur-[90px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(216,184,104,0.22), rgba(57,198,179,0.10), transparent)",
              }}
            />

            <div className="relative">
              <span className="eyebrow">Pilot Access</span>
              <h2 className="display mx-auto mt-5 max-w-2xl text-[clamp(2.1rem,5.2vw,3.7rem)]">
                <span style={{ color: "#ffffff" }}>Ready to stop losing patients to silence?</span>
              </h2>
              <p
                className="mx-auto mt-6 max-w-lg text-[14.5px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.66)" }}
              >
                Open the working demo with seeded patient data — no sign-up, no card.
                Or book twenty minutes and we&apos;ll walk your team through the no-show
                recovery flow, start to finish.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/front-desk"
                  className="btn-gold group inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] px-8 text-[13px] sm:w-auto"
                >
                  <Play className="h-3.5 w-3.5" />
                  Open the interactive demo
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  aria-expanded={open}
                  className="btn-glass inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] px-7 text-[13px] text-white sm:w-auto"
                >
                  <CalendarClock className="h-4 w-4" style={{ color: "var(--gold)" }} />
                  Schedule a consultation
                </button>
              </div>

              {/* Consultation flow */}
              <div
                className="overflow-hidden"
                style={{
                  maxHeight: open ? 340 : 0,
                  opacity: open ? 1 : 0,
                  transition:
                    "max-height 560ms var(--ease-drawer), opacity 340ms var(--ease-out)",
                }}
              >
                <div className="mx-auto mt-9 max-w-lg">
                  {sent ? (
                    <div
                      className="rounded-[8px] px-6 py-8"
                      style={{
                        background: "rgba(57,198,179,0.08)",
                        border: "1px solid rgba(57,198,179,0.32)",
                      }}
                    >
                      <span
                        className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ background: "rgba(57,198,179,0.18)" }}
                      >
                        <Check className="h-5 w-5" style={{ color: "var(--jade)" }} />
                      </span>
                      <p className="mt-4 text-[14px]" style={{ color: "#ffffff" }}>
                        Request noted.
                      </p>
                      <p
                        className="mt-1.5 text-[12px] leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.58)" }}
                      >
                        We&apos;ll confirm a twenty-minute slot by email. In the meantime the
                        full demo is one click away.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={submit} noValidate className="space-y-3 text-left">
                      {(
                        [
                          { name: "name", label: "Your name", type: "text", ac: "name" },
                          { name: "clinic", label: "Practice name", type: "text", ac: "organization" },
                          { name: "email", label: "Work email", type: "email", ac: "email" },
                        ] as const
                      ).map((f) => (
                        <div key={f.name}>
                          <label
                            htmlFor={`c-${f.name}`}
                            className="mb-1.5 block text-[10px] uppercase"
                            style={{ letterSpacing: 0, color: "rgba(255,255,255,0.48)" }}
                          >
                            {f.label}
                          </label>
                          <input
                            id={`c-${f.name}`}
                            name={f.name}
                            type={f.type}
                            autoComplete={f.ac}
                            aria-invalid={Boolean(errors[f.name])}
                            aria-describedby={errors[f.name] ? `e-${f.name}` : undefined}
                            className="h-11 w-full rounded-[8px] px-4 text-[13px] outline-none"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: `1px solid ${
                                errors[f.name] ? "rgba(239,68,68,0.6)" : "var(--hairline)"
                              }`,
                              color: "#ffffff",
                              transition: "border-color 200ms var(--ease-out)",
                            }}
                          />
                          {errors[f.name] && (
                            <p
                              id={`e-${f.name}`}
                              className="mt-1.5 text-[11px]"
                              style={{ color: "#f87171" }}
                            >
                              {errors[f.name]}
                            </p>
                          )}
                        </div>
                      ))}

                      <button
                        type="submit"
                        className="btn-gold mt-2 inline-flex h-11 w-full items-center justify-center rounded-[8px] text-[12.5px]"
                      >
                        Request a consultation
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--hairline)" }}>
        <div className="mx-auto max-w-[1180px] px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <span
                className="display text-[19px]"
                style={{ color: "var(--ink)" }}
              >
                Dento{" "}
                <span style={{ color: "var(--gold)", fontStyle: "italic" }}>Continuity</span>
              </span>
              <p
                className="mt-4 max-w-xs text-[12.5px] leading-relaxed"
                style={{ color: "var(--ink-faint)" }}
              >
                One clean clinical record, and an agent that never lets a missed
                appointment go quiet. Every action it takes waits for a human.
              </p>
            </div>

            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                  <p
                    className="text-[9.5px] uppercase"
                    style={{ letterSpacing: 0, color: "var(--gold)" }}
                >
                  {group.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((l) => (
                    <li key={`${group.title}-${l.label}`}>
                      <Link
                        href={l.href}
                        className="text-[12.5px]"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="mt-12 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderTop: "1px solid var(--hairline)" }}
          >
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              © {new Date().getFullYear()} DENTO Continuity. Demo build — seeded
              clinical data, mocked messaging.
            </p>
            <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              Built for the chair.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
