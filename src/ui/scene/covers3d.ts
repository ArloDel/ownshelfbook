import { seriesKey } from '../../domain/covers';
import type { Book } from '../../domain/types';
import { bookLabel } from '../common/labels';
import type { PlacedBook } from './BooksMesh';

/** Split placed books into plain ones and, per series key, the ones whose series has a spine image. */
export function splitByCover(placed: PlacedBook[], covers: Record<string, string>) {
  const plain: PlacedBook[] = [];
  const covered = new Map<string, PlacedBook[]>();
  for (const p of placed) {
    const key = seriesKey(p.book);
    if (!covers[key]) {
      plain.push(p);
      continue;
    }
    covered.set(key, [...(covered.get(key) ?? []), p]);
  }
  return { plain, covered };
}

/** On a spine with an image, the volume number is what tells volumes apart. */
export function spineLabelText(book: Book, hasCover: boolean): string {
  return hasCover && book.volume !== undefined ? String(book.volume) : bookLabel(book);
}
