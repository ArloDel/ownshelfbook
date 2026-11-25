import { createBook } from '../../src/domain/books';
import {
  booksInSlot,
  countBooksOutside,
  fillLayer,
  flowRight,
  hasSlotRight,
  layerOf,
  moveInSlot,
  moveBooksToLayer,
  moveToLayer,
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

describe('two layers', () => {
  const vols = (books: Book[], layer: 'depan' | 'belakang') => booksInSlot(books, slotA, layer).map((b) => b.volume);
  const ord = (books: Book[], layer: 'depan' | 'belakang') => booksInSlot(books, slotA, layer).map((b) => b.placement!.order);

  test('the back layer keeps its own order, apart from the front', () => {
    const books = komik(4);
    let r = placeBooks(books, [books[0].id, books[1].id], slotA);
    r = placeBooks(r, [books[2].id, books[3].id], slotA, 'belakang');
    expect(vols(r, 'depan')).toEqual([1, 2]);
    expect(ord(r, 'depan')).toEqual([0, 1]);
    expect(vols(r, 'belakang')).toEqual([3, 4]);
    expect(ord(r, 'belakang')).toEqual([0, 1]);
    expect(r[2].placement!.layer).toBe('belakang');
  });

  test('a placement without a layer reads as the front layer', () => {
    const [b] = komik(1);
    const old = { ...b, placement: { ...slotA, order: 0 } };
    expect(layerOf(old.placement)).toBe('depan');
    expect(booksInSlot([old], slotA, 'depan')).toEqual([old]);
    expect(booksInSlot([old], slotA, 'belakang')).toEqual([]);
  });

  test('moveToLayer sends a book to the end of the other layer and closes the gap', () => {
    const books = komik(4);
    let r = placeBooks(books, [books[0].id, books[1].id, books[2].id], slotA);
    r = placeBooks(r, [books[3].id], slotA, 'belakang');
    r = moveToLayer(r, books[0].id, 'belakang');
    expect(vols(r, 'belakang')).toEqual([4, 1]);
    expect(ord(r, 'belakang')).toEqual([0, 1]);
    expect(vols(r, 'depan')).toEqual([2, 3]);
    expect(ord(r, 'depan')).toEqual([0, 1]);
  });

  test('moveToLayer leaves unplaced books and same-layer moves alone', () => {
    const books = komik(2);
    expect(moveToLayer(books, books[0].id, 'belakang')).toBe(books);
    const r = placeBooks(books, [books[1].id], slotA);
    expect(moveToLayer(r, books[1].id, 'depan')).toBe(r);
  });

  test('moveInSlot reorders within the back layer only', () => {
    const books = komik(4);
    let r = placeBooks(books, [books[0].id, books[1].id], slotA);
    r = placeBooks(r, [books[2].id, books[3].id], slotA, 'belakang');
    r = moveInSlot(r, books[3].id, 0);
    expect(vols(r, 'belakang')).toEqual([4, 3]);
    expect(vols(r, 'depan')).toEqual([1, 2]);
  });

  test('slotUsage counts one layer; the back layer loses the riser height', () => {
    const books = komik(3);
    let r = placeBooks(books, [books[0].id], slotA);
    r = placeBooks(r, [books[1].id, books[2].id], slotA, 'belakang');
    expect(slotUsage(r, shelf, 0, 0, 'depan').usedCm).toBe(1.5);
    expect(slotUsage(r, shelf, 0, 0, 'belakang').usedCm).toBe(3);
    // Row 0 is 22 cm: an 18 cm comic fits in front, but not on a 5 cm riser (17 cm left).
    const low = { ...shelf, rowHeightsCm: [22, 33, 33, 33] };
    expect(slotUsage(r, { ...low, backRiserCm: 5 }, 0, 0, 'belakang').tooTall).toBe(true);
    expect(slotUsage(r, { ...low, backRiserCm: 4 }, 0, 0, 'belakang').tooTall).toBe(false);
    expect(slotUsage(r, { ...low, backRiserCm: 5 }, 0, 0, 'depan').tooTall).toBe(false);
  });

  test('a shelf made shallower than 26 cm counts and returns only its back-layer books', () => {
    const books = komik(4);
    let r = placeBooks(books, [books[0].id, books[1].id], slotA);
    r = placeBooks(r, [books[2].id, books[3].id], slotA, 'belakang');
    expect(countBooksOutside(r, { ...shelf, depthCm: 20 })).toBe(2);
    expect(countBooksOutside(r, { ...shelf, depthCm: 30 })).toBe(0);
    const back = returnBooksOutside(r, { ...shelf, depthCm: 20 });
    expect(back.filter((b) => b.placement === null).map((b) => b.volume)).toEqual([3, 4]);
    expect(vols(back, 'depan')).toEqual([1, 2]);
  });
});

describe('moveBooksToLayer', () => {
  const vols = (books: Book[], slot: typeof slotA, layer: 'depan' | 'belakang') => booksInSlot(books, slot, layer).map((b) => b.volume);

  test('moves several books at once, keeping their order, and closes the gaps', () => {
    const books = komik(5);
    let r = placeBooks(books, books.map((b) => b.id), slotA);
    r = moveBooksToLayer(r, [books[3].id, books[1].id], 'belakang');
    expect(vols(r, slotA, 'belakang')).toEqual([2, 4]);
    expect(vols(r, slotA, 'depan')).toEqual([1, 3, 5]);
    expect(booksInSlot(r, slotA, 'depan').map((b) => b.placement!.order)).toEqual([0, 1, 2]);
  });

  test('books from two slots each stay in their own slot', () => {
    const books = komik(4);
    let r = placeBooks(books, [books[0].id, books[1].id], slotA);
    r = placeBooks(r, [books[2].id, books[3].id], slotB);
    r = moveBooksToLayer(r, [books[0].id, books[2].id], 'belakang');
    expect(vols(r, slotA, 'belakang')).toEqual([1]);
    expect(vols(r, slotB, 'belakang')).toEqual([3]);
  });

  test('unplaced books and books already on that layer are left alone', () => {
    const books = komik(3);
    const r = placeBooks(books, [books[0].id], slotA, 'belakang');
    expect(moveBooksToLayer(r, [books[0].id, books[1].id], 'belakang')).toBe(r);
  });
});

describe('fillLayer', () => {
  const ids = (books: Book[]) => books.map((b) => b.id);

  test('places books in order until the layer is full and hands back the rest', () => {
    const books = komik(25); // 25 × 1.5 cm into a 33 cm slot: 22 fit
    const r = fillLayer(books, ids(books), shelf, slotA, 'belakang');
    expect(r.placed).toEqual(ids(books).slice(0, 22));
    expect(r.rest).toEqual(ids(books).slice(22));
    expect(booksInSlot(r.books, slotA, 'belakang')).toHaveLength(22);
    expect(r.books.filter((b) => b.placement === null)).toHaveLength(3);
  });

  test('counts what the layer already holds', () => {
    const books = komik(25);
    const first = placeBooks(books, ids(books).slice(0, 20), slotA, 'belakang');
    const r = fillLayer(first, ids(books).slice(20), shelf, slotA, 'belakang');
    expect(r.placed).toHaveLength(2);
    expect(r.rest).toHaveLength(3);
  });

  test('never skips ahead: a thick book that does not fit stops the run', () => {
    const books = komik(22);
    const thick = { ...createBook({ title: 'Tebal', type: 'buku' }), thicknessCm: 3 };
    const thin = createBook({ title: 'Tipis', type: 'komik' });
    const start = placeBooks([...books, thick, thin], ids(books).slice(0, 21), slotA); // 31.5 cm used
    const r = fillLayer(start, [thick.id, thin.id], shelf, slotA, 'depan');
    expect(r.placed).toEqual([]);
    expect(r.rest).toEqual([thick.id, thin.id]);
  });
});

describe('flowRight', () => {
  test('fills the same layer of the slots to the right, then hands back what is left at the end of the tier', () => {
    const books = komik(100);
    const all = books.map((b) => b.id);
    const first = fillLayer(books, all, shelf, slotA, 'belakang');
    const r = flowRight(first.books, first.rest, shelf, slotA, 'belakang');
    for (const col of [1, 2, 3]) expect(booksInSlot(r.books, { ...slotA, col }, 'belakang')).toHaveLength(22);
    expect(r.rest).toHaveLength(100 - 88);
    expect(booksInSlot(r.books, slotB, 'depan')).toHaveLength(0);
  });

  test('at the last column there is nowhere to go', () => {
    const books = komik(2);
    const last = { ...slotA, col: 3 };
    const r = flowRight(books, books.map((b) => b.id), shelf, last, 'depan');
    expect(r.rest).toHaveLength(2);
    expect(r.books).toBe(books);
    expect(hasSlotRight(shelf, last)).toBe(false);
    expect(hasSlotRight(shelf, slotA)).toBe(true);
  });
});
