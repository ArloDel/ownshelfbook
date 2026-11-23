import type { Book } from '../../domain/types';

export interface SlotBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BookBox {
  id: string;
  /** Center of the book along the shelf's x axis (shelf-local cm). */
  x: number;
  /** Bottom of the book (top surface of the board). */
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

/** Books stand left→right from the slot's left edge. Books past the right edge are hidden. */
export function layoutBooksInSlot(books: Book[], rect: SlotBox): BookBox[] {
  let cursor = rect.x;
  const right = rect.x + rect.width + 1e-6;
  return books.map((b) => {
    const left = cursor;
    cursor += b.thicknessCm;
    return {
      id: b.id,
      x: left + b.thicknessCm / 2,
      y: rect.y,
      width: b.thicknessCm,
      height: Math.min(b.heightCm, rect.height),
      visible: cursor <= right,
    };
  });
}
