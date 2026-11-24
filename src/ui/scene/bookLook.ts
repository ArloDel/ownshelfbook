/** Small visual touches for books on the shelf. All sizes in cm. */

/** How much shorter (at most) a book may be drawn than its stored height. */
const HEIGHT_JITTER = 0.04;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Stable per-book height factor in (0.96, 1]: volumes look a little uneven.
 * Never above 1, so a drawn book is never taller than its stored height.
 */
export function heightFactor(id: string): number {
  return 1 - ((hash(id) % 1000) / 1000) * HEIGHT_JITTER;
}

const MAX_LEAN = (12 * Math.PI) / 180;
/** Below this much free space (cm) the book just stands upright. */
const MIN_FREE = 0.5;
/** Keep a hair of air between the leaning book and the slot edge. */
const LEAN_GAP = 0.2;

export interface Upright {
  left: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Lean a book to the left: its top-left corner rests on the neighbour (or slot wall)
 * at `left`, its bottom corner slides right. Returns the box centre and the tilt
 * (radians, counter-clockwise seen from the front), as steep as fits in the slot.
 */
export function leanBook(b: Upright, right: number, top: number): { cx: number; cy: number; tilt: number } {
  const upright = { cx: b.left + b.width / 2, cy: b.bottom + b.height / 2, tilt: 0 };
  const room = right - b.left - LEAN_GAP;
  if (right - b.left - b.width < MIN_FREE) return upright;
  const fits = (t: number) =>
    b.height * Math.sin(t) + b.width * Math.cos(t) <= room && b.height * Math.cos(t) + b.width * Math.sin(t) <= top - b.bottom;
  let tilt = 0;
  if (fits(MAX_LEAN)) tilt = MAX_LEAN;
  else {
    let lo = 0;
    let hi = MAX_LEAN;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    tilt = lo;
  }
  if (tilt < 0.005) return upright;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  // Bottom-left corner sits on the board, h·sin(tilt) right of `left`.
  const px = b.left + b.height * s;
  return { cx: px + (b.width / 2) * c - (b.height / 2) * s, cy: b.bottom + (b.width / 2) * s + (b.height / 2) * c, tilt };
}

const BAND_HEIGHT = 0.5;
const BAND_INSET = 0.7;

export interface Band {
  position: [number, number, number];
  size: [number, number, number];
}

/** Two thin strips across the spine, near its top and bottom, in book-local cm. */
export function spineBands([w, h, d]: [number, number, number]): Band[] {
  const y = h / 2 - BAND_INSET - BAND_HEIGHT / 2;
  const z = d / 2 + 0.03;
  const size: [number, number, number] = [w, BAND_HEIGHT, 0.04];
  return [
    { position: [0, -y, z], size },
    { position: [0, y, z], size },
  ];
}

/** Darker shade of a #rrggbb colour for the spine bands. */
export function bandColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return (
    '#' +
    [16, 8, 0]
      .map((shift) => Math.round(((n >> shift) & 255) * 0.62).toString(16).padStart(2, '0'))
      .join('')
  );
}
