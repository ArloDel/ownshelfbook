import { seriesKey } from '../../domain/covers';
import type { Book } from '../../domain/types';
import { bookLabel } from '../common/labels';
import type { PlacedBook } from './BooksMesh';

/**
 * Split placed books into plain ones and, per series key, the ones whose series has a spine image.
 * A highlighted book is drawn plain, so its yellow highlight is not hidden behind the picture.
 */
export function splitByCover(placed: PlacedBook[], covers: Record<string, string>, highlightId?: string | null) {
  const plain: PlacedBook[] = [];
  const covered = new Map<string, PlacedBook[]>();
  for (const p of placed) {
    const key = seriesKey(p.book);
    if (!covers[key] || p.book.id === highlightId) {
      plain.push(p);
      continue;
    }
    const list = covered.get(key);
    if (list) list.push(p);
    else covered.set(key, [p]);
  }
  return { plain, covered };
}

/** On a spine with an image, the volume number is what tells volumes apart. */
export function spineLabelText(book: Book, hasCover: boolean): string {
  return hasCover && book.volume !== undefined ? String(book.volume) : bookLabel(book);
}

/** Font size for a volume number on a spine `width` cm wide: more digits, smaller type, never above 2.2 cm. */
export function volumeFontSize(width: number, text: string): number {
  return Math.min(2.2, (width * 0.8) / Math.max(1, text.length * 0.6));
}
