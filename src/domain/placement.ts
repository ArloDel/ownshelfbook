import { slotRect } from './shelves';
import type { Book, Shelf, SlotRef } from './types';

const slotKey = (p: { shelfId: string; row: number; col: number }) => `${p.shelfId}|${p.row}|${p.col}`;

const inSlot = (b: Book, slot: SlotRef) =>
  b.placement !== null &&
  b.placement.shelfId === slot.shelfId &&
  b.placement.row === slot.row &&
  b.placement.col === slot.col;

export function booksInSlot(books: Book[], slot: SlotRef): Book[] {
  return books.filter((b) => inSlot(b, slot)).sort((a, b) => a.placement!.order - b.placement!.order);
}

/** Per slot, re-number `order` to 0..n-1 keeping the relative order. */
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

export function placeBooks(books: Book[], ids: string[], slot: SlotRef): Book[] {
  const moving = new Set(ids);
  const remaining = books.filter((b) => !moving.has(b.id) && inSlot(b, slot));
  let next = remaining.length;
  const orderOf = new Map(ids.map((id) => [id, next++]));
  const placed = books.map((b) =>
    moving.has(b.id) ? { ...b, placement: { ...slot, order: orderOf.get(b.id)! } } : b,
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
  const ordered = booksInSlot(books, slot).filter((b) => b.id !== id);
  const index = Math.max(0, Math.min(ordered.length, newIndex));
  ordered.splice(index, 0, book);
  const orderOf = new Map(ordered.map((b, i) => [b.id, i]));
  return books.map((b) => (orderOf.has(b.id) ? { ...b, placement: { ...b.placement!, order: orderOf.get(b.id)! } } : b));
}

export function slotUsage(
  books: Book[],
  shelf: Shelf,
  row: number,
  col: number,
): { usedCm: number; capacityCm: number; overflow: boolean; tooTall: boolean } {
  const rect = slotRect(shelf, row, col);
  const inside = booksInSlot(books, { shelfId: shelf.id, row, col });
  const usedCm = Math.round(inside.reduce((s, b) => s + b.thicknessCm, 0) * 1000) / 1000;
  return {
    usedCm,
    capacityCm: rect.width,
    overflow: usedCm > rect.width,
    tooTall: inside.some((b) => b.heightCm > rect.height),
  };
}

/** The parts of a shelf that decide which slots exist. A deleted shelf is a layout with no rows. */
export type ShelfLayout = Pick<Shelf, 'id' | 'rowHeightsCm' | 'colWidthsCm'>;

const isOutside = (b: Book, layout: ShelfLayout) => {
  const p = b.placement;
  if (p === null || p.shelfId !== layout.id) return false;
  return p.row >= layout.rowHeightsCm.length || p.col >= (layout.colWidthsCm[p.row]?.length ?? 0);
};

export function countBooksOutside(books: Book[], layout: ShelfLayout): number {
  return books.filter((b) => isOutside(b, layout)).length;
}

export function returnBooksOutside(books: Book[], layout: ShelfLayout): Book[] {
  return books.map((b) => (isOutside(b, layout) ? { ...b, placement: null } : b));
}
