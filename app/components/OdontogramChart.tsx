"use client";

import type { ToothFinding } from "@/lib/contract";

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

// Anatomical lateral view SVG paths per tooth position (1=central incisor → 8=third molar)
// Adapted from the reference odontogram module
const LATERAL_PATHS: Record<number, { viewBox: string; crown: string; root: string; roots?: string[] }> = {
  1: {
    viewBox: "0 0 46 134",
    crown: "M39.23 94.64C33.12 85.54 14.14 86.05 6.65 94.64C-0.67 102.08 0.29 121.08 3.03 127.81C15.64 135.55 38.11 133.68 43.85 128.44C46.72 121.83 43.85 103.75 39.23 94.64Z",
    root: "M18.14 13.84C16.14 42.37 9.65 79.43 6.65 94.39C18.95 99.89 26.18 100.44 39.86 95.52C40.48 78.93 40.06 39.58 33.37 14.84C26.95 -8.88 18.91 2.76 18.14 13.84Z",
  },
  2: {
    viewBox: "0 0 40 125",
    crown: "M36.09 86.49C33.71 80.36 11.24 78.61 6.62 84.86C0.82 92.71 0.25 113.27 1.62 116.15C3 119.02 8.87 122.15 18.61 123.65C28.34 125.16 35.71 121.53 37.96 117.65C40.21 113.77 38.46 92.62 36.09 86.49Z",
    root: "M12.49 53.08C10.41 62.21 9.41 74.19 8.62 83.11C16.28 89.51 36.34 86.74 36.34 86.74C36.34 86.74 34.75 75.1 35.09 71.48C37.61 44.6 35.37 25.05 34.21 18.42C32.63 12.46 28.47 0.33 22.48 1.03C14.98 1.9 18.36 19.3 17.73 26.8C17 35.57 14.11 45.95 12.49 53.08Z",
  },
  3: {
    viewBox: "0 0 47 146",
    crown: "M44.56 115.13C42.55 107.14 40.79 95.68 22.91 95.9C3.62 96.14 1 114.9 1 129.99C1 136.11 7.91 141.25 12.83 143.6C17.35 145.76 30.86 145.16 34.24 143.6C37.76 141.98 41.31 141.2 44.56 135.11C46.83 130.86 46.1 121.21 44.56 115.13Z",
    root: "M9.09 76.42C8.17 80.93 7.18 95.95 6.79 102.89C6.79 102.89 16.31 107.78 22.91 107.89C29.88 108 40.03 102.89 40.03 102.89C38.11 97.87 34.79 71.27 35.43 67.13C36.07 62.99 34.4 42.91 33.51 38.39C32.62 33.88 30.31 20.58 29.93 15.06C29.55 9.53 25.97 0.88 22.39 1C18.81 1.13 19.06 4.01 18.17 5.52C17.27 7.02 17.15 16.56 16.76 20.58C16.38 24.59 16.38 25.6 14.59 29.36C12.8 33.12 11.78 43.79 11.78 47.05C11.78 50.32 10.24 70.77 9.09 76.42Z",
  },
  4: {
    viewBox: "0 0 40 100",
    crown: "M33.75 62.5C30 58.5 10.25 58.5 7.25 62.5C2 69.5 1.25 77.75 1.25 81.5C1 84.25 3.75 89.75 18.25 91.5C36.25 93.5 38.75 84 38.75 82C38.75 78.5 37.75 67 33.5 62.5Z",
    root: "M21.5 27.75C24 20 25.5 14 26 10C26.25 8.25 24.5 1.5 26.5 1.5C28.75 1.5 34.75 9.5 35.5 15C36.25 20.25 35 37.25 34.25 44C33.5 49.5 33.5 58.25 33.75 62C21.25 69.5 15.75 69 7.25 62.5C7.25 62.5 9.25 58.75 9.75 50C10 44.75 8.25 35.75 8 29.75C6.75 13.5 11.75 2 14.5 1.5C18 1.75 18 19.5 22.5 27.25Z",
  },
  5: {
    viewBox: "0 0 40 125",
    crown: "M32.04 80.33C25.36 76.72 12.38 76.96 8.17 80.33C2.73 89.06 -0.02 103.79 1.34 110.4C2.71 117.01 18.54 125.61 21.26 123.74C24.64 121.41 38.33 113.14 38.94 108.4C39.56 103.66 34.86 94.56 34.62 87.82C34.42 82.44 32.98 80.84 32.04 80.33Z",
    root: "M9.01 60.26C8.22 63.85 8.11 75.06 8.15 80.22C17.52 82.19 23.09 82.74 33.63 81.96C33.5 81.09 32.51 72.98 31.65 65.87C30.76 58.57 31.03 49.41 31.03 46.54C31.03 43.68 29.92 33.32 28.43 29.58C26.95 25.84 27.57 18.48 26.82 15.37C26.08 12.25 20.89 0.4 17.92 1.02C14.95 1.65 17.18 6.39 16.19 15.99C15.4 23.67 12.85 34.53 11.98 37.07C10.74 40.31 10 55.77 9.01 60.26Z",
  },
  6: {
    viewBox: "0 0 64 128",
    crown: "M52.57 83.82C38.65 77.17 21.25 79.22 11.78 82.68C9.78 83.41 8.24 84.97 7.35 86.91C5.11 91.82 1 101.87 1 109.44C1 114.19 5.87 124.63 14.03 126.18C20.44 127.41 24.73 122.82 31.81 122.69C39.66 122.54 44.4 129.29 51.6 126.18C58.8 123.08 64.55 115.02 62.63 109.44C60.88 104.38 59.62 92.66 54.53 85.87C54.01 85.16 53.4 84.21 52.57 83.82Z",
    root: "M31.69 1C25.11 1 26.99 28.86 19.79 35.23C21.12 45.81 28.55 59.4 32.31 60.47C35.82 61.47 44.09 37.23 45.72 28.86C41.08 22.74 37.2 1 31.69 1Z",
    roots: [
      "M31.69 1C25.11 1 26.99 28.86 19.79 35.23C21.12 45.81 28.55 59.4 32.31 60.47C35.82 61.47 44.09 37.23 45.72 28.86C41.08 22.74 37.2 1 31.69 1Z",
      "M54.54 84.98C54.54 83.5 52.53 73.46 54.54 64.87C57.04 54.12 59.3 40.88 59.3 31.38C59.3 22.42 58.74 10.9 52.14 5.22C51.59 4.74 50.77 5.08 50.65 5.8C48.29 19.52 42.5 48.13 33.24 59.87C30.55 63.28 16.64 32.36 13 10.59C12.87 9.78 11.91 9.48 11.44 10.15C8.49 14.27 4.7 23.86 6.44 39.13C8.94 61.12 9.95 59.24 9.95 68.36C9.95 72.15 8.43 80.78 7.65 85.14",
    ],
  },
  7: {
    viewBox: "0 0 66 124",
    crown: "M57.66 80.83C57.26 80.53 56.84 80.23 56.41 79.95C44.87 72.4 23.16 74.65 11.32 76.96C10.19 77.2 8.71 77.85 7.72 78.73C7.41 79 7.15 79.3 6.97 79.62C-7.55 104.35 8.36 122.84 13.43 122.84C18.65 122.84 21.14 113.84 28.59 112.84C36.04 111.83 46.48 124.59 52.69 122.84C57.5 121.48 63.87 109.46 64.86 104.71C65.85 99.96 61.38 83.83 57.66 80.83Z",
    root: "M23.12 1.08C17.96 4.38 17.66 22.63 18.16 31.33C20.64 39.25 26.9 54.48 32.07 52.08C37.23 49.68 39.11 39.92 39.4 35.33C34.18 29.33 30.2 17.71 30.2 15.33C30.2 12.96 28.22 -0.17 23.12 1.08Z",
    roots: [
      "M23.12 1.08C17.96 4.38 17.66 22.63 18.16 31.33C20.64 39.25 26.9 54.48 32.07 52.08C37.23 49.68 39.11 39.92 39.4 35.33C34.18 29.33 30.2 17.71 30.2 15.33C30.2 12.96 28.22 -0.17 23.12 1.08Z",
      "M10.79 62.95C11.68 68.87 7 78.5 7.31 78.77C27.65 73.53 38.32 73.76 56.01 80C58.33 72.06 59.49 47.65 54.52 30.85C48.51 10.54 40.52 6.65 38 7.02C34.77 9.66 40.73 23.33 39.74 31.98C39.23 36.35 34.15 54.3 31.16 51.67C22.47 45.02 18.68 33.67 17.37 30.85C16.28 28.49 15.39 18.31 15.01 15.68C14.64 13.04 12.96 8.28 10.79 8.65C8.62 9.03 5.87 15.83 4.45 22.32C3.34 27.46 4.45 40 5.94 47.65C7.37 54.98 9.8 56.38 10.79 62.95Z",
    ],
  },
  8: {
    viewBox: "0 0 67 104",
    crown: "M58.13 63.43C48.14 53.95 13.93 57.94 8.19 62.18C5.32 66.26 -0.1 76.68 1.2 85.77C2.33 93.71 8.96 100.62 11.94 100.99C17.93 101.74 27.54 95.37 33.79 96.37C40.03 97.37 44.02 103.36 48.77 102.98C53.51 102.61 59.88 99.36 64.62 92.88C69.37 82.15 60.5 70.79 58.13 63.43Z",
    root: "M30.98 1.1C28.54 1.78 24.9 7.08 24.42 9.7C24.25 20.46 25.92 41.17 33.91 37.98C41.9 34.79 41.48 20.88 40.28 14.32C39.53 12.26 34.16 0.2 30.98 1.1Z",
    roots: [
      "M30.98 1.1C28.54 1.78 24.9 7.08 24.42 9.7C24.25 20.46 25.92 41.17 33.91 37.98C41.9 34.79 41.48 20.88 40.28 14.32C39.53 12.26 34.16 0.2 30.98 1.1Z",
      "M40.88 4.12C58.06 11.41 58.15 46.13 56.98 62.14C38.32 55.49 27.36 55.83 7.04 63C9.64 60.5 10.12 54.03 10.04 52.16C9.75 45.66 6.61 42.3 7.04 31.82C7.94 10.06 15.16 3.54 18.65 3C24.17 3 27.38 27.63 32.16 35.99C32.46 36.51 33.12 36.55 33.44 36.04C34.57 34.23 36.45 30.14 38.38 24.59C41.38 15.98 35.76 2.25 40.88 4.12Z",
    ],
  },
};

function getToothPosition(toothNumber: number): number {
  return toothNumber % 10;
}

function getToothTransform(toothNumber: number, isUpper: boolean): string {
  const quadrant = Math.floor(toothNumber / 10);
  // For lateral view: upper teeth have roots pointing up (default), lower have roots pointing down
  // Q1: no transform (upper right)
  // Q2: mirror horizontal (upper left)
  // Q3: mirror both (lower left, already flipped for display)
  // Q4: mirror vertical (lower right, already flipped for display)
  switch (quadrant) {
    case 1: return "";
    case 2: return "scale(-1,1)";
    case 3: return "scale(-1,1)"; // Lower left, we flip Y separately
    case 4: return ""; // Lower right, we flip Y separately
    default: return "";
  }
}

function ToothSVG({
  toothCode,
  findings,
  isUpper,
  onClick,
}: {
  toothCode: number;
  findings: ToothFinding[];
  isUpper: boolean;
  onClick?: () => void;
}) {
  const position = getToothPosition(toothCode);
  const paths = LATERAL_PATHS[position];
  if (!paths) return null;

  const isMissing = findings.some((f) => f.finding === "MISSING");
  const primaryFinding = findings[0];
  const findingColor = primaryFinding ? FINDING_COLORS[primaryFinding.finding] : undefined;

  // Parse viewBox dimensions
  const [, , vbW, vbH] = paths.viewBox.split(" ").map(Number);
  const transform = getToothTransform(toothCode, isUpper);

  return (
    <div
      className="flex flex-col items-center gap-0.5 cursor-pointer group tooth-cell"
      onClick={onClick}
      title={
        findings.length > 0
          ? findings.map((f) => `${FINDING_LABELS[f.finding]}${f.note ? `: ${f.note}` : ""}`).join(", ")
          : `Tooth ${toothCode} — Healthy`
      }
    >
      {/* Tooth number */}
      {isUpper && (
        <span className={`text-[10px] font-mono ${findings.length > 0 ? "font-bold text-gray-900" : "text-gray-400"}`}>
          {toothCode}
        </span>
      )}

      {/* SVG tooth */}
      <svg
        viewBox={paths.viewBox}
        className="w-6 h-14 transition-transform group-hover:scale-110"
        style={{
          transform: isUpper ? undefined : "scaleY(-1)",
          opacity: isMissing ? 0.3 : 1,
        }}
      >
        <g transform={transform ? `translate(${vbW},0) ${transform}` : undefined}>
          {/* Root(s) */}
          {paths.roots ? (
            paths.roots.map((r, i) => (
              <path key={i} d={r} fill="#f5f0eb" stroke="#c9b99a" strokeWidth="1.5" />
            ))
          ) : (
            <path d={paths.root} fill="#f5f0eb" stroke="#c9b99a" strokeWidth="1.5" />
          )}
          {/* Crown */}
          <path
            d={paths.crown}
            fill={findingColor ? `${findingColor}22` : "#fffef5"}
            stroke={findingColor ?? "#c9b99a"}
            strokeWidth={findingColor ? 2 : 1.5}
          />
          {/* Missing X overlay */}
          {isMissing && (
            <g stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
              <line x1={vbW * 0.2} y1={vbH * 0.15} x2={vbW * 0.8} y2={vbH * 0.85} />
              <line x1={vbW * 0.8} y1={vbH * 0.15} x2={vbW * 0.2} y2={vbH * 0.85} />
            </g>
          )}
        </g>
      </svg>

      {/* Tooth number (lower) */}
      {!isUpper && (
        <span className={`text-[10px] font-mono ${findings.length > 0 ? "font-bold text-gray-900" : "text-gray-400"}`}>
          {toothCode}
        </span>
      )}

      {/* Finding indicator dot */}
      {findingColor && !isMissing && (
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: findingColor }}
        />
      )}
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
    <svg viewBox="0 0 50 50" className="w-5 h-5">
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

import { useState } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";

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
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Upper arch - lateral view */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="text-[10px] text-gray-400 mb-1 text-center font-medium">Upper Arch (Maxillary)</div>
        <div className="flex justify-center items-end gap-0.5">
          {UPPER_ROW.map((code) => (
            <ToothSVG
              key={code}
              toothCode={code}
              findings={findingsByTooth.get(code) ?? []}
              isUpper={true}
              onClick={() => handleToothClick(code)}
            />
          ))}
        </div>
        {/* Occlusal view row */}
        <div className="flex justify-center gap-0.5 mt-1 border-t border-gray-100 pt-1">
          {UPPER_ROW.map((code) => (
            <div key={code} className="w-6 flex justify-center cursor-pointer" onClick={() => handleToothClick(code)}>
              <ToothOcclusal
                toothCode={code}
                findings={findingsByTooth.get(code) ?? []}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lower arch - lateral view */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        {/* Occlusal view row */}
        <div className="flex justify-center gap-0.5 mb-1 border-b border-gray-100 pb-1">
          {LOWER_ROW.map((code) => (
            <div key={code} className="w-6 flex justify-center cursor-pointer" onClick={() => handleToothClick(code)}>
              <ToothOcclusal
                toothCode={code}
                findings={findingsByTooth.get(code) ?? []}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-center items-start gap-0.5">
          {LOWER_ROW.map((code) => (
            <ToothSVG
              key={code}
              toothCode={code}
              findings={findingsByTooth.get(code) ?? []}
              isUpper={false}
              onClick={() => handleToothClick(code)}
            />
          ))}
        </div>
        <div className="text-[10px] text-gray-400 mt-1 text-center font-medium">Lower Arch (Mandibular)</div>
      </div>

      {/* Selected Tooth Inspector Modal */}
      {selectedTooth && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  FDI Notation #{selectedTooth}
                </span>
                <h3 className="font-bold text-sm text-stone-900">
                  {TOOTH_NAMES[selectedTooth] || `Tooth #${selectedTooth}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTooth(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedFindings.length === 0 ? (
              <div className="py-4 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-stone-800">Healthy Tooth</p>
                <p className="text-xs text-stone-400">No active findings or restorations recorded.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Recorded Findings ({selectedFindings.length})
                </div>
                {selectedFindings.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl border border-stone-200/80 bg-stone-50 space-y-1"
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
                        <span className="text-[10px] text-stone-500 font-mono font-medium">
                          {f.surfaces.join(", ")}
                        </span>
                      )}
                    </div>
                    {f.note && (
                      <p className="text-xs text-stone-600 mt-1">{f.note}</p>
                    )}
                    <span className="text-[10px] text-stone-400 block mt-1">
                      Charted: {new Date(f.chartedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTooth(null)}
                className="w-full py-2 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
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

