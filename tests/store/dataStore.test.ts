import { db } from '../../src/persistence/db';
import { loadAll } from '../../src/persistence/repo';
import { createDataStore } from '../../src/store/dataStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

test('addSeries persists and hydrates into a fresh store', async () => {
  const s1 = createDataStore();
  await s1.getState().hydrate();
  await s1.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 3 });
  const s2 = createDataStore();
  await s2.getState().hydrate();
  expect(s2.getState().loaded).toBe(true);
  expect(s2.getState().books.map((b) => b.volume).sort()).toEqual([1, 2, 3]);
});

async function storeWithPlacedBooks() {
  const s = createDataStore();
  await s.getState().hydrate();
  await s.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: 3 });
  const id = await s.getState().addShelf('kubus');
  const ids = s.getState().books.map((b) => b.id);
  await s.getState().placeBooks(ids, { shelfId: id, row: 3, col: 3 });
  return { s, id };
}

test('resizeShelf returns books outside to unplaced', async () => {
  const { s, id } = await storeWithPlacedBooks();
  await s.getState().resizeShelf(id, 3, 4);
  expect(s.getState().books).toHaveLength(3);
  expect(s.getState().books.every((b) => b.placement === null)).toBe(true);
  expect((await loadAll()).books.every((b) => b.placement === null)).toBe(true);
  expect(s.getState().shelves[0].rowHeightsCm).toHaveLength(3);
});

test('deleteShelf keeps its books unplaced', async () => {
  const { s, id } = await storeWithPlacedBooks();
  await s.getState().deleteShelf(id);
  expect(s.getState().shelves).toHaveLength(0);
  expect(s.getState().books).toHaveLength(3);
  expect(s.getState().books.every((b) => b.placement === null)).toBe(true);
  expect((await loadAll()).shelves).toHaveLength(0);
});

test('updateShelf clamps dimensions', async () => {
  const s = createDataStore();
  await s.getState().hydrate();
  const id = await s.getState().addShelf('rak-buku');
  await s.getState().updateShelf(id, { depthCm: -10, rowHeightsCm: [NaN, 1000] });
  expect(s.getState().shelves[0].depthCm).toBe(5);
  expect(s.getState().shelves[0].rowHeightsCm).toEqual([5, 300]);
});

test('setRoom clamps shelves inside the smaller room', async () => {
  const s = createDataStore();
  await s.getState().hydrate();
  const id = await s.getState().addShelf('rak-buku');
  await s.getState().updateShelf(id, { position: { x: 200, z: 0 } });
  await s.getState().setRoom({ widthCm: 100, depthCm: 100, heightCm: 260 });
  expect(Math.abs(s.getState().shelves[0].position.x)).toBeLessThanOrEqual(50 - 40);
});

test('deleteBooks keeps contiguous orders in the slot', async () => {
  const { s, id } = await storeWithPlacedBooks();
  const first = s.getState().books.find((b) => b.placement?.order === 0)!;
  await s.getState().deleteBooks([first.id]);
  const orders = s.getState().books.map((b) => b.placement!.order).sort();
  expect(orders).toEqual([0, 1]);
  expect(s.getState().books.every((b) => b.placement?.shelfId === id)).toBe(true);
});

test('importData rejects garbage and leaves data untouched', async () => {
  const s = createDataStore();
  await s.getState().hydrate();
  await s.getState().addSeries({ series: 'Keep', type: 'buku', from: 1, to: 2 });
  await expect(s.getState().importData('garbage')).rejects.toThrow();
  expect(s.getState().books).toHaveLength(2);
  expect((await loadAll()).books).toHaveLength(2);
});

test('export then import restores data', async () => {
  const s = createDataStore();
  await s.getState().hydrate();
  await s.getState().addSeries({ series: 'Keep', type: 'buku', from: 1, to: 2 });
  const text = s.getState().exportData();
  await s.getState().deleteBooks(s.getState().books.map((b) => b.id));
  await s.getState().importData(text);
  expect(s.getState().books).toHaveLength(2);
  expect((await loadAll()).books).toHaveLength(2);
});
