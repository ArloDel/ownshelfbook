import { db } from '../../src/persistence/db';
import * as repo from '../../src/persistence/repo';
import { loadAll } from '../../src/persistence/repo';
import { createDataStore } from '../../src/store/dataStore';
import { createBook } from '../../src/domain/books';
import { createShelf, setRowCount } from '../../src/domain/shelves';
import { toBackup } from '../../src/domain/backup';
import { DEFAULT_ROOM } from '../../src/persistence/db';

beforeEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
  await db.open();
});

test('a failed write rolls the change back and reports an error', async () => {
  const s = createDataStore();
  await s.getState().hydrate();
  const id = await s.getState().addShelf('kubus');
  await s.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: 2 });
  vi.spyOn(repo, 'saveBooks').mockRejectedValueOnce(new Error('QuotaExceededError'));
  await s.getState().placeBooks(s.getState().books.map((b) => b.id), { shelfId: id, row: 0, col: 0 });
  expect(s.getState().books.every((b) => b.placement === null)).toBe(true);
  expect(s.getState().error).toMatch(/gagal disimpan/i);
  s.getState().clearError();
  expect(s.getState().error).toBeNull();
});

test('a failed shelf move leaves the old position', async () => {
  const s = createDataStore();
  await s.getState().hydrate();
  const id = await s.getState().addShelf('rak-buku');
  vi.spyOn(repo, 'saveShelves').mockRejectedValueOnce(new Error('closed'));
  await s.getState().updateShelf(id, { position: { x: 100, z: 0 } });
  expect(s.getState().shelves[0].position.x).toBe(0);
  expect(s.getState().error).not.toBeNull();
});

test('hydrate failure sets an error instead of hanging', async () => {
  const s = createDataStore();
  vi.spyOn(repo, 'loadAll').mockRejectedValueOnce(new Error('broken'));
  await s.getState().hydrate();
  expect(s.getState().loaded).toBe(false);
  expect(s.getState().error).toMatch(/memuat/i);
});

test('resize is all-or-nothing in the database', async () => {
  const s = createDataStore();
  await s.getState().hydrate();
  const id = await s.getState().addShelf('kubus');
  await s.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: 1 });
  await s.getState().placeBooks([s.getState().books[0].id], { shelfId: id, row: 3, col: 0 });
  vi.spyOn(repo, 'saveShelves').mockRejectedValueOnce(new Error('fail'));
  await s.getState().reshapeShelf(id, setRowCount(s.getState().shelves[0], 2));
  const disk = await loadAll();
  expect(disk.shelves[0].rowHeightsCm).toHaveLength(4);
  expect(disk.books[0].placement).not.toBeNull();
  expect(s.getState().books[0].placement).not.toBeNull();
});

describe('import normalises foreign data', () => {
  const shelf = createShelf('kubus', 'K');
  const base = () => ({ room: DEFAULT_ROOM, shelves: [shelf], books: [] as ReturnType<typeof createBook>[] });

  test('placements on missing shelves or slots become unplaced', async () => {
    const d = base();
    const a = { ...createBook({ title: 'A', type: 'buku' }), placement: { shelfId: 'nope', row: 0, col: 0, order: 0 } };
    const b = { ...createBook({ title: 'B', type: 'buku' }), placement: { shelfId: shelf.id, row: 9, col: 0, order: 0 } };
    const c = { ...createBook({ title: 'C', type: 'buku' }), placement: { shelfId: shelf.id, row: 0.5, col: 0, order: 0 } };
    const e = { ...createBook({ title: 'E', type: 'buku' }), placement: { shelfId: shelf.id, row: 0, col: 0, order: 7 } };
    d.books = [a, b, c, e];
    const s = createDataStore();
    await s.getState().importData(toBackup(d));
    const byTitle = Object.fromEntries(s.getState().books.map((x) => [x.title, x.placement]));
    expect(byTitle.A).toBeNull();
    expect(byTitle.B).toBeNull();
    expect(byTitle.C).toBeNull();
    expect(byTitle.E).toMatchObject({ order: 0 });
  });

  test('duplicate ids are rejected and nothing changes', async () => {
    const s = createDataStore();
    await s.getState().hydrate();
    await s.getState().addSeries({ series: 'Keep', type: 'buku', from: 1, to: 1 });
    const d = base();
    const a = createBook({ title: 'A', type: 'buku' });
    d.books = [a, { ...a }];
    await expect(s.getState().importData(toBackup(d))).rejects.toThrow(/ganda/);
    expect((await loadAll()).books.map((b) => b.title)).toEqual(['Keep']);
  });

  test('nonsense sizes are clamped', async () => {
    const d = base();
    d.room = { widthCm: -5, depthCm: 400, heightCm: 260 };
    d.shelves = [{ ...shelf, rowHeightsCm: [0, 33], colWidthsCm: [Array(50).fill(30), [30]] }];
    const s = createDataStore();
    await s.getState().importData(toBackup(d));
    expect(s.getState().room.widthCm).toBeGreaterThanOrEqual(50);
    expect(s.getState().shelves[0].rowHeightsCm).toEqual([5, 33]);
    expect(s.getState().shelves[0].colWidthsCm[0]).toHaveLength(20);
  });
});
