/** Pixels a pointer may travel between down and up and still count as a click (matches R3F's own threshold). */
export const CLICK_THRESHOLD_PX = 2;

/** R3F fires onClick even after an orbit drag; use this to ignore those. */
export const isClick = (e: { delta: number }) => e.delta <= CLICK_THRESHOLD_PX;
