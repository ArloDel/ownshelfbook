import {
  clampDim,
  clampShelfToRoom,
  createShelf,
  resizeShelf,
  shelfSize,
  shelvesOverlap,
  slotRect,
} from '../../src/domain/shelves';

test('shelfSize of rak-buku', () => {
  expect(shelfSize(createShelf('rak-buku', 'R'))).toEqual({ width: 80, height: 177, depth: 30 });
});

test('slotRect bottom-left of kubus', () => {
  expect(slotRect(createShelf('kubus', 'K'), 0, 0)).toEqual({ x: -69, y: 2, width: 33, height: 33 });
});

test('slotRect row 1 col 1 of kubus', () => {
  expect(slotRect(createShelf('kubus', 'K'), 1, 1)).toEqual({ x: -34, y: 37, width: 33, height: 33 });
});

test('presets are not shared by reference', () => {
  const a = createShelf('rak-buku', 'A');
  a.rowHeightsCm[0] = 99;
  expect(createShelf('rak-buku', 'B').rowHeightsCm[0]).toBe(33);
});

test('wall shelf hangs at elevation 120', () => {
  expect(createShelf('dinding', 'D').elevationCm).toBe(120);
});

test('resizeShelf adds and removes at the end', () => {
  const s = { ...createShelf('rendah', 'R'), rowHeightsCm: [20, 40], colWidthsCm: [10, 30, 50] };
  expect(resizeShelf(s, 3, 2)).toMatchObject({ rowHeightsCm: [20, 40, 40], colWidthsCm: [10, 30] });
});

test('resizeShelf clamps counts to 1..20', () => {
  const r = resizeShelf(createShelf('rendah', 'R'), 0, 99);
  expect(r.rowHeightsCm).toHaveLength(1);
  expect(r.colWidthsCm).toHaveLength(20);
});

test.each([
  [0, 5],
  [-3, 5],
  [NaN, 5],
  [1000, 300],
  [42, 42],
])('clampDim(%s) = %s', (i, o) => {
  expect(clampDim(i)).toBe(o);
});

test('clampShelfToRoom pulls an outside shelf back in', () => {
  const s = { ...createShelf('rak-buku', 'R'), position: { x: 1000, z: 0 } };
  const c = clampShelfToRoom(s, { widthCm: 400, depthCm: 300, heightCm: 260 });
  expect(c.position.x).toBe(200 - 40);
});

test('clampShelfToRoom accounts for rotation', () => {
  const s = { ...createShelf('rak-buku', 'R'), position: { x: 1000, z: 0 }, rotationY: 90 };
  const c = clampShelfToRoom(s, { widthCm: 400, depthCm: 300, heightCm: 260 });
  expect(c.position.x).toBeCloseTo(200 - 15);
});

test('shelvesOverlap', () => {
  const a = createShelf('rak-buku', 'A', { x: 0, z: 0 });
  expect(shelvesOverlap(a, createShelf('rak-buku', 'B', { x: 50, z: 0 }))).toBe(true);
  expect(shelvesOverlap(a, createShelf('rak-buku', 'C', { x: 80, z: 0 }))).toBe(false);
  expect(shelvesOverlap(a, { ...createShelf('rak-buku', 'D', { x: 60, z: 0 }), rotationY: 90 })).toBe(false);
});

import { snapPosition, snapRotation } from '../../src/domain/shelves';

test('snapPosition rounds to the 5 cm grid', () => {
  expect(snapPosition({ x: 12.4, z: -7.6 })).toEqual({ x: 10, z: -10 });
});

test.each([
  [-20, 345],
  [368, 15],
  [7, 0],
  [8, 15],
])('snapRotation(%s) = %s', (i, o) => {
  expect(snapRotation(i)).toBe(o);
});

import { overlappingIds } from '../../src/domain/shelves';

test('overlappingIds lists every shelf that overlaps another', () => {
  const a = createShelf('rak-buku', 'A', { x: 0, z: 0 });
  const b = createShelf('rak-buku', 'B', { x: 50, z: 0 });
  const c = createShelf('rak-buku', 'C', { x: 300, z: 0 });
  expect([...overlappingIds([a, b, c])].sort()).toEqual([a.id, b.id].sort());
});
