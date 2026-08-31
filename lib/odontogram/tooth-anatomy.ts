/**
 * Average permanent-tooth dimensions, keyed by FDI position (1 = central
 * incisor … 8 = third molar). These are published dental morphology averages —
 * mesiodistal crown width, cervico-incisal crown height and root length in
 * millimetres — used here as the single source of truth for chart geometry.
 *
 * Charting every tooth from one table is what keeps the arch regular: crown
 * heights share a cervical line, and x-widths stay proportional to real
 * mesiodistal width, so molars read wider than incisors as they should.
 */

export type ToothKind = "incisor" | "canine" | "premolar" | "molar";

export interface ToothAnatomy {
  position: number;
  kind: ToothKind;
  /** Mesiodistal crown width, mm. */
  crownWidth: number;
  /** Cervico-incisal crown height, mm. */
  crownHeight: number;
  /** Root length, mm. */
  rootLength: number;
  /** Root count differs by arch: maxillary molars have three, mandibular two. */
  upperRoots: number;
  lowerRoots: number;
}

export const TOOTH_ANATOMY: Record<number, ToothAnatomy> = {
  1: { position: 1, kind: "incisor",  crownWidth: 8.5,  crownHeight: 10.5, rootLength: 13, upperRoots: 1, lowerRoots: 1 },
  2: { position: 2, kind: "incisor",  crownWidth: 6.5,  crownHeight: 9.0,  rootLength: 13, upperRoots: 1, lowerRoots: 1 },
  3: { position: 3, kind: "canine",   crownWidth: 7.5,  crownHeight: 10.0, rootLength: 17, upperRoots: 1, lowerRoots: 1 },
  4: { position: 4, kind: "premolar", crownWidth: 7.0,  crownHeight: 8.5,  rootLength: 14, upperRoots: 2, lowerRoots: 1 },
  5: { position: 5, kind: "premolar", crownWidth: 7.0,  crownHeight: 8.5,  rootLength: 14, upperRoots: 1, lowerRoots: 1 },
  6: { position: 6, kind: "molar",    crownWidth: 10.0, crownHeight: 7.5,  rootLength: 13, upperRoots: 3, lowerRoots: 2 },
  7: { position: 7, kind: "molar",    crownWidth: 9.5,  crownHeight: 7.0,  rootLength: 13, upperRoots: 3, lowerRoots: 2 },
  8: { position: 8, kind: "molar",    crownWidth: 8.5,  crownHeight: 6.5,  rootLength: 11, upperRoots: 3, lowerRoots: 2 },
};

/** FDI position from a tooth code, e.g. 26 -> 6. */
export function toothPosition(toothCode: number): number {
  return toothCode % 10;
}

export function toothAnatomy(toothCode: number): ToothAnatomy {
  return TOOTH_ANATOMY[toothPosition(toothCode)];
}

export const MAX_CROWN_HEIGHT = 10.5;
export const MAX_ROOT_LENGTH = 17;
