import { createBook } from '../../src/domain/books';
import { layoutBooksInSlot } from '../../src/ui/scene/layout';

const book = (t: number) => ({ ...createBook({ title: 'X', type: 'buku' }), thicknessCm: t });

test('books stand left to right and overflowed books are hidden', () => {
  const books = [book(10), book(10), book(10)];
  const r = layoutBooksInSlot(books, { x: 0, y: 2, width: 25, height: 30 });
  expect(r.map((b) => b.x)).toEqual([5, 15, 25]);
  expect(r.map((b) => b.visible)).toEqual([true, true, false]);
  expect(r[0]).toMatchObject({ id: books[0].id, y: 2, width: 10, height: 21 });
});

test('books taller than the slot are clipped to the slot height', () => {
  const r = layoutBooksInSlot([book(3)], { x: -10, y: 0, width: 20, height: 15 });
  expect(r[0]).toMatchObject({ x: -8.5, height: 15, visible: true });
});

import { createShelf } from '../../src/domain/shelves';
import { shelfBoards } from '../../src/ui/scene/ShelfMesh';
import { placedBookBoxes } from '../../src/ui/scene/BooksMesh';
import { placeBooks } from '../../src/domain/placement';

test('shelfBoards counts outer boards, dividers and back panel', () => {
  expect(shelfBoards(createShelf('rak-buku', 'R'))).toHaveLength(4 + 4 + 1);
  expect(shelfBoards(createShelf('kubus', 'K'))).toHaveLength(4 + 3 + 3);
});

test('placedBookBoxes skips overflowed books', () => {
  const shelf = createShelf('kubus', 'K');
  const books = Array.from({ length: 30 }, () => createBook({ title: 'K', type: 'komik' }));
  const placed = placeBooks(books, books.map((b) => b.id), { shelfId: shelf.id, row: 0, col: 0 });
  expect(placedBookBoxes(placed, [shelf])).toHaveLength(22);
});
