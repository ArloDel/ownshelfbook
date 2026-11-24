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
