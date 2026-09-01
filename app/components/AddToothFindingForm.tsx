"use client";

import { useState, useTransition } from "react";
import { addToothFinding } from "@/lib/actions";

const FINDING_TYPES = [
  "CARIES",
  "RESTORATION",
  "CROWN",
  "MISSING",
  "IMPLANT",
  "ENDODONTIC",
  "FRACTURE",
  "SEALANT",
  "WEAR",
  "EXTRACTION_INDICATED",
] as const;

const SURFACES = ["MESIAL", "DISTAL", "OCCLUSAL", "BUCCAL", "LINGUAL"] as const;

// Whole-tooth findings don't take surfaces
const WHOLE_TOOTH_FINDINGS = ["MISSING", "CROWN", "IMPLANT", "ENDODONTIC"];

export default function AddToothFindingForm({
  patientId,
  encounterId,
  preselectedTooth,
}: {
  patientId: string;
  encounterId?: string;
  preselectedTooth?: number;
}) {
  const [toothCode, setToothCode] = useState(preselectedTooth ?? 11);
  const [finding, setFinding] = useState<(typeof FINDING_TYPES)[number]>("CARIES");
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const isWholeTooth = WHOLE_TOOTH_FINDINGS.includes(finding);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addToothFinding({
        patientId,
        encounterId,
        toothCode,
        finding,
        surfaces: isWholeTooth ? [] : (surfaces as typeof SURFACES[number][]),
        note: note || undefined,
      });
      if (result.ok) {
        setNote("");
        setSurfaces([]);
        setMessage("Finding recorded");
        setTimeout(() => setMessage(null), 2000);
      } else {
        setMessage(result.error.message);
      }
    });
  }

  function toggleSurface(s: string) {
    setSurfaces((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Tooth code */}
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">
            Tooth (FDI)
          </label>
          <input
            type="number"
            min={11}
            max={48}
            value={toothCode}
            onChange={(e) => setToothCode(Number(e.target.value))}
            className="w-full bg-surface border border-line-strong rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Finding type */}
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">
            Finding
          </label>
          <select
            value={finding}
            onChange={(e) => setFinding(e.target.value as typeof finding)}
            className="w-full bg-surface border border-line-strong rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
          >
            {FINDING_TYPES.map((f) => (
              <option key={f} value={f} className="bg-surface text-ink">
                {f.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Surfaces (only for non-whole-tooth findings) */}
      {!isWholeTooth && (
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">
            Surfaces
          </label>
          <div className="flex gap-2">
            {SURFACES.map((s) => (
              <label
                key={s}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                  surfaces.includes(s)
                    ? "bg-brand/10 text-brand"
                    : "bg-raised text-ink-muted hover:bg-line"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={surfaces.includes(s)}
                  onChange={() => toggleSurface(s)}
                />
                {s.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <input
        type="text"
        placeholder="Optional note…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full bg-surface border border-line-strong rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary text-sm font-medium py-1.5 px-4 rounded-md disabled:opacity-50 transition-colors"
        >
          {isPending ? "Recording…" : "Record Finding"}
        </button>
        {message && (
          <span className="text-sm text-green-600">{message}</span>
        )}
      </div>
    </form>
  );
}
