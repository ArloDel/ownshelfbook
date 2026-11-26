/** Pixels a pointer may travel between down and up and still count as a click (matches R3F's own threshold). */
export const CLICK_THRESHOLD_PX = 2;

/** R3F fires onClick even after an orbit drag; use this to ignore those. */
export const isClick = (e: { delta: number }) => e.delta <= CLICK_THRESHOLD_PX;

/**
 * R3F passes a click on to everything under the pointer. True when `object` is the nearest hit,
 * so a floor (or book) behind a shelf does not react to a click on the shelf.
 */
export const hitFirst = (e: { object: unknown; intersections: { object: unknown }[] }) => e.intersections[0]?.object === e.object;
