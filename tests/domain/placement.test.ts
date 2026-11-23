import { createBook } from '../../src/domain/books';
import {
  booksInSlot,
  countBooksOutside,
  moveInSlot,
  normalizeOrders,
  placeBooks,
  returnBooksOutside,
  slotUsage,
  unplaceBooks,
} from '../../src/domain/placement';
import { createShelf, setColumnCount, setRowCount } from '../../src/domain/shelves';
import type { Book } from '../../src/domain/types';

const komik = (n: number) => Array.from({ length: n }, (_, i) => createBook({ title: 'K', type: 'komik', volume: i + 1 }));
const shelf = createShelf('kubus', 'K');
const slotA = { shelfId: shelf.id, row: 0, col: 0 };
const slotB = { shelfId: shelf.id, row: 0, col: 1 };
const orders = (books: Book[], slot = slotA) => booksInSlot(books, slot).map((b) => b.placement!.order);

test('placeBooks appends after existing books in the slot', () => {
  const books = komik(5);
  let r = placeBooks(books, books.slice(0, 3).map((b) => b.id), slotA);
  expect(orders(r)).toEqual([0, 1, 2]);
  r = placeBooks(r, books.slice(3).map((b) => b.id), slotA);
  expect(orders(r)).toEqual([0, 1, 2, 3, 4]);
  expect(booksInSlot(r, slotA).map((b) => b.volume)).toEqual([1, 2, 3, 4, 5]);
});

test('placeBooks does not mutate input', () => {
  const books = komik(1);
  placeBooks(books, [books[0].id], slotA);
  expect(books[0].placement).toBeNull();
});

test('moving the middle book to another slot leaves contiguous orders', () => {
  const books = komik(3);
  let r = placeBooks(books, books.map((b) => b.id), slotA);
  r = placeBooks(r, [books[1].id], slotB);
  expect(orders(r)).toEqual([0, 1]);
  expect(booksInSlot(r, slotA).map((b) => b.volume)).toEqual([1, 3]);
  expect(orders(r, slotB)).toEqual([0]);
});

test('unplaceBooks re-normalizes the slot', () => {
  const books = komik(3);
  let r = placeBooks(books, books.map((b) => b.id), slotA);
  r = unplaceBooks(r, [books[0].id]);
  expect(orders(r)).toEqual([0, 1]);
  expect(r.find((b) => b.id === books[0].id)!.placement).toBeNull();
});

test('moveInSlot reorders within a slot', () => {
  const books = komik(3);
  let r = placeBooks(books, books.map((b) => b.id), slotA);
  r = moveInSlot(r, books[2].id, 0);
  expect(booksInSlot(r, slotA).map((b) => b.volume)).toEqual([3, 1, 2]);
  expect(orders(r)).toEqual([0, 1, 2]);
});

test('normalizeOrders closes gaps keeping relative order', () => {
  const [a, b] = komik(2);
  const r = normalizeOrders([
    { ...a, placement: { ...slotA, order: 5 } },
    { ...b, placement: { ...slotA, order: 2 } },
  ]);
  expect(booksInSlot(r, slotA).map((x) => x.id)).toEqual([b.id, a.id]);
  expect(orders(r)).toEqual([0, 1]);
});

test('slotUsage flags overflow', () => {
  const b23 = komik(23);
  const r23 = placeBooks(b23, b23.map((b) => b.id), slotA);
  expect(slotUsage(r23, shelf, 0, 0)).toMatchObject({ usedCm: 34.5, capacityCm: 33, overflow: true });
  const b22 = komik(22);
  const r22 = placeBooks(b22, b22.map((b) => b.id), slotA);
  expect(slotUsage(r22, shelf, 0, 0).overflow).toBe(false);
});

test('slotUsage flags books taller than the row', () => {
  const s = { ...shelf, rowHeightsCm: [20, 33, 33, 33] };
  const books = [createBook({ title: 'B', type: 'buku' })];
  const r = placeBooks(books, [books[0].id], { shelfId: s.id, row: 0, col: 0 });
  expect(slotUsage(r, s, 0, 0).tooTall).toBe(true);
});

describe('books outside a shrunk shelf', () => {
  const [top, right] = komik(2);
  const other = createShelf('kubus', 'O');
  const [elsewhere] = komik(1);
  const books: Book[] = [
    { ...top, placement: { shelfId: shelf.id, row: 3, col: 0, order: 0 } },
    { ...right, placement: { shelfId: shelf.id, row: 0, col: 3, order: 0 } },
    { ...elsewhere, placement: { shelfId: other.id, row: 3, col: 3, order: 0 } },
  ];

  const rows3 = setRowCount(shelf, 3);
  const rows3cols3 = [0, 1, 2].reduce((s, r) => setColumnCount(s, r, 3), rows3);

  test('countBooksOutside', () => {
    expect(countBooksOutside(books, rows3)).toBe(1);
    expect(countBooksOutside(books, rows3cols3)).toBe(2);
    expect(countBooksOutside(books, { id: shelf.id, rowHeightsCm: [], colWidthsCm: [] })).toBe(2);
  });

  test('returnBooksOutside unplaces them without deleting', () => {
    const r = returnBooksOutside(books, rows3cols3);
    expect(r).toHaveLength(3);
    expect(r[0].placement).toBeNull();
    expect(r[1].placement).toBeNull();
    expect(r[2].placement).toEqual(books[2].placement);
  });
});

test('shrinking one row only unplaces books in that row removed columns', () => {
  const s = createShelf('kubus', 'K');
  const [a, b, c] = komik(3);
  const books: Book[] = [
    { ...a, placement: { shelfId: s.id, row: 1, col: 3, order: 0 } },
    { ...b, placement: { shelfId: s.id, row: 1, col: 0, order: 0 } },
    { ...c, placement: { shelfId: s.id, row: 2, col: 3, order: 0 } },
  ];
  const next = setColumnCount(s, 1, 2);
  expect(countBooksOutside(books, next)).toBe(1);
  expect(returnBooksOutside(books, next).map((x) => x.placement === null)).toEqual([true, false, false]);
});
