import { SHELF_PRESETS } from '../../domain/shelves';
import type { Shelf } from '../../domain/types';
import type { SlotBox } from './layout';

/** Air between the back row and the deepest front book (cm). */
export const LAYER_GAP_CM = 0.5;
const BACK_PANEL_CM = 0.6;
const MIN_BACK_DEPTH_CM = 2;

export interface BackSpace {
  /** Shelf-local z (cm) of the back wall of the slot. */
  zMin: number;
  /** Shelf-local z (cm) where the front layer begins, minus a small gap. */
  zMax: number;
}

/** The depth range a slot's back layer may use, behind its deepest front book. */
export function backSpace(shelf: Shelf, frontDeepestCm: number): BackSpace {
  const inset = SHELF_PRESETS[shelf.model].hasBackPanel ? BACK_PANEL_CM : 0;
  return {
    zMin: -shelf.depthCm / 2 + inset,
    zMax: shelf.depthCm / 2 - 1 - frontDeepestCm - LAYER_GAP_CM,
  };
}

/** A back book is drawn thinner when the space is short, so the layers never pass through each other. */
export function backBookDepth(bookDepthCm: number, space: BackSpace): number {
  return Math.max(MIN_BACK_DEPTH_CM, Math.min(bookDepthCm, space.zMax - space.zMin - 1));
}

/** Centre z of a back book of depth `depthCm`, standing against the back of the slot. */
export function backBookZ(depthCm: number, space: BackSpace): number {
  return space.zMin + 1 + depthCm / 2;
}

/** The riser block under the back layer, or null when there is none. */
export function riserBox(
  slot: SlotBox,
  space: BackSpace,
  riserCm: number,
): { position: [number, number, number]; size: [number, number, number] } | null {
  if (riserCm <= 0) return null;
  const h = Math.min(riserCm, slot.height);
  const depth = Math.max(0, space.zMax - space.zMin);
  return {
    position: [slot.x + slot.width / 2, slot.y + h / 2, (space.zMin + space.zMax) / 2],
    size: [slot.width - 0.4, h, depth],
  };
}
