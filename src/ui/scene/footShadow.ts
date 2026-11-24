/** How far (cm) the soft shadow reaches past the shelf footprint. */
export const FOOT_SHADOW_MARGIN_CM = 12;
const FEATHER = 0.3;

function fade(t: number): number {
  const x = Math.min(1, Math.max(0, Math.min(t, 1 - t) / FEATHER));
  return x * x * (3 - 2 * x);
}

/** Shadow strength 0..1 at texture coords (u, v): solid middle, smooth fade to the edges. */
export function footShadowAlpha(u: number, v: number): number {
  return fade(u) * fade(v);
}

/** Size (cm) of the shadow plane for a shelf footprint. */
export function footShadowSize(width: number, depth: number): [number, number] {
  return [width + 2 * FOOT_SHADOW_MARGIN_CM, depth + 2 * FOOT_SHADOW_MARGIN_CM];
}
