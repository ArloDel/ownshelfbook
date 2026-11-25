import { canDoubleStack, columnCount, riserOf, slotRect } from './shelves';
import type { Book, Layer, Placement, Shelf, SlotRef } from './types';

export const layerOf = (p: Placement): Layer => p.layer ?? 'depan';

const slotKey = (p: Placement) => `${p.shelfId}|${p.row}|${p.col}|${layerOf(p)}`;

/** In the slot, and in `layer` when one is given. */
const inSlot = (b: Book, slot: SlotRef, layer?: Layer) =>
  b.placement !== null &&
  b.placement.shelfId === slot.shelfId &&
  b.placement.row === slot.row &&
  b.placement.col === slot.col &&
  (layer === undefined || layerOf(b.placement) === layer);

/** Books in a slot by order; without `layer`, both layers. */
export function booksInSlot(books: Book[], slot: SlotRef, layer?: Layer): Book[] {
  return books.filter((b) => inSlot(b, slot, layer)).sort((a, b) => a.placement!.order - b.placement!.order);
}

/** Per slot and layer, re-number `order` to 0..n-1 keeping the relative order. */
export function normalizeOrders(books: Book[]): Book[] {
  const groups = new Map<string, Book[]>();
  for (const b of books) {
    if (!b.placement) continue;
    const k = slotKey(b.placement);
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }
  const newOrder = new Map<string, number>();
  for (const group of groups.values()) {
    group.sort((a, b) => a.placement!.order - b.placement!.order).forEach((b, i) => newOrder.set(b.id, i));
  }
  return books.map((b) =>
    b.placement && b.placement.order !== newOrder.get(b.id)
      ? { ...b, placement: { ...b.placement, order: newOrder.get(b.id)! } }
      : b,
  );
}

export function placeBooks(books: Book[], ids: string[], slot: SlotRef, layer: Layer = 'depan'): Book[] {
  const moving = new Set(ids);
  const remaining = books.filter((b) => !moving.has(b.id) && inSlot(b, slot, layer));
  let next = remaining.length;
  const orderOf = new Map(ids.map((id) => [id, next++]));
  const target = { shelfId: slot.shelfId, row: slot.row, col: slot.col };
  const placed = books.map((b) =>
    moving.has(b.id) ? { ...b, placement: { ...target, order: orderOf.get(b.id)!, layer } } : b,
  );
  return normalizeOrders(placed);
}

export function unplaceBooks(books: Book[], ids: string[]): Book[] {
  const set = new Set(ids);
  return normalizeOrders(books.map((b) => (set.has(b.id) ? { ...b, placement: null } : b)));
}

export function moveInSlot(books: Book[], id: string, newIndex: number): Book[] {
  const book = books.find((b) => b.id === id);
  if (!book?.placement) return books;
  const slot = book.placement;
  const ordered = booksInSlot(books, slot, layerOf(slot)).filter((b) => b.id !== id);
  const index = Math.max(0, Math.min(ordered.length, newIndex));
  ordered.splice(index, 0, book);
  const orderOf = new Map(ordered.map((b, i) => [b.id, i]));
  return books.map((b) => (orderOf.has(b.id) ? { ...b, placement: { ...b.placement!, order: orderOf.get(b.id)! } } : b));
}

/** Send a placed book to the end of the other layer of its slot. */
export function moveToLayer(books: Book[], id: string, layer: Layer): Book[] {
  return moveBooksToLayer(books, [id], layer);
}

/**
 * Send placed books to the end of `layer` in their own slots, keeping their current order.
 * Unplaced books and books already on that layer are left alone.
 */
export function moveBooksToLayer(books: Book[], ids: string[], layer: Layer): Book[] {
  const wanted = new Set(ids);
  const moving = books
    .filter((b) => wanted.has(b.id) && b.placement !== null && layerOf(b.placement) !== layer)
    .sort((a, b) => a.placement!.order - b.placement!.order);
  if (!moving.length) return books;
  const bySlot = new Map<string, { slot: SlotRef; ids: string[] }>();
  for (const b of moving) {
    const { shelfId, row, col } = b.placement!;
    const key = `${shelfId}|${row}|${col}`;
    const entry = bySlot.get(key) ?? { slot: { shelfId, row, col }, ids: [] };
    entry.ids.push(b.id);
    bySlot.set(key, entry);
  }
  let next = books;
  for (const { slot, ids: group } of bySlot.values()) next = placeBooks(next, group, slot, layer);
  return next;
}

export function slotUsage(
  books: Book[],
  shelf: Shelf,
  row: number,
  col: number,
  layer: Layer = 'depan',
): { usedCm: number; capacityCm: number; overflow: boolean; tooTall: boolean } {
  const rect = slotRect(shelf, row, col);
  const inside = booksInSlot(books, { shelfId: shelf.id, row, col }, layer);
  // The back layer stands on the riser, so it has less height to use.
  const height = layer === 'belakang' ? rect.height - riserOf(shelf) : rect.height;
  const usedCm = Math.round(inside.reduce((s, b) => s + b.thicknessCm, 0) * 1000) / 1000;
  return {
    usedCm,
    capacityCm: rect.width,
    overflow: usedCm > rect.width,
    tooTall: inside.some((b) => b.heightCm > height),
  };
}

/**
 * The parts of a shelf that decide where books may stand. A deleted shelf is a layout with no rows.
 * With `depthCm`, a shelf too shallow for two layers has no back layer.
 */
export type ShelfLayout = Pick<Shelf, 'id' | 'rowHeightsCm' | 'colWidthsCm'> & { depthCm?: number };

const isOutside = (b: Book, layout: ShelfLayout) => {
  const p = b.placement;
  if (p === null || p.shelfId !== layout.id) return false;
  if (p.row >= layout.rowHeightsCm.length || p.col >= (layout.colWidthsCm[p.row]?.length ?? 0)) return true;
  return layout.depthCm !== undefined && layerOf(p) === 'belakang' && !canDoubleStack({ depthCm: layout.depthCm });
};

export function countBooksOutside(books: Book[], layout: ShelfLayout): number {
  return books.filter((b) => isOutside(b, layout)).length;
}

export function returnBooksOutside(books: Book[], layout: ShelfLayout): Book[] {
  return books.map((b) => (isOutside(b, layout) ? { ...b, placement: null } : b));
}

export interface FillResult {
  books: Book[];
  /** Ids that went into the shelf, in order. */
  placed: string[];
  /** Ids that did not fit, in order. */
  rest: string[];
}

const FIT_EPS = 1e-6;

/**
 * Put books into one layer of a slot, in the given order, only as far as they fit.
 * Stops at the first book that does not fit, so a series is never split out of order.
 * Books already on that layer of the slot are left where they are.
 */
export function fillLayer(books: Book[], ids: string[], shelf: Shelf, slot: SlotRef, layer: Layer): FillResult {
  const byId = new Map(books.map((b) => [b.id, b]));
  const already = new Set(booksInSlot(books, slot, layer).map((b) => b.id));
  const queue = ids.filter((id) => byId.has(id) && !already.has(id));
  const capacity = slotRect(shelf, slot.row, slot.col).width;
  let used = slotUsage(books, shelf, slot.row, slot.col, layer).usedCm;
  let n = 0;
  while (n < queue.length && used + byId.get(queue[n])!.thicknessCm <= capacity + FIT_EPS) {
    used += byId.get(queue[n])!.thicknessCm;
    n++;
  }
  const placed = queue.slice(0, n);
  return { books: placed.length ? placeBooks(books, placed, slot, layer) : books, placed, rest: queue.slice(n) };
}

export function hasSlotRight(shelf: Shelf, slot: SlotRef): boolean {
  return slot.col + 1 < columnCount(shelf, slot.row);
}

/** Fill the same layer of the slots to the right of `slot`, on the same tier, until the books run out. */
export function flowRight(books: Book[], ids: string[], shelf: Shelf, slot: SlotRef, layer: Layer): FillResult {
  let result: FillResult = { books, placed: [], rest: ids };
  for (let col = slot.col + 1; col < columnCount(shelf, slot.row) && result.rest.length; col++) {
    const step = fillLayer(result.books, result.rest, shelf, { ...slot, col }, layer);
    result = { books: step.books, placed: [...result.placed, ...step.placed], rest: step.rest };
  }
  return result;
}
