"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Armchair, Loader2, Plus, Save } from "lucide-react";
import { addChair, saveClinicSettings, toggleChair } from "@/lib/settings-actions";
import { WEEKDAYS, type OpeningHours, type Weekday } from "@/lib/opening-hours";
import type { ChairSummary, ClinicSettings } from "@/lib/clinic";

const DAY_LABEL: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const inputStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  color: "var(--ink)",
};

type Row = { open: boolean; ranges: [string, string][] };

function toRows(hours: OpeningHours): Record<Weekday, Row> {
  const rows = {} as Record<Weekday, Row>;
  for (const d of WEEKDAYS) {
    const r = hours[d] ?? [];
    rows[d] = { open: r.length > 0, ranges: r.length > 0 ? r.map((x) => [x[0], x[1]]) : [["09:00", "18:00"]] };
  }
  return rows;
}

export default function SettingsClient({
  settings,
  chairs,
}: {
  settings: ClinicSettings;
  chairs: ChairSummary[];
}) {
  const [name, setName] = useState(settings.name);
  const [rows, setRows] = useState(() => toRows(settings.openingHours));
  const [slotMinutes, setSlotMinutes] = useState(settings.slotMinutes);
  const [visitMinutes, setVisitMinutes] = useState(settings.defaultVisitMinutes);
  const [newChair, setNewChair] = useState("");
  const [saving, startSave] = useTransition();
  const [chairPending, startChair] = useTransition();

  function updateRange(day: Weekday, i: number, which: 0 | 1, value: string) {
    setRows((prev) => {
      const ranges = prev[day].ranges.map((r, idx) =>
        idx === i ? ((which === 0 ? [value, r[1]] : [r[0], value]) as [string, string]) : r
      );
      return { ...prev, [day]: { ...prev[day], ranges } };
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const openingHours: OpeningHours = {};
    for (const d of WEEKDAYS) if (rows[d].open) openingHours[d] = rows[d].ranges;

    startSave(async () => {
      const res = await saveClinicSettings({
        name,
        openingHours,
        slotMinutes: slotMinutes as 5 | 10 | 15 | 20 | 30,
        defaultVisitMinutes: visitMinutes,
      });
      if (res.ok) toast.success("Settings saved");
      else toast.error("Not saved", { description: res.error.message });
    });
  }

  function handleAddChair(e: React.FormEvent) {
    e.preventDefault();
    const value = newChair.trim();
    if (!value) return;
    startChair(async () => {
      const res = await addChair(value);
      if (res.ok) {
        toast.success(`Chair "${value}" added`);
        setNewChair("");
      } else toast.error("Not added", { description: res.error.message });
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="card p-7 space-y-6">
        <label className="block space-y-1.5 text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
          Clinic name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            className="w-full px-3.5 py-2.5 rounded-xl text-sm font-normal outline-none"
            style={inputStyle}
          />
        </label>

        <div className="space-y-2">
          <div className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
            Opening hours
            {!settings.hoursConfigured && (
              <span className="ml-2 text-xs font-normal" style={{ color: "var(--ink-faint)" }}>
                (defaults shown; save to confirm)
              </span>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2.5 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 w-32 text-sm" style={{ color: "var(--ink)" }}>
                  <input
                    type="checkbox"
                    checked={rows[d].open}
                    onChange={(e) =>
                      setRows((prev) => ({ ...prev, [d]: { ...prev[d], open: e.target.checked } }))
                    }
                  />
                  {DAY_LABEL[d]}
                </label>
                {rows[d].open ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {rows[d].ranges.map((r, i) => (
                      <span key={i} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="time"
                          value={r[0]}
                          onChange={(e) => updateRange(d, i, 0, e.target.value)}
                          className="px-2 py-1.5 rounded-lg text-sm outline-none"
                          style={inputStyle}
                        />
                        <span style={{ color: "var(--ink-faint)" }}>to</span>
                        <input
                          type="time"
                          value={r[1]}
                          onChange={(e) => updateRange(d, i, 1, e.target.value)}
                          className="px-2 py-1.5 rounded-lg text-sm outline-none"
                          style={inputStyle}
                        />
                        {rows[d].ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRows((prev) => ({
                                ...prev,
                                [d]: { ...prev[d], ranges: prev[d].ranges.filter((_, idx) => idx !== i) },
                              }))
                            }
                            className="text-xs px-1.5"
                            style={{ color: "var(--ink-faint)" }}
                            aria-label="Remove range"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {rows[d].ranges.length < 3 && (
                      <button
                        type="button"
                        onClick={() =>
                          setRows((prev) => ({
                            ...prev,
                            [d]: { ...prev[d], ranges: [...prev[d].ranges, ["16:00", "20:00"]] },
                          }))
                        }
                        className="text-xs font-semibold"
                        style={{ color: "var(--brand)" }}
                      >
                        + break / second session
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-sm" style={{ color: "var(--ink-faint)" }}>
                    Closed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5 text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
            Slot grid
            <select
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-normal outline-none appearance-none"
              style={inputStyle}
            >
              {[5, 10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>
                  Every {m} minutes
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
            Default visit length
            <input
              type="number"
              min={5}
              max={240}
              step={5}
              value={visitMinutes}
              onChange={(e) => setVisitMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-normal outline-none"
              style={inputStyle}
            />
          </label>
        </div>

        <div className="flex justify-end pt-2" style={{ borderTop: "1px solid var(--line)" }}>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
            style={{ background: "var(--grad-brand)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save settings
          </button>
        </div>
      </form>

      <div className="card p-7 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--ink)" }}>
          <Armchair className="w-4 h-4" style={{ color: "var(--brand)" }} /> Chairs
        </h2>
        {chairs.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
            No chairs yet. Without chairs, bookings only check the dentist&apos;s time.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {chairs.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between text-sm">
                <span style={{ color: c.isActive ? "var(--ink)" : "var(--ink-faint)" }}>
                  {c.name}
                  {!c.isActive && <span className="ml-2 text-xs">(inactive)</span>}
                </span>
                <button
                  type="button"
                  disabled={chairPending}
                  onClick={() =>
                    startChair(async () => {
                      const res = await toggleChair(c.id, !c.isActive);
                      if (!res.ok) toast.error(res.error.message);
                    })
                  }
                  className="text-xs font-semibold"
                  style={{ color: "var(--brand)" }}
                >
                  {c.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddChair} className="flex gap-2">
          <input
            value={newChair}
            onChange={(e) => setNewChair(e.target.value)}
            maxLength={40}
            placeholder="Chair name, e.g. Chair 1"
            className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={chairPending || !newChair.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-60"
            style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
          >
            {chairPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
