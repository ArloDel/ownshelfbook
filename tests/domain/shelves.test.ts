import {
  clampDim,
  clampShelfToRoom,
  columnCount,
  createShelf,
  fitRow,
  migrateShelfV1,
  minInnerWidth,
  setColumnCount,
  setColumnWidth,
  setInnerWidth,
  setRowCount,
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

test('presets render as before', () => {
  expect(shelfSize(createShelf('rak-buku', 'R')).width).toBe(80);
  expect(createShelf('kubus', 'K')).toMatchObject({ innerWidthCm: 138 });
  expect(createShelf('kubus', 'K').colWidthsCm).toEqual([[33, 33, 33, 33], [33, 33, 33, 33], [33, 33, 33, 33], [33, 33, 33, 33]]);
});

test('slotRect follows the row own columns', () => {
  const s = setColumnCount(createShelf('rak-buku', 'R'), 1, 2);
  expect(s.colWidthsCm[1]).toEqual([37, 37]);
  expect(slotRect(s, 1, 1)).toMatchObject({ x: -40 + 2 + 37 + 2, width: 37 });
  expect(slotRect(s, 0, 0)).toMatchObject({ x: -38, width: 76 });
});

test('setColumnCount splits equally with remainder in the last column', () => {
  expect(setColumnCount(createShelf('rak-buku', 'R'), 0, 3).colWidthsCm[0]).toEqual([24, 24, 24]);
  const s = { ...createShelf('rak-buku', 'R'), innerWidthCm: 77, colWidthsCm: [[77], [77], [77], [77], [77]] };
  expect(setColumnCount(s, 0, 3).colWidthsCm[0]).toEqual([24.3, 24.3, 24.4]);
});

test('setColumnCount cannot squeeze columns below 5 cm', () => {
  const s = setInnerWidth(createShelf('rak-buku', 'R'), 30);
  expect(columnCount(setColumnCount(s, 0, 20), 0)).toBe(4);
});

test('setColumnWidth: last column absorbs the change', () => {
  const s = setColumnCount(createShelf('rak-buku', 'R'), 0, 2);
  expect(setColumnWidth(s, 0, 0, 50).colWidthsCm[0]).toEqual([50, 24]);
  expect(setColumnWidth(s, 0, 1, 50).colWidthsCm[0]).toEqual([37, 37]);
});

test('setColumnWidth clamps so the last column keeps 5 cm', () => {
  const s = setColumnCount(createShelf('rak-buku', 'R'), 0, 2);
  expect(setColumnWidth(s, 0, 0, 500).colWidthsCm[0]).toEqual([69, 5]);
});

test('setInnerWidth scales rows and respects the minimum', () => {
  const s = setColumnCount(createShelf('rak-buku', 'R'), 0, 2);
  const wide = setInnerWidth(s, 154);
  expect(wide.colWidthsCm[0]).toEqual([76, 76]);
  expect(wide.colWidthsCm[1]).toEqual([154]);
  expect(setInnerWidth(s, 1).innerWidthCm).toBe(12);
  expect(minInnerWidth(s)).toBe(12);
});

test('setRowCount copies the top row when growing', () => {
  const s = setColumnCount(createShelf('rendah', 'R'), 1, 2);
  const g = setRowCount(s, 3);
  expect(g.rowHeightsCm).toEqual([35, 35, 35]);
  expect(g.colWidthsCm[2]).toEqual(g.colWidthsCm[1]);
  expect(setRowCount(s, 0).rowHeightsCm).toHaveLength(1);
  expect(setRowCount(s, 0).colWidthsCm).toHaveLength(1);
  expect(setRowCount(s, 99).rowHeightsCm).toHaveLength(20);
});

test('fitRow keeps the invariant', () => {
  expect(fitRow([10, 10, 10], 50, 2)).toEqual([10, 10, 26]);
  expect(fitRow([40, 40], 50, 2)).toEqual([40, 8]);
  expect(fitRow([3, 100, 1], 50, 2)).toEqual([5, 36, 5]);
});

test('migrateShelfV1 copies the flat pattern to every row', () => {
  const { innerWidthCm: _i, colWidthsCm: _c, ...rest } = createShelf('kubus', 'K');
  const m = migrateShelfV1({ ...rest, colWidthsCm: [30, 40] });
  expect(m.colWidthsCm).toEqual([[30, 40], [30, 40], [30, 40], [30, 40]]);
  expect(m.innerWidthCm).toBe(72);
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

test('setColumnCount above the room maximum keeps custom widths', () => {
  let s = setInnerWidth(createShelf('rak-buku', 'R'), 30); // max 4 columns
  s = setColumnCount(s, 0, 4);
  s = setColumnWidth(s, 0, 0, 9);
  expect(setColumnCount(s, 0, 20).colWidthsCm[0]).toEqual(s.colWidthsCm[0]);
});
