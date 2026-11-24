import { describe, expect, it } from 'vitest';
import { FOOT_SHADOW_MARGIN_CM, footShadowAlpha, footShadowSize } from '../src/ui/scene/footShadow';

describe('footShadowAlpha', () => {
  it('is darkest in the middle and fades to nothing at the edges', () => {
    expect(footShadowAlpha(0.5, 0.5)).toBe(1);
    expect(footShadowAlpha(0, 0.5)).toBe(0);
    expect(footShadowAlpha(0.5, 1)).toBe(0);
    expect(footShadowAlpha(0, 0)).toBe(0);
  });

  it('fades smoothly and symmetrically', () => {
    const a = footShadowAlpha(0.1, 0.5);
    const b = footShadowAlpha(0.2, 0.5);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(footShadowAlpha(0.9, 0.5)).toBeCloseTo(a);
  });
});

describe('footShadowSize', () => {
  it('reaches a margin past the footprint on every side', () => {
    expect(footShadowSize(80, 30)).toEqual([80 + 2 * FOOT_SHADOW_MARGIN_CM, 30 + 2 * FOOT_SHADOW_MARGIN_CM]);
  });
});
