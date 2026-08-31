/**
 * Maxillary arch geometry for the marketing visualisers.
 *
 * Crown outlines are based on Wheeler's dental anatomy proportions with
 * anatomically recognisable silhouettes: shovel-shaped incisors, pointed
 * canine cusps, bicuspid premolars, and multi-cusped molars.
 *
 * Anterior widths follow the golden proportion used in smile design: the
 * *apparent* widths of central : lateral : canine read as 1.618 : 1.0 : 0.618
 * from a frontal view.
 */

export const UPPER_ARCH = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

export type ToothKind = "incisor" | "canine" | "premolar" | "molar";

/** Keyed by position from the midline: 1 = central incisor, 8 = 3rd molar. */
const TOOTH_CLASS: Record<
  number,
  { name: string; width: number; height: number; kind: ToothKind }
> = {
  1: { name: "Central Incisor", width: 1.618, height: 1.0, kind: "incisor" },
  2: { name: "Lateral Incisor", width: 1.0, height: 0.79, kind: "incisor" },
  3: { name: "Canine", width: 0.618, height: 0.97, kind: "canine" },
  4: { name: "1st Premolar", width: 0.56, height: 0.74, kind: "premolar" },
  5: { name: "2nd Premolar", width: 0.5, height: 0.67, kind: "premolar" },
  6: { name: "1st Molar", width: 0.62, height: 0.71, kind: "molar" },
  7: { name: "2nd Molar", width: 0.52, height: 0.67, kind: "molar" },
  8: { name: "3rd Molar", width: 0.4, height: 0.62, kind: "molar" },
};

const UNIT_W = 40;
const CROWN_H = 132;
/** How far the incisal edges rise toward the commissures. */
const SMILE_ARC = 40;

export interface ToothNode {
  code: number;
  /** 1 = patient's upper right (screen left), 2 = upper left. */
  quadrant: number;
  name: string;
  kind: ToothKind;
  width: number;
  height: number;
  /** Centre of the tooth on the x axis. */
  x: number;
  /** Cervical (gum) edge. Crown runs from here down to y + height. */
  y: number;
  rotation: number;
  /** 0 at the midline, 1 at the last molar — drives shading and blur. */
  depth: number;
  path: string;
}

export interface ArchLayout {
  teeth: ToothNode[];
  width: number;
  /** x of the facial midline. */
  midline: number;
  /** Lowest incisal edge, i.e. the central incisors. */
  incisalBase: number;
  gingivalTop: number;
  /** Scalloped gingival margin path for overlay rendering. */
  gumPath: string;
}

function positionFromMidline(code: number): number {
  return code % 10;
}

const n = (v: number) => Math.round(v * 100) / 100;

/**
 * Anatomically accurate crown outlines. Each tooth class has a distinct,
 * recognisable silhouette drawn from cervical edge (y=0) downward, centred
 * on x=0.
 *
 * - Incisors: Shovel-shaped with flat labial surface, gentle cervical taper,
 *   wide incisal edge with softly rounded corners.
 * - Canines: Prominent cusp tip (the classic "fang" point), widest at the
 *   cervical third, tapering to a single cusp.
 * - Premolars: Two gentle cusp tips with a central groove (buccal view
 *   shows the buccal cusp as a soft ridge).
 * - Molars: Broad multi-cusped crowns, wider than tall, with subtle cuspal
 *   ridges and a wider cervical neck.
 */
export function toothPath(w: number, h: number, kind: ToothKind): string {
  const hw = w / 2;

  if (kind === "incisor") {
    // Shovel-shaped: narrow cervical, widens to a broad flat incisal edge
    // with softly rounded mesial/distal corners.
    const cw = hw * 0.78; // cervical width (narrower than crown)
    const bulge = hw * 0.06; // slight labial convexity
    const ir = Math.min(w * 0.14, h * 0.12); // incisal corner radius

    return [
      // Start at cervical-mesial
      `M ${n(-cw)} 0`,
      // Mesial surface: slight S-curve widening from cervical to contact
      `C ${n(-cw - bulge)} ${n(h * 0.18)} ${n(-hw)} ${n(h * 0.32)} ${n(-hw)} ${n(h * 0.48)}`,
      // Continue widening toward incisal
      `C ${n(-hw)} ${n(h * 0.65)} ${n(-hw)} ${n(h * 0.78)} ${n(-hw)} ${n(h - ir)}`,
      // Incisal-mesial corner (rounded)
      `Q ${n(-hw)} ${n(h)} ${n(-hw + ir)} ${n(h)}`,
      // Flat incisal edge with very subtle mamellon undulation
      `C ${n(-hw * 0.45)} ${n(h * 0.995)} ${n(-hw * 0.15)} ${n(h * 1.003)} 0 ${n(h * 1.003)}`,
      `C ${n(hw * 0.15)} ${n(h * 1.003)} ${n(hw * 0.45)} ${n(h * 0.995)} ${n(hw - ir)} ${n(h)}`,
      // Incisal-distal corner (rounded)
      `Q ${n(hw)} ${n(h)} ${n(hw)} ${n(h - ir)}`,
      // Distal surface: mirror of mesial
      `C ${n(hw)} ${n(h * 0.78)} ${n(hw)} ${n(h * 0.65)} ${n(hw)} ${n(h * 0.48)}`,
      `C ${n(hw)} ${n(h * 0.32)} ${n(cw + bulge)} ${n(h * 0.18)} ${n(cw)} 0`,
      "Z",
    ].join(" ");
  }

  if (kind === "canine") {
    // Prominent single cusp (fang shape): widest at the junction of
    // cervical and middle thirds, tapering to a pointed cusp tip.
    const cw = hw * 0.72; // cervical neck
    const maxW = hw * 1.0; // widest point of the crown
    const cuspSharp = h * 0.05; // how far below full height the cusp sits

    return [
      // Start at cervical-mesial
      `M ${n(-cw)} 0`,
      // Mesial: bulges outward to max width at ~35% height
      `C ${n(-cw * 1.1)} ${n(h * 0.12)} ${n(-maxW)} ${n(h * 0.22)} ${n(-maxW)} ${n(h * 0.35)}`,
      // Continues toward cusp — narrows significantly
      `C ${n(-maxW)} ${n(h * 0.50)} ${n(-hw * 0.8)} ${n(h * 0.68)} ${n(-hw * 0.55)} ${n(h * 0.82)}`,
      // Mesial cusp ridge — steep ascent to the cusp tip
      `C ${n(-hw * 0.32)} ${n(h * 0.92)} ${n(-hw * 0.12)} ${n(h * 0.98)} 0 ${n(h - cuspSharp)}`,
      // Distal cusp ridge — descent from tip, slightly more gradual (asymmetric)
      `C ${n(hw * 0.15)} ${n(h * 0.97)} ${n(hw * 0.38)} ${n(h * 0.90)} ${n(hw * 0.58)} ${n(h * 0.80)}`,
      // Widens back out through the middle third
      `C ${n(hw * 0.82)} ${n(h * 0.66)} ${n(maxW)} ${n(h * 0.48)} ${n(maxW)} ${n(h * 0.35)}`,
      // Back to cervical-distal
      `C ${n(maxW)} ${n(h * 0.22)} ${n(cw * 1.1)} ${n(h * 0.12)} ${n(cw)} 0`,
      "Z",
    ].join(" ");
  }

  if (kind === "premolar") {
    // Bicuspid: two gentle cusp tips visible from buccal view (buccal cusp
    // is taller than lingual, which is partially hidden). Overall oval crown
    // with a subtle "notch" at the occlusal surface between cusps.
    const cw = hw * 0.82; // cervical neck
    const bodyW = hw * 0.96; // crown body (slightly wider than cervical)
    const cuspH = h * 0.08; // how pronounced the cusp tips are
    const grooveDepth = h * 0.04; // central fissure dip

    return [
      // Cervical-mesial
      `M ${n(-cw)} 0`,
      // Mesial wall: slight outward bulge
      `C ${n(-cw * 1.05)} ${n(h * 0.15)} ${n(-bodyW)} ${n(h * 0.28)} ${n(-bodyW)} ${n(h * 0.42)}`,
      // Continue to cusp region
      `C ${n(-bodyW)} ${n(h * 0.60)} ${n(-bodyW * 0.95)} ${n(h * 0.75)} ${n(-hw * 0.7)} ${n(h * 0.87)}`,
      // Mesial (buccal) cusp tip
      `Q ${n(-hw * 0.4)} ${n(h + cuspH)} ${n(-hw * 0.12)} ${n(h - grooveDepth)}`,
      // Central groove dip — the key bicuspid identifier
      `Q 0 ${n(h - grooveDepth * 1.8)} ${n(hw * 0.12)} ${n(h - grooveDepth)}`,
      // Distal (lingual) cusp tip — slightly shorter
      `Q ${n(hw * 0.4)} ${n(h + cuspH * 0.8)} ${n(hw * 0.7)} ${n(h * 0.87)}`,
      // Distal wall
      `C ${n(bodyW * 0.95)} ${n(h * 0.75)} ${n(bodyW)} ${n(h * 0.60)} ${n(bodyW)} ${n(h * 0.42)}`,
      `C ${n(bodyW)} ${n(h * 0.28)} ${n(cw * 1.05)} ${n(h * 0.15)} ${n(cw)} 0`,
      "Z",
    ].join(" ");
  }

  // Molar: broad multi-cusped crown, wider than tall. Distinguished by
  // a flatter, undulating occlusal surface with 3-4 visible cusps and
  // a wide cervical neck relative to the crown body.
  const cw = hw * 0.88; // cervical neck (wide for molars)
  const bodyW = hw * 0.98;
  const cuspH = h * 0.06;
  const grooveD = h * 0.05;

  return [
    // Cervical-mesial
    `M ${n(-cw)} 0`,
    // Mesial wall: gentle convex bulge
    `C ${n(-cw * 1.03)} ${n(h * 0.14)} ${n(-bodyW)} ${n(h * 0.26)} ${n(-bodyW)} ${n(h * 0.40)}`,
    // Through contact area toward occlusal
    `C ${n(-bodyW)} ${n(h * 0.58)} ${n(-bodyW * 0.97)} ${n(h * 0.72)} ${n(-hw * 0.78)} ${n(h * 0.84)}`,
    // Mesiobuccal cusp
    `Q ${n(-hw * 0.55)} ${n(h + cuspH)} ${n(-hw * 0.32)} ${n(h - grooveD * 0.6)}`,
    // First groove (buccal developmental groove)
    `Q ${n(-hw * 0.12)} ${n(h - grooveD * 1.5)} 0 ${n(h - grooveD)}`,
    // Distobuccal cusp
    `Q ${n(hw * 0.12)} ${n(h - grooveD * 1.5)} ${n(hw * 0.32)} ${n(h - grooveD * 0.6)}`,
    `Q ${n(hw * 0.55)} ${n(h + cuspH * 0.85)} ${n(hw * 0.78)} ${n(h * 0.84)}`,
    // Distal wall
    `C ${n(bodyW * 0.97)} ${n(h * 0.72)} ${n(bodyW)} ${n(h * 0.58)} ${n(bodyW)} ${n(h * 0.40)}`,
    `C ${n(bodyW)} ${n(h * 0.26)} ${n(cw * 1.03)} ${n(h * 0.14)} ${n(cw)} 0`,
    "Z",
  ].join(" ");
}

/**
 * Lays the 16 maxillary crowns along a frontal smile line: incisal edges
 * lowest at the midline, rising toward the corners, crowns tipping outward.
 */
export function buildArch(): ArchLayout {
  const spans = UPPER_ARCH.map(
    (code) => TOOTH_CLASS[positionFromMidline(code)].width * UNIT_W,
  );
  const width = spans.reduce((a, b) => a + b, 0);
  const midline = width / 2;
  const incisalBase = CROWN_H + SMILE_ARC;

  let cursor = 0;
  const teeth: ToothNode[] = UPPER_ARCH.map((code, i) => {
    const cls = TOOTH_CLASS[positionFromMidline(code)];
    const w = spans[i];
    const h = cls.height * CROWN_H;
    const x = cursor + w / 2;
    cursor += w;

    // -1 .. 1 across the arch, 0 at the facial midline.
    const t = (x - midline) / midline;
    const incisal = incisalBase - SMILE_ARC * t * t;

    return {
      code,
      quadrant: Math.floor(code / 10),
      name: cls.name,
      kind: cls.kind,
      width: n(w),
      height: n(h),
      x: n(x),
      y: n(incisal - h),
      rotation: n(t * 16),
      depth: n(Math.abs(t)),
      path: toothPath(w, h, cls.kind),
    };
  });

  // Build scalloped gingival margin that follows the CEJ of each tooth.
  // The gum peaks between teeth (papillae) and dips over each tooth root.
  const gumParts: string[] = [];
  const firstT = teeth[0];
  const lastT = teeth[teeth.length - 1];

  gumParts.push(`M ${n(firstT.x - firstT.width / 2 - 10)} ${n(firstT.y - 8)}`);

  teeth.forEach((t, i) => {
    const cervY = t.y; // cervical edge
    // Gum margin dips down over the middle of the tooth (following CEJ)
    // and peaks up at the interproximal papilla between teeth
    const papillaH = t.kind === "incisor" ? 10 : t.kind === "canine" ? 12 : 7;
    const dip = t.kind === "incisor" ? 4 : t.kind === "canine" ? 5 : 3;

    if (i === 0) {
      // Start from the left edge
      gumParts.push(`Q ${n(t.x - t.width * 0.3)} ${n(cervY + dip)} ${n(t.x)} ${n(cervY + dip)}`);
    } else {
      // Papilla peak between previous and current tooth
      const prev = teeth[i - 1];
      const papX = (prev.x + prev.width / 2 + t.x - t.width / 2) / 2;
      const papY = Math.min(prev.y, t.y) - papillaH;
      gumParts.push(`Q ${n(papX)} ${n(papY)} ${n(t.x)} ${n(cervY + dip)}`);
    }

    if (i < teeth.length - 1) {
      // Curve down to the next papilla
      const next = teeth[i + 1];
      const nextPapX = (t.x + t.width / 2 + next.x - next.width / 2) / 2;
      gumParts.push(`Q ${n(t.x + t.width * 0.3)} ${n(cervY + dip)} ${n(nextPapX)} ${n(Math.min(t.y, next.y) - (t.kind === "incisor" ? 10 : 7))}`);
    }
  });

  // Close the gum shape by going up and back across the top
  gumParts.push(`L ${n(lastT.x + lastT.width / 2 + 10)} ${n(lastT.y - 8)}`);
  gumParts.push(`L ${n(lastT.x + lastT.width / 2 + 10)} ${n(Math.min(...teeth.map(t => t.y)) - 30)}`);
  gumParts.push(`L ${n(firstT.x - firstT.width / 2 - 10)} ${n(Math.min(...teeth.map(t => t.y)) - 30)}`);
  gumParts.push("Z");

  return {
    teeth,
    width: n(width),
    midline: n(midline),
    incisalBase: n(incisalBase),
    gingivalTop: n(Math.min(...teeth.map((t) => t.y))),
    gumPath: gumParts.join(" "),
  };
}

/** Stable pseudo-random in [0,1) — keeps SSR and client markup identical. */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pre-treatment deviation per tooth: rotation, crowding, incisal wear and
 * chroma. Deterministic, so the before/after slider never hydrates mismatched.
 */
export interface Deviation {
  rotate: number;
  dx: number;
  dy: number;
  scale: number;
  /** 0 = porcelain white, 1 = heavily discoloured. */
  chroma: number;
}

export function preTreatment(code: number): Deviation {
  const s = code;
  const anterior = code % 10 <= 3;
  const swing = anterior ? 1 : 0.45;
  return {
    rotate: n((seeded(s) - 0.5) * 17 * swing),
    dx: n((seeded(s + 31) - 0.5) * 9 * swing),
    dy: n((seeded(s + 67) - 0.5) * 11 * swing + (anterior ? 3 : 0)),
    scale: n(0.94 + seeded(s + 101) * 0.08),
    chroma: n(0.45 + seeded(s + 149) * 0.55),
  };
}
