"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/app/components/ThemeToggle";

const LINKS = [
  { label: "The Record", href: "#arch" },
  { label: "Smart Waitlist", href: "#features" },
  { label: "Patient Journey", href: "#journey" },
  { label: "Chair Utilisation", href: "#intelligence" },
  { label: "Pricing", href: "#pricing" },
];

function ArchGlyph() {
  const teeth = [
    { x: 5, y: 11.4, w: 2.8, h: 6.6, r: -16 },
    { x: 8.7, y: 7.4, w: 3.2, h: 8.1, r: -11 },
    { x: 12.6, y: 5.2, w: 3.8, h: 9.4, r: -6 },
    { x: 16.9, y: 4.5, w: 4.5, h: 10.1, r: -1 },
    { x: 21.5, y: 4.5, w: 4.5, h: 10.1, r: 1 },
    { x: 25.8, y: 5.2, w: 3.8, h: 9.4, r: 6 },
    { x: 29.7, y: 7.4, w: 3.2, h: 8.1, r: 11 },
    { x: 33.4, y: 11.4, w: 2.8, h: 6.6, r: 16 },
  ];

  return (
    <svg viewBox="0 0 39 23" className="h-[19px] w-[32px]" aria-hidden>
      {teeth.map((tooth, i) => {
        const hw = tooth.w / 2;
        return (
          <path
            key={i}
            d={`M ${-hw * 0.72} 0 C ${-hw} ${tooth.h * 0.24}, ${-hw} ${tooth.h * 0.68}, ${-hw * 0.58} ${tooth.h * 0.9} Q 0 ${tooth.h * 1.08}, ${hw * 0.58} ${tooth.h * 0.9} C ${hw} ${tooth.h * 0.68}, ${hw} ${tooth.h * 0.24}, ${hw * 0.72} 0 Z`}
            transform={`translate(${tooth.x} ${tooth.y}) rotate(${tooth.r})`}
            fill="currentColor"
            opacity={0.54 + i * 0.03}
          />
        );
      })}
    </svg>
  );
}

export default function LandingNav() {
  const [lifted, setLifted] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Scroll-spy across the linked sections. */
  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1));
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => n !== null);
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(`#${visible[0].target.id}`);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        style={{
          background: lifted ? "rgba(8,9,9,0.74)" : "rgba(8,9,9,0.28)",
          backdropFilter: "blur(20px) saturate(150%)",
          WebkitBackdropFilter: "blur(20px) saturate(150%)",
          borderBottom: `1px solid ${lifted ? "rgba(255,255,255,0.10)" : "transparent"}`,
          transition:
            "background 420ms var(--ease-out), border-color 420ms var(--ease-out)",
        }}
      >
        <nav className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-6 sm:h-[72px]">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            style={{ color: "var(--gold)" }}
            onClick={() => setOpen(false)}
          >
            <ArchGlyph />
            <span
              className="display text-[19px] leading-none"
              style={{ color: "#ffffff" }}
            >
              Dento{" "}
              <span style={{ color: "var(--gold)", fontStyle: "italic" }}>Continuity</span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="relative block px-3 py-2 text-[12.5px]"
                  style={{
                    color:
                      active === l.href ? "#ffffff" : "rgba(255,255,255,0.62)",
                    transition: "color 240ms var(--ease-out)",
                  }}
                >
                  {l.label}
                  <span
                    className="absolute inset-x-3 -bottom-0.5 h-px"
                    style={{
                      background: "var(--gold)",
                      transform: `scaleX(${active === l.href ? 1 : 0})`,
                      transformOrigin: "left",
                      transition: "transform 320ms var(--ease-out)",
                    }}
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="btn-glass hidden h-9 items-center rounded-[8px] px-4 text-[12.5px] sm:inline-flex"
              style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.16)" }}
            >
              Practice overview
            </Link>
            <Link
              href="/front-desk"
              className="btn-gold hidden h-9 items-center rounded-[8px] px-5 text-[12.5px] sm:inline-flex"
            >
              Open the demo
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="btn-glass inline-flex h-9 w-9 items-center justify-center rounded-[8px] lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile sheet */}
      <div
        className="lg:hidden"
        style={{
          maxHeight: open ? "22rem" : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          background: "var(--ash)",
          backdropFilter: "blur(20px)",
          borderBottom: open ? "1px solid var(--hairline)" : "none",
          transition:
            "max-height 420ms var(--ease-drawer), opacity 280ms var(--ease-out)",
        }}
      >
        <ul className="px-6 py-3">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-[15px]"
                style={{
                  color: "var(--ink-soft)",
                  borderBottom: "1px solid var(--hairline)",
                }}
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="flex gap-3 pt-5 pb-2">
            <Link
              href="/dashboard"
              className="btn-glass inline-flex h-11 flex-1 items-center justify-center rounded-[8px] text-[13px]"
            >
              Overview
            </Link>
            <Link
              href="/front-desk"
              className="btn-gold inline-flex h-11 flex-1 items-center justify-center rounded-[8px] text-[13px]"
            >
              Open the demo
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
