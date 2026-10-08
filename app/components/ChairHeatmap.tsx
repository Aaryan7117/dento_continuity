"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Activity } from "lucide-react";

type ChairSlot = {
  dayOfWeek: number;
  hour: number;
  count: number;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 10 }, (_, i) => {
  const h = i + 8;
  return h <= 12 ? `${h}am` : `${h - 12}pm`;
});

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function getCellColor(count: number, max: number): string {
  if (count === 0) return "var(--surface-secondary)";
  const intensity = max > 0 ? count / max : 0;
  if (intensity <= 0.25) return "rgb(var(--brand-rgb) / 0.18)";
  if (intensity <= 0.5) return "rgb(var(--brand-rgb) / 0.38)";
  if (intensity <= 0.75) return "rgb(var(--brand-rgb) / 0.65)";
  return "var(--brand)";
}

function getCellTextColor(count: number, max: number): string {
  if (count === 0) return "var(--ink-faint)";
  const intensity = max > 0 ? count / max : 0;
  if (intensity <= 0.5) return "var(--brand)";
  return "#ffffff";
}

export default function ChairHeatmap() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState<ChairSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

  const weekStart = useMemo(() => {
    const d = getWeekStart(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/chair-utilization?weekStart=${weekStart.toISOString()}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [weekStart]);

  const maxCount = useMemo(() => Math.max(1, ...slots.map((s) => s.count)), [slots]);
  const totalBooked = useMemo(() => slots.reduce((s, c) => s + c.count, 0), [slots]);
  const peakSlot = useMemo(() => {
    if (slots.length === 0) return null;
    const peak = slots.reduce((a, b) => (b.count > a.count ? b : a));
    if (peak.count === 0) return null;
    return peak;
  }, [slots]);

  const isThisWeek = weekOffset === 0;

  return (
    <div className="card p-6 stagger-item">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <Activity className="w-5 h-5" style={{ color: "var(--brand)" }} />
            Chair Utilization
          </h2>
          <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
            Appointment density by day and hour
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-1.5 rounded-lg hover:bg-raised transition-colors"
            style={{ border: "1px solid var(--line)" }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: "var(--ink-muted)" }} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isThisWeek ? "bg-brand/10 text-brand" : "hover:bg-raised"
            }`}
            style={{ border: "1px solid var(--line)" }}
          >
            This Week
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-1.5 rounded-lg hover:bg-raised transition-colors"
            style={{ border: "1px solid var(--line)" }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: "var(--ink-muted)" }} />
          </button>
          <span className="text-xs font-medium ml-2" style={{ color: "var(--ink-faint)" }}>
            {formatWeekRange(weekStart)}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-4 text-xs" style={{ color: "var(--ink-muted)" }}>
        <span>
          Total bookings: <strong className="font-bold" style={{ color: "var(--ink)" }}>{totalBooked}</strong>
        </span>
        {peakSlot && (
          <span>
            Peak:{" "}
            <strong className="font-bold" style={{ color: "var(--brand)" }}>
              {DAY_LABELS[peakSlot.dayOfWeek]} {HOUR_LABELS[peakSlot.hour - 8]}
            </strong>{" "}
            ({peakSlot.count} appt{peakSlot.count !== 1 ? "s" : ""})
          </span>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Column headers (hours) */}
          <div className="grid gap-1" style={{ gridTemplateColumns: "60px repeat(10, 1fr)" }}>
            <div /> {/* spacer */}
            {HOUR_LABELS.map((h) => (
              <div key={h} className="text-center text-[10px] font-semibold pb-1.5" style={{ color: "var(--ink-faint)" }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows (days) */}
          {DAY_LABELS.map((dayLabel, dayIdx) => (
            <div
              key={dayLabel}
              className="grid gap-1 mb-1"
              style={{ gridTemplateColumns: "60px repeat(10, 1fr)" }}
            >
              <div className="flex items-center text-[11px] font-semibold pr-2" style={{ color: "var(--ink-muted)" }}>
                {dayLabel}
              </div>
              {Array.from({ length: 10 }, (_, hourOffset) => {
                const hour = hourOffset + 8;
                const slot = slots.find((s) => s.dayOfWeek === dayIdx && s.hour === hour);
                const count = slot?.count || 0;
                const isHovered = hoveredCell?.day === dayIdx && hoveredCell?.hour === hour;

                return (
                  <div
                    key={hour}
                    className="relative rounded-md flex items-center justify-center cursor-default"
                    style={{
                      height: 36,
                      background: getCellColor(count, maxCount),
                      color: getCellTextColor(count, maxCount),
                      transition: "background 200ms var(--ease-out), transform 150ms var(--ease-out)",
                      transform: isHovered ? "scale(1.08)" : "scale(1)",
                      zIndex: isHovered ? 10 : 1,
                      boxShadow: isHovered ? "0 4px 12px var(--shadow-ambient)" : "none",
                    }}
                    onMouseEnter={() => setHoveredCell({ day: dayIdx, hour })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <span className="text-[11px] font-bold">
                      {count > 0 ? count : ""}
                    </span>

                    {/* Tooltip */}
                    {isHovered && (
                      <div
                        className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap z-20"
                        style={{
                          background: "var(--surface-elevated)",
                          color: "var(--ink)",
                          border: "1px solid var(--line)",
                          boxShadow: "0 8px 24px var(--shadow-ambient)",
                        }}
                      >
                        {dayLabel} {HOUR_LABELS[hourOffset]}: {count} appt{count !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 justify-end">
        <span className="text-[10px] font-medium" style={{ color: "var(--ink-faint)" }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
          <div
            key={intensity}
            className="w-4 h-4 rounded"
            style={{ background: getCellColor(intensity * 4, 4) }}
          />
        ))}
        <span className="text-[10px] font-medium" style={{ color: "var(--ink-faint)" }}>More</span>
      </div>
    </div>
  );
}
