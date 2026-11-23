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
