import {
  MAX_CROWN_HEIGHT,
  MAX_ROOT_LENGTH,
  toothAnatomy,
  type ToothKind,
} from "./tooth-anatomy";

/**
 * Procedural buccal-view tooth outlines, generated from the millimetre figures
 * in tooth-anatomy.ts.
 *
 * Everything is drawn in ONE coordinate space: 1mm = MM units, with the
 * cervical line (crown/root junction) at y = 0 for every tooth. The crown grows
 * one way from that line and the root the other, so a whole arch shares a single
 * gum line and a single occlusal plane no matter how the individual dimensions
 * differ. Getting that wrong — a separate viewBox per tooth — is what makes an
 * odontogram look ragged.
 */

/** Units per millimetre. */
export const MM = 3;
/** Interproximal gap between adjacent crowns, in units. */
const TOOTH_GAP = 1.6;
/** Vertical space reserved for the FDI number, in units. */
const LABEL_BAND = 13;
/** Font size for the FDI number, in units. */
export const LABEL_SIZE = 9;
const PAD = 4;

/** Cervical width as a fraction of maximum crown width. */
const CERVICAL_RATIO: Record<ToothKind, number> = {
  incisor: 0.7,
  canine: 0.68,
  premolar: 0.78,
  molar: 0.84,
};

/** Incisal/occlusal edge width as a fraction of maximum crown width. */
const EDGE_RATIO: Record<ToothKind, number> = {
  incisor: 0.9,
  canine: 0.8,
  premolar: 0.88,
  molar: 0.92,
};

/**
 * Occlusal edge profiles as [x fraction of edge half-width, y fraction of crown
 * height]. y = 1 is the cusp tip, which is where crown height is measured to,
 * so corners and grooves sit below it. Mesial is negative x.
 */
const EDGE_PROFILE: Record<ToothKind, ReadonlyArray<readonly [number, number]>> = {
  // Near-flat incisal edge; the disto-incisal corner rounds off more than the mesial.
  incisor: [[-1, 0.93], [-0.5, 1], [0.5, 0.995], [1, 0.9]],
  // Single cusp, tip just mesial of centre, with a longer distal slope.
  canine: [[-1, 0.66], [-0.45, 0.86], [-0.06, 1], [0.14, 0.99], [0.62, 0.8], [1, 0.6]],
  // Buccal cusp dominant, shallow developmental groove, smaller distal cusp.
  premolar: [[-1, 0.78], [-0.42, 1], [0.02, 0.84], [0.48, 0.96], [1, 0.76]],
  // Mesiobuccal cusp, buccal groove, distobuccal cusp, distal shoulder.
  molar: [[-1, 0.76], [-0.55, 1], [-0.12, 0.83], [0.34, 0.97], [0.7, 0.86], [1, 0.74]],
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Smooths a polyline by treating each interior point as a quadratic control
 * point and passing through the midpoints between them, which rounds the cusp
 * tips instead of leaving them as spikes.
 */
function smoothEdge(points: ReadonlyArray<readonly [number, number]>): string {
  let d = "";
  for (let i = 1; i < points.length - 1; i++) {
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q ${r2(cx)} ${r2(cy)} ${r2((cx + nx) / 2)} ${r2((cy + ny) / 2)}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${r2(last[0])} ${r2(last[1])}`;
}

function crownPath(kind: ToothKind, cw: number, ch: number, dir: number): string {
  const y = (f: number) => dir * ch * f;
  const half = cw / 2;
  const cervHalf = half * CERVICAL_RATIO[kind];
  const edgeHalf = half * EDGE_RATIO[kind];

  const profile = EDGE_PROFILE[kind];
  const edge = profile.map(
    ([xf, yf]) => [edgeHalf * xf, y(yf)] as const,
  );

  // Mesial: cervical margin, out to the contact bulge, in to the incisal corner.
  let d = `M ${r2(-cervHalf)} 0`;
  d += ` C ${r2(-half * 0.99)} ${r2(y(0.16))} ${r2(-half)} ${r2(y(0.32))} ${r2(-half)} ${r2(y(0.46))}`;
  d += ` C ${r2(-half)} ${r2(y(0.68))} ${r2(-edgeHalf * 1.05)} ${r2(y(profile[0][1] * 0.84))} ${r2(edge[0][0])} ${r2(edge[0][1])}`;

  d += smoothEdge(edge);

  // Distal: back out to the bulge, then in to the cervical margin.
  const lastY = profile[profile.length - 1][1];
  d += ` C ${r2(half * 1.03)} ${r2(y(lastY * 0.84))} ${r2(half)} ${r2(y(0.68))} ${r2(half)} ${r2(y(0.46))}`;
  d += ` C ${r2(half)} ${r2(y(0.32))} ${r2(cervHalf * 1.01)} ${r2(y(0.16))} ${r2(cervHalf)} 0`;
  return `${d} Z`;
}

/**
 * One continuous outline for the whole root complex, so a multi-rooted tooth
 * gets a real furcation notch in its silhouette rather than overlapping shapes.
 */
function rootPath(rw: number, rl: number, count: number, dir: number): string {
  const y = (f: number) => -dir * rl * f;

  const apexFracs = count === 1 ? [0.07] : count === 2 ? [-0.28, 0.3] : [-0.33, 0.01, 0.34];
  // Maxillary molars: the palatal root reads as set back, so it stops short.
  const lengths = count === 1 ? [1] : count === 2 ? [0.97, 1] : [0.93, 1, 0.9];
  const furcation = count === 3 ? 0.26 : 0.3;
  const tip = rw * (count === 1 ? 0.13 : count === 2 ? 0.1 : 0.075);

  const notches: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    notches.push(((apexFracs[i] + apexFracs[i + 1]) / 2) * rw);
  }

  let d = `M ${r2(-rw / 2)} 0`;
  for (let i = 0; i < count; i++) {
    const ax = apexFracs[i] * rw;
    const len = lengths[i];
    const startX = i === 0 ? -rw / 2 : notches[i - 1];
    const startF = i === 0 ? 0 : furcation;
    const endX = i === count - 1 ? rw / 2 : notches[i];
    const endF = i === count - 1 ? 0 : furcation;

    d += ` C ${r2(mix(startX, ax - tip, 0.5))} ${r2(y(mix(startF, len, 0.45)))} ${r2(ax - tip * 1.6)} ${r2(y(len * 0.82))} ${r2(ax - tip)} ${r2(y(len * 0.96))}`;
    d += ` Q ${r2(ax)} ${r2(y(len))} ${r2(ax + tip)} ${r2(y(len * 0.96))}`;
    d += ` C ${r2(ax + tip * 1.6)} ${r2(y(len * 0.82))} ${r2(mix(ax + tip, endX, 0.5))} ${r2(y(mix(len, endF, 0.55)))} ${r2(endX)} ${r2(y(endF))}`;
  }
  return `${d} Z`;
}

export type Arch = "upper" | "lower";

export interface ToothGlyph {
  toothCode: number;
  /** Centre of the tooth along the arch, in units. */
  x: number;
  /** Layout cell width, for hit targets. */
  cellWidth: number;
  crown: string;
  root: string;
}

export interface ArchGlyphs {
  teeth: ToothGlyph[];
  viewBox: string;
  /** Baseline for the FDI number, in the same space. */
  labelY: number;
  width: number;
}

/**
 * Lays a row of FDI codes out along x, proportional to real mesiodistal width.
 * `dir` is +1 for the maxillary arch (roots up, crowns down) and -1 for the
 * mandibular, which is the only difference between the two rows — the geometry
 * itself is shared.
 */
export function buildArch(row: number[], arch: Arch): ArchGlyphs {
  const dir = arch === "upper" ? 1 : -1;
  const teeth: ToothGlyph[] = [];

  let cursor = 0;
  for (const toothCode of row) {
    const a = toothAnatomy(toothCode);
    const cw = a.crownWidth * MM;
    const ch = a.crownHeight * MM;
    const rl = a.rootLength * MM;
    const cellWidth = cw + TOOTH_GAP;
    const x = cursor + cellWidth / 2;
    const roots = arch === "upper" ? a.upperRoots : a.lowerRoots;

    teeth.push({
      toothCode,
      x,
      cellWidth,
      crown: crownPath(a.kind, cw, ch, dir),
      root: rootPath(cw * CERVICAL_RATIO[a.kind], rl, roots, dir),
    });
    cursor += cellWidth;
  }

  const rootExtent = MAX_ROOT_LENGTH * MM + LABEL_BAND + PAD;
  const crownExtent = MAX_CROWN_HEIGHT * MM + PAD;
  const yMin = arch === "upper" ? -rootExtent : -crownExtent;
  const height = rootExtent + crownExtent;

  return {
    teeth,
    viewBox: `0 ${r2(yMin)} ${r2(cursor)} ${r2(height)}`,
    labelY: dir * -(MAX_ROOT_LENGTH * MM + PAD + 1),
    width: cursor,
  };
}
