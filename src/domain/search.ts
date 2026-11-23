import type { Book } from './types';

const haystack = (b: Book) => `${b.title} ${b.series ?? ''} ${b.author ?? ''}`.toLowerCase();

/** Case-insensitive search on title/series/author; a trailing number ranks that volume first. */
export function searchBooks(books: Book[], query: string, limit = 20): Book[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return [];
  const m = /^(.*?)\s*(\d+)$/.exec(q);
  const text = m ? m[1].trim() : q;
  const volume = m ? Number(m[2]) : undefined;

  const matches = books.filter((b) => {
    const h = haystack(b);
    if (h.includes(q)) return true;
    return text !== '' && h.includes(text) && (volume === undefined || b.volume !== undefined);
  });
  const rank = (b: Book) => (volume !== undefined && b.volume === volume ? 0 : 1);
  return matches
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.series ?? a.title).localeCompare(b.series ?? b.title) ||
        (a.volume ?? 0) - (b.volume ?? 0),
    )
    .slice(0, limit);
}
