"use client";

import { useMemo, useState } from "react";
import {
  MM,
  LABEL_SIZE,
  buildArch,
  type ToothGlyph,
} from "@/lib/odontogram/buccal-path";
import { MAX_CROWN_HEIGHT, MAX_ROOT_LENGTH } from "@/lib/odontogram/tooth-anatomy";

/**
 * The hero odontogram.
 *
 * Renders the same geometry the clinical chart uses — lib/odontogram — rather
 * than a marketing lookalike, so what the pitch audience sees on the landing
 * page is literally the product's charting engine. That also buys symmetry for
 * free: every tooth is generated from one millimetre table, both rows share a
 * single horizontal scale, and quadrants 1 and 4 are mirrored, so the arch
 * closes on an exact midline instead of being eyeballed.
 */

const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

/** Same palette as OdontogramChart, so hero and chart can't drift apart. */
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
  EXTRACTION_INDICATED: "Extraction indicated",
};

/** Kept sparse on purpose — a plausible adult record, not a catalogue of every finding type. */
const CHART: Record<number, { finding: keyof typeof FINDING_COLORS; note: string }> = {
  16: { finding: "CROWN", note: "Ceramic crown, margin stable at four-year review." },
  23: { finding: "CARIES", note: "Early distal enamel lesion — monitor or restore." },
  26: { finding: "ENDODONTIC", note: "Root canal complete, asymptomatic at recall." },
  36: { finding: "RESTORATION", note: "Occlusal composite, mild marginal staining." },
  46: { finding: "RESTORATION", note: "Occlusal composite placed at the last visit." },
  48: { finding: "MISSING", note: "Extracted 2023. No replacement planned." },
};

const TOOTH_NAMES: Record<number, string> = {
  1: "Central incisor",
  2: "Lateral incisor",
  3: "Canine",
  4: "1st premolar",
  5: "2nd premolar",
  6: "1st molar",
  7: "2nd molar",
  8: "3rd molar",
};

const QUADRANT_NAMES: Record<number, string> = {
  1: "Upper right",
  2: "Upper left",
  3: "Lower left",
  4: "Lower right",
};

function toothName(code: number): string {
  return `${QUADRANT_NAMES[Math.floor(code / 10)]} ${TOOTH_NAMES[code % 10].toLowerCase()}`;
}

/**
 * Quadrants 1 and 4 sit on the viewer's left, so their mesial surface has to
 * face the far side of the arch. The geometry is generated mesial-negative,
 * which means those two quadrants get flipped and the whole mouth reads as one
 * continuous curve rather than two rows pointing the same way.
 */
function isMirrored(code: number): boolean {
  const q = Math.floor(code / 10);
  return q === 1 || q === 4;
}

const CROWN_EXTENT = MAX_CROWN_HEIGHT * MM;
const ROOT_EXTENT = MAX_ROOT_LENGTH * MM;
/** Space between the two occlusal edges — the bite line. */
const OCCLUSAL_GAP = 13;
/** Clearance between root apices and the FDI numbers. */
const LABEL_GAP = 9;

const LOWER_ORIGIN = CROWN_EXTENT * 2 + OCCLUSAL_GAP;
const UPPER_LABEL_Y = -(ROOT_EXTENT + LABEL_GAP);
const LOWER_LABEL_Y = LOWER_ORIGIN + ROOT_EXTENT + LABEL_GAP + LABEL_SIZE * 0.8;
const TOP = UPPER_LABEL_Y - LABEL_SIZE;
const BOTTOM = LOWER_LABEL_Y + LABEL_SIZE * 0.4;

function Tooth({
  glyph,
  arch,
  originY,
  labelY,
  active,
  onPick,
}: {
  glyph: ToothGlyph;
  arch: "upper" | "lower";
  originY: number;
  labelY: number;
  active: boolean;
  onPick: () => void;
}) {
  const chart = CHART[glyph.toothCode];
  const color = chart ? FINDING_COLORS[chart.finding] : undefined;
  const missing = chart?.finding === "MISSING";
  const half = glyph.cellWidth / 2;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Tooth ${glyph.toothCode}, ${toothName(glyph.toothCode)}${
        chart ? `, ${FINDING_LABELS[chart.finding]}` : ", healthy"
      }`}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      style={{ cursor: "pointer" }}
    >
      {/* Full-height hit target so the thin incisors are still easy to hit.
          Roots grow away from the bite line, so the two arches start from
          opposite edges of the same span. */}
      <rect
        x={glyph.x - half}
        y={arch === "upper" ? originY - ROOT_EXTENT : originY - CROWN_EXTENT}
        width={glyph.cellWidth}
        height={ROOT_EXTENT + CROWN_EXTENT}
        fill="transparent"
        rx="3"
      />

      <g
        transform={`translate(${glyph.x} ${originY})${isMirrored(glyph.toothCode) ? " scale(-1,1)" : ""}`}
        opacity={missing ? 0.26 : 1}
      >
        <path d={glyph.root} fill="url(#hero-dentine)" stroke="rgba(201,185,154,0.5)" strokeWidth="0.7" />
        <path
          d={glyph.crown}
          fill={color ? `${color}2e` : "url(#hero-enamel)"}
          stroke={color ?? "rgba(201,185,154,0.72)"}
          strokeWidth={color ? 1.5 : 0.8}
        />
      </g>

      {/* Selection reads as a chip on the FDI number rather than a panel behind
          the tooth — a box floating over a thin root looks like an artefact. */}
      {active && (
        <rect
          x={glyph.x - 9.5}
          y={labelY - LABEL_SIZE + 1}
          width={19}
          height={LABEL_SIZE + 3}
          rx="2.5"
          fill="rgba(216,184,104,0.16)"
          stroke="rgba(216,184,104,0.5)"
          strokeWidth="0.6"
        />
      )}

      <text
        x={glyph.x}
        y={labelY}
        textAnchor="middle"
        fontSize={LABEL_SIZE}
        fill={active ? "var(--champagne)" : color ?? "rgba(255,255,255,0.34)"}
        fontWeight={chart || active ? 600 : 400}
        style={{ fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}
      >
        {glyph.toothCode}
      </text>
    </g>
  );
}

export default function HeroOdontogram() {
  const upper = useMemo(() => buildArch(UPPER_ROW, "upper"), []);
  const lower = useMemo(() => buildArch(LOWER_ROW, "lower"), []);
  const [picked, setPicked] = useState(23);

  const chart = CHART[picked];
  const findingCount = Object.keys(CHART).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] uppercase text-white/48">Full-mouth record</p>
        <p className="text-[11px] text-[var(--champagne)]">FDI · 32 teeth</p>
      </div>

      <div className="relative overflow-hidden rounded-[6px] border border-white/8 bg-black/25">
        <svg
          viewBox={`0 ${TOP} ${upper.width} ${BOTTOM - TOP}`}
          className="h-full w-full"
          role="img"
          aria-label="Interactive full-mouth odontogram in FDI notation"
        >
          <defs>
            <linearGradient id="hero-enamel" x1="0" y1="0" x2="0.25" y2="1">
              <stop offset="0%" stopColor="#fffef7" />
              <stop offset="55%" stopColor="#f6efe2" />
              <stop offset="100%" stopColor="#ddd0b6" />
            </linearGradient>
            <linearGradient id="hero-dentine" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor="#efe7d8" />
              <stop offset="100%" stopColor="#c9b99a" />
            </linearGradient>
          </defs>

          {/* Midline and bite line — the two axes the symmetry is built on. */}
          <line
            x1={upper.width / 2}
            y1={TOP}
            x2={upper.width / 2}
            y2={BOTTOM}
            stroke="rgba(216,184,104,0.16)"
            strokeWidth="0.6"
            strokeDasharray="3 4"
          />
          <line
            x1="0"
            y1={CROWN_EXTENT + OCCLUSAL_GAP / 2}
            x2={upper.width}
            y2={CROWN_EXTENT + OCCLUSAL_GAP / 2}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.6"
          />

          {upper.teeth.map((glyph) => (
            <Tooth
              key={glyph.toothCode}
              glyph={glyph}
              arch="upper"
              originY={0}
              labelY={UPPER_LABEL_Y}
              active={picked === glyph.toothCode}
              onPick={() => setPicked(glyph.toothCode)}
            />
          ))}

          {lower.teeth.map((glyph) => (
            <Tooth
              key={glyph.toothCode}
              glyph={glyph}
              arch="lower"
              originY={LOWER_ORIGIN}
              labelY={LOWER_LABEL_Y}
              active={picked === glyph.toothCode}
              onPick={() => setPicked(glyph.toothCode)}
            />
          ))}
        </svg>
      </div>

      <div className="mt-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border"
            style={{
              borderColor: chart ? `${FINDING_COLORS[chart.finding]}55` : "rgba(216,184,104,0.3)",
              background: chart ? `${FINDING_COLORS[chart.finding]}1a` : "rgba(216,184,104,0.1)",
            }}
          >
            <span
              className="numeral text-[15px]"
              style={{ color: chart ? FINDING_COLORS[chart.finding] : "var(--champagne)" }}
            >
              {picked}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] text-white">
              {toothName(picked)}
              {chart && (
                <span style={{ color: FINDING_COLORS[chart.finding] }}>
                  {" · "}
                  {FINDING_LABELS[chart.finding]}
                </span>
              )}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-white/52">
              {chart?.note ?? "No active finding. Healthy surfaces stay unmarked."}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-white/38">
        {findingCount} active findings charted · tap any tooth
      </p>
    </div>
  );
}
