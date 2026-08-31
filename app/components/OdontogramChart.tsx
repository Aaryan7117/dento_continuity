"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import type { ToothFinding } from "@/lib/contract";
import {
  MM,
  buildArch,
  type ArchGlyphs,
  type ToothGlyph,
} from "@/lib/odontogram/buccal-path";
import { toothAnatomy } from "@/lib/odontogram/tooth-anatomy";

/**
 * FDI tooth numbering:
 * Upper right (Q1): 18 17 16 15 14 13 12 11
 * Upper left  (Q2): 21 22 23 24 25 26 27 28
 * Lower left  (Q3): 38 37 36 35 34 33 32 31
 * Lower right (Q4): 41 42 43 44 45 46 47 48
 */

const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const FINDING_COLORS: Record<string, string> = {
  CARIES: "#ef4444",
  RESTORATION: "#3b82f6",
  CROWN: "#f59e0b",
  MISSING: "#6b7280",
  IMPLANT: "#8b5cf6",
  ENDODONTIC: "#ec4899",
  FRACTURE: "#f97316",
  SEALANT: "#06b6d4",
  WEAR: "#a855f7",
  EXTRACTION_INDICATED: "#dc2626",
};

const FINDING_LABELS: Record<string, string> = {
  CARIES: "Caries",
  RESTORATION: "Restoration",
  CROWN: "Crown",
  MISSING: "Missing",
  IMPLANT: "Implant",
  ENDODONTIC: "Endodontic",
  FRACTURE: "Fracture",
  SEALANT: "Sealant",
  WEAR: "Wear",
  EXTRACTION_INDICATED: "Extraction",
};

// Surface positions (for occlusal view circle segments)
const SURFACE_PATHS: Record<string, string> = {
  OCCLUSAL: "M 35,25 A 10,10 0 1,1 15,25 A 10,10 0 1,1 35,25 Z",
  BUCCAL: "M 32,18 L 41,9 A 22,22 0 0,0 9,9 L 18,18 A 10,10 0 0,1 32,18 Z",
  LINGUAL: "M 18,32 L 9,41 A 22,22 0 0,0 41,41 L 32,32 A 10,10 0 0,1 18,32 Z",
  MESIAL: "M 18,18 L 9,9 A 22,22 0 0,0 9,41 L 18,32 A 10,10 0 0,1 18,18 Z",
  DISTAL: "M 32,32 L 41,41 A 22,22 0 0,0 41,9 L 32,18 A 10,10 0 0,1 32,32 Z",
};

/**
 * Enamel and dentine keep the same ivory in both themes. A tooth is a physical
 * object with its own colour, and it carries enough contrast against either
 * canvas — flipping it would just make the chart look like a negative.
 */
const ENAMEL = "#fffef5";
const DENTINE = "#f5f0eb";
const TOOTH_LINE = "#c9b99a";

const UPPER_ARCH = buildArch(UPPER_ROW, "upper");
const LOWER_ARCH = buildArch(LOWER_ROW, "lower");

/**
 * Teeth on the patient's right (quadrants 1 and 4) are drawn on the viewer's
 * left, so their mesial surface faces the far side of the arch. The geometry is
 * generated mesial-negative, so those two quadrants get mirrored and the whole
 * arch reads as one continuous curve rather than two rows facing the same way.
 */
function isMirrored(toothCode: number): boolean {
  const quadrant = Math.floor(toothCode / 10);
  return quadrant === 1 || quadrant === 4;
}

function ArchTooth({
  glyph,
  findings,
  labelY,
  dir,
  selected,
  onClick,
}: {
  glyph: ToothGlyph;
  findings: ToothFinding[];
  labelY: number;
  dir: 1 | -1;
  selected: boolean;
  onClick: () => void;
}) {
  const a = toothAnatomy(glyph.toothCode);
  const isMissing = findings.some((f) => f.finding === "MISSING");
  const primaryFinding = findings[0];
  const findingColor = primaryFinding ? FINDING_COLORS[primaryFinding.finding] : undefined;

  const cw = a.crownWidth * MM;
  const ch = a.crownHeight * MM;
  const rl = a.rootLength * MM;
  const half = glyph.cellWidth / 2;

  const hitTop = dir === 1 ? -(rl + 2) : -(ch + 2);
  const hitHeight = ch + rl + 4;

  return (
    <g className="group" onClick={onClick} style={{ cursor: "pointer" }}>
      <title>
        {findings.length > 0
          ? findings
              .map((f) => `${FINDING_LABELS[f.finding]}${f.note ? `: ${f.note}` : ""}`)
              .join(", ")
          : `Tooth ${glyph.toothCode} — Healthy`}
      </title>

      <rect
        x={glyph.x - half}
        y={hitTop}
        width={glyph.cellWidth}
        height={hitHeight}
        rx="2.5"
        className={
          selected
            ? "fill-brand/12 stroke-brand"
            : "fill-transparent stroke-transparent group-hover:fill-brand/8"
        }
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />

      <g
        transform={`translate(${glyph.x},0)${isMirrored(glyph.toothCode) ? " scale(-1,1)" : ""}`}
        opacity={isMissing ? 0.32 : 1}
      >
        <path
          d={glyph.root}
          fill={DENTINE}
          stroke={TOOTH_LINE}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={glyph.crown}
          fill={findingColor ? `${findingColor}26` : ENAMEL}
          stroke={findingColor ?? TOOTH_LINE}
          strokeWidth={findingColor ? 1.75 : 1}
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {isMissing && (
        <g
          stroke={FINDING_COLORS.MISSING}
          strokeWidth="1.75"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity="0.75"
        >
          <line
            x1={glyph.x - cw * 0.36}
            y1={dir * ch * 0.8}
            x2={glyph.x + cw * 0.36}
            y2={-dir * rl * 0.45}
          />
          <line
            x1={glyph.x + cw * 0.36}
            y1={dir * ch * 0.8}
            x2={glyph.x - cw * 0.36}
            y2={-dir * rl * 0.45}
          />
        </g>
      )}

      <text
        x={glyph.x}
        y={labelY}
        textAnchor="middle"
        fontSize="9"
        fontFamily="var(--font-mono, monospace)"
        fontWeight={findings.length > 0 ? 700 : 400}
        fill={findingColor ?? "var(--ink-faint)"}
      >
        {glyph.toothCode}
      </text>
    </g>
  );
}

/**
 * One <svg> for all sixteen teeth. This is the whole point: a single viewBox
 * means a single scale factor, so every crown sits on the same cervical line and
 * mesiodistal widths stay proportional to the real millimetre figures — molars
 * read wider than incisors, as they are.
 */
function ArchRow({
  arch,
  dir,
  findingsByTooth,
  selectedTooth,
  onToothClick,
}: {
  arch: ArchGlyphs;
  dir: 1 | -1;
  findingsByTooth: Map<number, ToothFinding[]>;
  selectedTooth: number | null;
  onToothClick: (code: number) => void;
}) {
  return (
    <svg viewBox={arch.viewBox} className="w-full" role="group" aria-label="Dental arch">
      {arch.teeth.map((glyph) => (
        <ArchTooth
          key={glyph.toothCode}
          glyph={glyph}
          findings={findingsByTooth.get(glyph.toothCode) ?? []}
          labelY={arch.labelY}
          dir={dir}
          selected={selectedTooth === glyph.toothCode}
          onClick={() => onToothClick(glyph.toothCode)}
        />
      ))}
    </svg>
  );
}

/**
 * Occlusal surfaces, laid out on the same proportional cell widths as the arch
 * above so each circle sits directly under its own tooth.
 */
function OcclusalRow({
  arch,
  findingsByTooth,
  onToothClick,
}: {
  arch: ArchGlyphs;
  findingsByTooth: Map<number, ToothFinding[]>;
  onToothClick: (code: number) => void;
}) {
  return (
    <div className="flex items-center">
      {arch.teeth.map((glyph) => (
        <div
          key={glyph.toothCode}
          className="flex justify-center cursor-pointer"
          style={{ width: `${(glyph.cellWidth / arch.width) * 100}%` }}
          onClick={() => onToothClick(glyph.toothCode)}
        >
          <ToothOcclusal
            toothCode={glyph.toothCode}
            findings={findingsByTooth.get(glyph.toothCode) ?? []}
          />
        </div>
      ))}
    </div>
  );
}

// Occlusal view for a single tooth
function ToothOcclusal({
  toothCode,
  findings,
}: {
  toothCode: number;
  findings: ToothFinding[];
}) {
  const surfaceFindings = new Map<string, string>();
  for (const f of findings) {
    if (f.surfaces.length === 0) continue;
    for (const s of f.surfaces) {
      if (!surfaceFindings.has(s)) {
        surfaceFindings.set(s, f.finding);
      }
    }
  }

  // Whole-tooth findings (no surfaces)
  const wholeToothFinding = findings.find((f) => f.surfaces.length === 0);

  return (
    <svg viewBox="0 0 50 50" className="w-full max-w-5">
      {/* Outline */}
      <path d="M 25,3 A 22,22 0 1,1 25,47 A 22,22 0 1,1 25,3 Z" fill="#fffef5" stroke="#c9b99a" strokeWidth="1" />
      {/* Surface fills */}
      {Object.entries(SURFACE_PATHS).map(([surface, path]) => {
        const finding = surfaceFindings.get(surface);
        if (!finding) return null;
        return (
          <path
            key={surface}
            d={path}
            fill={`${FINDING_COLORS[finding]}66`}
            stroke={FINDING_COLORS[finding]}
            strokeWidth="0.5"
          />
        );
      })}
      {/* Whole-tooth overlay */}
      {wholeToothFinding && (
        <path
          d="M 25,3 A 22,22 0 1,1 25,47 A 22,22 0 1,1 25,3 Z"
          fill={`${FINDING_COLORS[wholeToothFinding.finding]}33`}
          stroke={FINDING_COLORS[wholeToothFinding.finding]}
          strokeWidth="1"
        />
      )}
      {/* Divider lines */}
      <path d="M 18,18 L 9,9" fill="none" stroke="#d4c8a8" strokeWidth="0.5" />
      <path d="M 32,18 L 41,9" fill="none" stroke="#d4c8a8" strokeWidth="0.5" />
      <path d="M 18,32 L 9,41" fill="none" stroke="#d4c8a8" strokeWidth="0.5" />
      <path d="M 32,32 L 41,41" fill="none" stroke="#d4c8a8" strokeWidth="0.5" />
      <circle cx="25" cy="25" r="10" fill="none" stroke="#d4c8a8" strokeWidth="0.5" />
    </svg>
  );
}

const TOOTH_NAMES: Record<number, string> = {
  18: "Upper Right 3rd Molar", 17: "Upper Right 2nd Molar", 16: "Upper Right 1st Molar",
  15: "Upper Right 2nd Premolar", 14: "Upper Right 1st Premolar", 13: "Upper Right Canine",
  12: "Upper Right Lateral Incisor", 11: "Upper Right Central Incisor",
  21: "Upper Left Central Incisor", 22: "Upper Left Lateral Incisor", 23: "Upper Left Canine",
  24: "Upper Left 1st Premolar", 25: "Upper Left 2nd Premolar", 26: "Upper Left 1st Molar",
  27: "Upper Left 2nd Molar", 28: "Upper Left 3rd Molar",
  48: "Lower Right 3rd Molar", 47: "Lower Right 2nd Molar", 46: "Lower Right 1st Molar",
  45: "Lower Right 2nd Premolar", 44: "Lower Right 1st Premolar", 43: "Lower Right Canine",
  42: "Lower Right Lateral Incisor", 41: "Lower Right Central Incisor",
  31: "Lower Left Central Incisor", 32: "Lower Left Lateral Incisor", 33: "Lower Left Canine",
  34: "Lower Left 1st Premolar", 35: "Lower Left 2nd Premolar", 36: "Lower Left 1st Molar",
  37: "Lower Left 2nd Molar", 38: "Lower Left 3rd Molar",
};

export default function OdontogramChart({
  findings,
  onToothClick,
}: {
  findings: ToothFinding[];
  onToothClick?: (toothCode: number) => void;
}) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  // Group findings by tooth code
  const findingsByTooth = new Map<number, ToothFinding[]>();
  for (const f of findings) {
    if (!f.resolvedAt) {
      const existing = findingsByTooth.get(f.toothCode) ?? [];
      existing.push(f);
      findingsByTooth.set(f.toothCode, existing);
    }
  }

  function handleToothClick(code: number) {
    if (onToothClick) {
      onToothClick(code);
    } else {
      setSelectedTooth(code);
    }
  }

  const selectedFindings = selectedTooth ? findingsByTooth.get(selectedTooth) ?? [] : [];

  return (
    <div className="space-y-2 relative">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {Object.entries(FINDING_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: FINDING_COLORS[key] }} />
            <span className="text-[10px] text-ink-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Upper arch - buccal view */}
      <div className="bg-surface border border-line rounded-lg p-3">
        <div className="text-[10px] text-ink-faint mb-1 text-center font-medium">Upper Arch (Maxillary)</div>
        <ArchRow
          arch={UPPER_ARCH}
          dir={1}
          findingsByTooth={findingsByTooth}
          selectedTooth={selectedTooth}
          onToothClick={handleToothClick}
        />
        {/* Occlusal view row */}
        <div className="mt-1 border-t border-line pt-1">
          <OcclusalRow
            arch={UPPER_ARCH}
            findingsByTooth={findingsByTooth}
            onToothClick={handleToothClick}
          />
        </div>
      </div>

      {/* Lower arch - buccal view */}
      <div className="bg-surface border border-line rounded-lg p-3">
        {/* Occlusal view row */}
        <div className="mb-1 border-b border-line pb-1">
          <OcclusalRow
            arch={LOWER_ARCH}
            findingsByTooth={findingsByTooth}
            onToothClick={handleToothClick}
          />
        </div>
        <ArchRow
          arch={LOWER_ARCH}
          dir={-1}
          findingsByTooth={findingsByTooth}
          selectedTooth={selectedTooth}
          onToothClick={handleToothClick}
        />
        <div className="text-[10px] text-ink-faint mt-1 text-center font-medium">Lower Arch (Mandibular)</div>
      </div>

      {/* Selected Tooth Inspector Modal */}
      {selectedTooth && (
        <div className="fixed inset-0 z-50 scrim flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  FDI Notation #{selectedTooth}
                </span>
                <h3 className="font-bold text-sm text-ink">
                  {TOOTH_NAMES[selectedTooth] || `Tooth #${selectedTooth}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTooth(null)}
                className="p-1 text-ink-faint hover:text-ink rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedFindings.length === 0 ? (
              <div className="py-4 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-ink">Healthy Tooth</p>
                <p className="text-xs text-ink-faint">No active findings or restorations recorded.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Recorded Findings ({selectedFindings.length})
                </div>
                {selectedFindings.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl border border-line bg-canvas space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${FINDING_COLORS[f.finding]}20`,
                          color: FINDING_COLORS[f.finding],
                        }}
                      >
                        {FINDING_LABELS[f.finding] || f.finding}
                      </span>
                      {f.surfaces && f.surfaces.length > 0 && (
                        <span className="text-[10px] text-ink-muted font-mono font-medium">
                          {f.surfaces.join(", ")}
                        </span>
                      )}
                    </div>
                    {f.note && (
                      <p className="text-xs text-ink-muted mt-1">{f.note}</p>
                    )}
                    <span className="text-[10px] text-ink-faint block mt-1">
                      Charted: {new Date(f.chartedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTooth(null)}
                className="w-full py-2 text-xs font-semibold rounded-xl bg-raised hover:bg-line text-ink transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

