"use client";

import { useMemo, useState } from "react";
import { seeded } from "../arch-geometry";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i);
const CHAIRS = 4;

/** Deterministic so server and client render identical markup. */
function occupancyAt(day: number, hourIndex: number): number {
  const hour = HOURS[hourIndex];
  let base = 0.56;
  if (hour >= 9 && hour <= 11) base += 0.3;
  if (hour >= 15 && hour <= 17) base += 0.25;
  if (hour === 13) base -= 0.36;
  if (hour === 8) base -= 0.18;
  if (day === 0) base += 0.06;
  if (day === 5) base -= 0.15;
  if (day === 6) base -= 0.5;
  const jitter = (seeded(day * 37 + hourIndex * 11 + 5) - 0.5) * 0.16;
  return Math.min(1, Math.max(0.04, base + jitter));
}

const RAMP: [number, [number, number, number]][] = [
  [0, [21, 26, 29]],
  [0.55, [1, 157, 142]],
  [1, [212, 175, 55]],
];

function rampColor(t: number): string {
  let lo = RAMP[0];
  let hi = RAMP[RAMP.length - 1];
  for (let i = 0; i < RAMP.length - 1; i++) {
    if (t >= RAMP[i][0] && t <= RAMP[i + 1][0]) {
      lo = RAMP[i];
      hi = RAMP[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const k = (t - lo[0]) / span;
  const c = lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function HeatmapDemo() {
  const grid = useMemo(
    () => DAYS.map((_, d) => HOURS.map((_, h) => occupancyAt(d, h))),
    [],
  );

  const [cell, setCell] = useState<{ d: number; h: number } | null>({ d: 2, h: 2 });

  const stats = useMemo(() => {
    const flat = grid.flat();
    const avg = flat.reduce((a, b) => a + b, 0) / flat.length;
    const hourTotals = HOURS.map((_, h) =>
      grid.reduce((sum, row) => sum + row[h], 0) / DAYS.length,
    );
    const peakHourIndex = hourTotals.indexOf(Math.max(...hourTotals));
    return { avg, peakHourIndex, hourTotals };
  }, [grid]);

  const active = cell ? grid[cell.d][cell.h] : null;

  return (
    <div>
      {/* Instrument readout */}
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl px-4 py-3"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--hairline)" }}
      >
        {cell && active !== null ? (
          <div className="flex items-baseline gap-3">
            <span className="numeral text-2xl" style={{ color: rampColor(active) }}>
              {Math.round(active * 100)}%
            </span>
            <div>
              <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>
                {DAYS[cell.d]} · {String(HOURS[cell.h]).padStart(2, "0")}:00
              </p>
              <p className="text-[10.5px]" style={{ color: "var(--ink-faint)" }}>
                {Math.round(active * CHAIRS)} of {CHAIRS} chairs ·{" "}
                {plural(CHAIRS - Math.round(active * CHAIRS), "chair")} free
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
            Hover a block to inspect occupancy.
          </p>
        )}

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="numeral text-lg" style={{ color: "var(--ink)" }}>
              {Math.round(stats.avg * 100)}%
            </p>
            <p className="text-[9px] uppercase" style={{ letterSpacing: 0, color: "var(--ink-faint)" }}>
              Weekly avg
            </p>
          </div>
          <div className="text-right">
            <p className="numeral text-lg" style={{ color: "var(--gold-light)" }}>
              {String(HOURS[stats.peakHourIndex]).padStart(2, "0")}:00
            </p>
            <p className="text-[9px] uppercase" style={{ letterSpacing: 0, color: "var(--ink-faint)" }}>
              Peak hour
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex gap-1.5" onMouseLeave={() => setCell(null)}>
        <div className="flex shrink-0 flex-col gap-1">
          <span className="h-4" />
          {DAYS.map((d) => (
            <span
              key={d}
              className="flex flex-1 items-center text-[9.5px] tabular-nums"
              style={{ color: "var(--ink-faint)", minHeight: 22 }}
            >
              {d}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
            {HOURS.map((h, i) => (
              <span
                key={h}
                className="text-center text-[9px] tabular-nums"
                style={{
                  color: cell?.h === i ? "var(--gold-light)" : "var(--ink-faint)",
                  transition: "color 200ms var(--ease-out)",
                }}
              >
                {String(h).padStart(2, "0")}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            {DAYS.map((day, d) => (
              <div
                key={day}
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}
              >
                {HOURS.map((hour, h) => {
                  const occ = grid[d][h];
                  const crosshair = cell && (cell.d === d || cell.h === h);
                  const exact = cell?.d === d && cell?.h === h;
                  return (
                    <button
                      key={hour}
                      type="button"
                      onMouseEnter={() => setCell({ d, h })}
                      onFocus={() => setCell({ d, h })}
                      onClick={() => setCell({ d, h })}
                      aria-label={`${day} ${hour}:00 — ${Math.round(occ * 100)} percent occupied`}
                      className="rounded-[3px]"
                      style={{
                        height: 22,
                        background: rampColor(occ),
                        opacity: !cell || crosshair ? 1 : 0.32,
                        outline: exact ? "1px solid var(--gold-light)" : "none",
                        outlineOffset: 1,
                        transform: exact ? "scale(1.14)" : "none",
                        transition:
                          "opacity 260ms var(--ease-out), transform 260ms var(--ease-out)",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-[9.5px]" style={{ color: "var(--ink-faint)" }}>
          Idle
        </span>
        <div
          className="h-1 flex-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${rampColor(0)}, ${rampColor(0.55)}, ${rampColor(1)})`,
          }}
        />
        <span className="text-[9.5px]" style={{ color: "var(--gold-light)" }}>
          Fully booked
        </span>
      </div>
    </div>
  );
}
