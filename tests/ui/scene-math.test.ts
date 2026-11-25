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

import { createShelf, setColumnCount } from '../../src/domain/shelves';
import { shelfBoards } from '../../src/ui/scene/ShelfMesh';
import { placedBookBoxes } from '../../src/ui/scene/BooksMesh';
import { placeBooks } from '../../src/domain/placement';

test('shelfBoards counts outer boards, dividers and back panel', () => {
  expect(shelfBoards(createShelf('rak-buku', 'R'))).toHaveLength(4 + 4 + 1);
  expect(shelfBoards(createShelf('kubus', 'K'))).toHaveLength(4 + 3 + 12);
});

test('placedBookBoxes skips overflowed books', () => {
  const shelf = createShelf('kubus', 'K');
  const books = Array.from({ length: 30 }, () => createBook({ title: 'K', type: 'komik' }));
  const placed = placeBooks(books, books.map((b) => b.id), { shelfId: shelf.id, row: 0, col: 0 });
  expect(placedBookBoxes(placed, [shelf])).toHaveLength(22);
});

test('vertical dividers are drawn per row', () => {
  const boards = shelfBoards(setColumnCount(createShelf('rak-buku', 'R'), 0, 3));
  expect(boards).toHaveLength(4 + 4 + 2 + 1);
  const dividers = boards.filter((b) => b.key.startsWith('v'));
  expect(dividers.map((d) => d.position[1])).toEqual([2 + 33 / 2, 2 + 33 / 2]);
  expect(dividers.map((d) => d.size[1])).toEqual([33, 33]);
});

test('placedBookBoxes uses the row own columns', () => {
  const shelf = setColumnCount(createShelf('rendah', 'R'), 0, 4); // 2 rows, row 0 has 4 columns
  const [b] = [createBook({ title: 'K', type: 'komik' })];
  const placed = placeBooks([b], [b.id], { shelfId: shelf.id, row: 0, col: 3 });
  expect(placedBookBoxes(placed, [shelf])).toHaveLength(1);
});

import { backBookDepth, backBookZ, backSpace, riserBox } from '../../src/ui/scene/layers';
import { slotRect } from '../../src/domain/shelves';

describe('back layer geometry', () => {
  test('on a 30 cm shelf with a back panel, a 15 cm back book is drawn thinner so it never meets the front book', () => {
    const shelf = createShelf('rak-buku', 'R');
    const space = backSpace(shelf, 15);
    expect(space.zMin).toBeCloseTo(-14.4);
    expect(space.zMax).toBeCloseTo(-1.5);
    const d = backBookDepth(15, space);
    expect(d).toBeCloseTo(11.9);
    expect(backBookZ(d, space) + d / 2).toBeLessThanOrEqual(space.zMax + 1e-9);
  });

  test('a deep shelf keeps the back comic at full depth', () => {
    const shelf = createShelf('kubus', 'K');
    expect(backBookDepth(13, backSpace(shelf, 13))).toBe(13);
  });

  test('no riser at 0 cm, and a riser never taller than the slot', () => {
    const shelf = createShelf('kubus', 'K');
    const slot = slotRect(shelf, 0, 0);
    const space = backSpace(shelf, 13);
    expect(riserBox(slot, space, 0)).toBeNull();
    expect(riserBox(slot, space, 40)!.size[1]).toBe(slot.height);
    expect(riserBox(slot, space, 5)!.position[1]).toBeCloseTo(slot.y + 2.5);
  });

  test('back-layer books stand on the riser; front books stay on the board', () => {
    const shelf = createShelf('kubus', 'K');
    const books = Array.from({ length: 30 }, () => createBook({ title: 'K', type: 'komik' }));
    let placed = placeBooks(books, books.slice(0, 2).map((b) => b.id), { shelfId: shelf.id, row: 0, col: 0 });
    // 24 comics overflow the 33 cm slot, so none of them leans.
    placed = placeBooks(placed, books.slice(2, 26).map((b) => b.id), { shelfId: shelf.id, row: 0, col: 0 }, 'belakang');
    const rect = slotRect(shelf, 0, 0);
    const boxes = placedBookBoxes(placed, [shelf]);
    const back = boxes.filter((p) => p.layer === 'belakang');
    const front = boxes.filter((p) => p.layer === 'depan');
    expect(back.length).toBeGreaterThan(0);
    for (const p of back) expect(p.local[1] - p.size[1] / 2).toBeCloseTo(rect.y + 5);
    for (const p of front.filter((x) => x.tilt === 0)) expect(p.local[1] - p.size[1] / 2).toBeCloseTo(rect.y);
    expect(Math.max(...back.map((p) => p.local[2] + p.size[2] / 2))).toBeLessThan(Math.min(...front.map((p) => p.local[2] - p.size[2] / 2)));
  });
});
