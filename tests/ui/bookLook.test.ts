import { createBook } from '../../src/domain/books';
import { placeBooks } from '../../src/domain/placement';
import { createShelf } from '../../src/domain/shelves';
import { placedBookBoxes } from '../../src/ui/scene/BooksMesh';
import { heightFactor } from '../../src/ui/scene/bookLook';

test('heightFactor is stable per book and never makes a book taller', () => {
  const ids = Array.from({ length: 50 }, (_, i) => `book-${i}`);
  const f = ids.map(heightFactor);
  expect(f.every((x) => x > 0.95 && x <= 1)).toBe(true);
  expect(new Set(f).size).toBeGreaterThan(5);
  expect(heightFactor('book-7')).toBe(f[7]);
});

test('placed books get slightly different heights', () => {
  const shelf = createShelf('rak-buku', 'R');
  const books = Array.from({ length: 10 }, (_, i) => createBook({ title: `V${i}`, type: 'komik' }));
  const placed = placeBooks(books, books.map((b) => b.id), { shelfId: shelf.id, row: 1, col: 0 });
  const heights = placedBookBoxes(placed, [shelf]).map((p) => p.size[1]);
  expect(heights.every((h) => h <= 18)).toBe(true);
  expect(new Set(heights).size).toBeGreaterThan(1);
});
