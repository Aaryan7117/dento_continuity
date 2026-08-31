"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { buildArch, preTreatment, type ArchLayout } from "./arch-geometry";
import { useReveal } from "./use-reveal";

const VB = { x: -16, y: 12, w: 424, h: 210 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function ArchLayer({ arch, variant }: { arch: ArchLayout; variant: "before" | "after" }) {
  const after = variant === "after";
  const ns = after ? "aft" : "bef";

  return (
    <svg
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${ns}-enamel`} x1="0" y1="0" x2="0.25" y2="1">
          {after ? (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="48%" stopColor="#f8f5ef" />
              <stop offset="84%" stopColor="#ede8df" />
              <stop offset="100%" stopColor="#dfd5c3" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#e6dcc4" />
              <stop offset="50%" stopColor="#d5c7a4" />
              <stop offset="100%" stopColor="#b8a684" />
            </>
          )}
        </linearGradient>

        <linearGradient id={`${ns}-proximal`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3d3323" stopOpacity={after ? "0.3" : "0.55"} />
          <stop offset="24%" stopColor="#3d3323" stopOpacity="0" />
          <stop offset="76%" stopColor="#3d3323" stopOpacity="0" />
          <stop offset="100%" stopColor="#3d3323" stopOpacity={after ? "0.3" : "0.55"} />
        </linearGradient>

        <linearGradient id={`${ns}-gum`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4636e" stopOpacity={after ? "0.55" : "0.5"} />
          <stop offset="40%" stopColor="#a14a54" stopOpacity={after ? "0.42" : "0.4"} />
          <stop offset="75%" stopColor="#6b2f38" stopOpacity={after ? "0.2" : "0.25"} />
          <stop offset="100%" stopColor="#2a1418" stopOpacity="0" />
        </linearGradient>

        {after && (
          <linearGradient id={`${ns}-glass`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="70%" stopColor="#a8cadb" stopOpacity="0" />
            <stop offset="100%" stopColor="#a8cadb" stopOpacity="0.55" />
          </linearGradient>
        )}
      </defs>

      {/* Gingiva — realistic scalloped CEJ margin */}
      <g style={{ filter: "blur(2.5px)" }}>
        <path
          d={arch.gumPath}
          fill={`url(#${ns}-gum)`}
        />
      </g>

      {arch.teeth.map((t) => {
        const dev = preTreatment(t.code);
        const transform = after
          ? `translate(${t.x} ${t.y}) rotate(${t.rotation})`
          : `translate(${t.x + dev.dx} ${t.y + dev.dy}) rotate(${t.rotation + dev.rotate}) scale(${dev.scale})`;
        const dim = 1 - t.depth * 0.3;

        return (
          <g key={t.code} transform={transform}>
            <ellipse
              cx="0"
              cy={t.height + 3}
              rx={t.width * 0.44}
              ry="2.4"
              fill="#000"
              opacity="0.32"
            />
            <path d={t.path} fill={`url(#${ns}-enamel)`} opacity={dim} />
            <path d={t.path} fill={`url(#${ns}-proximal)`} />

            {after ? (
              <>
                <path d={t.path} fill={`url(#${ns}-glass)`} />
                {/* Champagne rim on the veneered anteriors */}
                {t.code % 10 <= 3 && (
                  <path
                    d={t.path}
                    fill="none"
                    stroke="#e5c368"
                    strokeWidth="0.5"
                    opacity="0.42"
                  />
                )}
              </>
            ) : (
              /* Chroma staining, heaviest toward the cervical third */
              <path d={t.path} fill="#8a6f3c" opacity={dev.chroma * 0.26} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function SmileSlider() {
  const arch = useMemo(() => buildArch(), []);
  const { ref: revealRef, shown } = useReveal<HTMLDivElement>();
  const [pos, setPos] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromClientX = useCallback((clientX: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    setPos(clamp(((clientX - box.left) / box.width) * 100, 0, 100));
  }, []);

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    fromClientX(e.clientX);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    fromClientX(e.clientX);
  };

  const onUp = (e: React.PointerEvent) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 3;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPos((p) => clamp(p - step, 0, 100));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPos((p) => clamp(p + step, 0, 100));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPos(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPos(100);
    }
  };

  return (
    <section className="relative mx-auto max-w-[1180px] px-6 py-16 sm:py-20">
      <div ref={revealRef} data-shown={shown} className="reveal">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Smile Design Studio</span>
          <h2 className="display mt-5 text-[clamp(2rem,4.6vw,3.4rem)]">
            Drag from compromised to camera-ready.
          </h2>
          <p className="mt-5 text-[14.5px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            The same maxillary arch, charted before treatment and after a six-unit
            porcelain veneer case. Golden proportion restored across the anterior six.
          </p>
        </div>

        <div
          className="pane relative mt-12 overflow-hidden rounded-[8px]"
          style={{ boxShadow: "var(--lift-2)" }}
        >
          <div
            ref={boxRef}
            className="relative select-none"
            style={{
              aspectRatio: `${VB.w} / ${VB.h}`,
              touchAction: "pan-y",
              cursor: "ew-resize",
            }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {/* After — full width underneath */}
            <div className="absolute inset-0">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(212,175,55,0.12), transparent 70%)",
                }}
              />
              <ArchLayer arch={arch} variant="after" />
            </div>

            {/* Before — clipped to the left of the divider */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: `inset(0 ${100 - pos}% 0 0)`,
                filter: "saturate(0.85) brightness(0.9)",
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.28)" }}
              />
              <ArchLayer arch={arch} variant="before" />
            </div>

            {/* Corner labels */}
            <span
              className="pointer-events-none absolute left-4 top-4 rounded-[6px] px-2.5 py-1 text-[9.5px] uppercase"
              style={{
                letterSpacing: 0,
                background: "rgba(10,13,15,0.7)",
                border: "1px solid var(--hairline)",
                color: "var(--ink-muted)",
                opacity: pos > 12 ? 1 : 0,
                transition: "opacity 300ms var(--ease-out)",
              }}
            >
              Pre-treatment
            </span>
            <span
              className="pointer-events-none absolute right-4 top-4 rounded-[6px] px-2.5 py-1 text-[9.5px] uppercase"
              style={{
                letterSpacing: 0,
                background: "rgba(10,13,15,0.7)",
                border: "1px solid var(--gold-hairline)",
                color: "var(--gold-light)",
                opacity: pos < 88 ? 1 : 0,
                transition: "opacity 300ms var(--ease-out)",
              }}
            >
              Porcelain veneers
            </span>

            {/* Divider */}
            <div
              className="pointer-events-none absolute inset-y-0"
              style={{ left: `${pos}%` }}
            >
              <div
                className="absolute inset-y-0 -left-px w-0.5"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, var(--gold-light) 12%, var(--gold-light) 88%, transparent)",
                  boxShadow: "0 0 18px rgba(212,175,55,0.5)",
                }}
              />
              <div
                role="slider"
                tabIndex={0}
                aria-label="Reveal the smile transformation"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pos)}
                aria-valuetext={`${Math.round(pos)}% pre-treatment`}
                onKeyDown={onKey}
                className="pointer-events-auto absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[8px]"
                style={{
                  background: "rgba(10,13,15,0.86)",
                  border: "1px solid var(--gold)",
                  boxShadow: "0 0 0 5px rgba(212,175,55,0.12), var(--lift-1)",
                  cursor: "ew-resize",
                  touchAction: "none",
                }}
              >
                <GripVertical className="h-4 w-4" style={{ color: "var(--gold-light)" }} />
              </div>
            </div>
          </div>

          {/* Case notes */}
          <div
            className="grid gap-px sm:grid-cols-3"
            style={{ borderTop: "1px solid var(--hairline)" }}
          >
            {[
              { k: "Case", v: "Six-unit veneer, #13–#23" },
              { k: "Chairside time", v: "2 visits · 4h 20m" },
              { k: "Proportion", v: "1.618 : 1.0 : 0.618 restored" },
            ].map((row) => (
              <div key={row.k} className="px-5 py-4">
                <p
                  className="text-[9px] uppercase"
                  style={{ letterSpacing: 0, color: "var(--ink-faint)" }}
                >
                  {row.k}
                </p>
                <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                  {row.v}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
