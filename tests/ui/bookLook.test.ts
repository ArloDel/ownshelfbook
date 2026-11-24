import { createBook } from '../../src/domain/books';
import { placeBooks } from '../../src/domain/placement';
import { createShelf } from '../../src/domain/shelves';
import { placedBookBoxes } from '../../src/ui/scene/BooksMesh';
import { bandColor, heightFactor, leanBook, spineBands } from '../../src/ui/scene/bookLook';

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

/** Corners of a w×h box centred at (cx, cy), turned by tilt (counter-clockwise, seen from the front). */
function corners(cx: number, cy: number, w: number, h: number, tilt: number) {
  const c = Math.cos(tilt), s = Math.sin(tilt);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

test('leanBook tilts the book against its left neighbour and keeps it inside the slot', () => {
  const r = leanBook({ left: 10, bottom: 2, width: 1.5, height: 18 }, 30, 35);
  expect(r.tilt).toBeGreaterThan(0);
  const pts = corners(r.cx, r.cy, 1.5, 18, r.tilt);
  expect(Math.min(...pts.map((p) => p[0]))).toBeCloseTo(10); // top-left corner rests on the neighbour
  expect(Math.min(...pts.map((p) => p[1]))).toBeCloseTo(2); // stands on the board
  expect(Math.max(...pts.map((p) => p[0]))).toBeLessThanOrEqual(30);
  expect(Math.max(...pts.map((p) => p[1]))).toBeLessThanOrEqual(35);
});

test('leanBook leans less when space is tight, and not at all when the slot is full', () => {
  const roomy = leanBook({ left: 0, bottom: 0, width: 2, height: 20 }, 30, 40).tilt;
  const tight = leanBook({ left: 0, bottom: 0, width: 2, height: 20 }, 3, 40).tilt;
  expect(tight).toBeGreaterThan(0);
  expect(tight).toBeLessThan(roomy);
  expect(leanBook({ left: 0, bottom: 0, width: 2, height: 20 }, 2.2, 40)).toEqual({ cx: 1, cy: 10, tilt: 0 });
});

test('only the last book of a slot with free space leans', () => {
  const shelf = createShelf('rak-buku', 'R');
  const few = Array.from({ length: 3 }, (_, i) => createBook({ title: `V${i}`, type: 'komik' }));
  const placed = placedBookBoxes(placeBooks(few, few.map((b) => b.id), { shelfId: shelf.id, row: 1, col: 0 }), [shelf]);
  expect(placed.map((p) => p.tilt > 0)).toEqual([false, false, true]);

  const many = Array.from({ length: 80 }, (_, i) => createBook({ title: `W${i}`, type: 'komik' }));
  const full = placedBookBoxes(placeBooks(many, many.map((b) => b.id), { shelfId: shelf.id, row: 1, col: 0 }), [shelf]);
  expect(full.every((p) => p.tilt === 0)).toBe(true);
});

test('spineBands puts a thin strip near the top and bottom of the spine', () => {
  const bands = spineBands([1.5, 18, 13]);
  expect(bands).toHaveLength(2);
  for (const b of bands) {
    expect(b.size[0]).toBeCloseTo(1.5);
    expect(b.size[1]).toBeGreaterThan(0.2);
    expect(Math.abs(b.position[1]) + b.size[1] / 2).toBeLessThan(9); // inside the book height
    expect(b.position[2]).toBeGreaterThan(13 / 2); // just in front of the spine
  }
  expect(bands[0].position[1]).toBeCloseTo(-bands[1].position[1]);
});

test('bandColor is a darker shade of the book colour', () => {
  expect(bandColor('#ffffff')).toBe('#9e9e9e');
  expect(bandColor('#3a6ea5')).toBe('#244466');
});
