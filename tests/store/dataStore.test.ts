import { db } from '../../src/persistence/db';
import { loadAll } from '../../src/persistence/repo';
import { createDataStore } from '../../src/store/dataStore';
import { setColumnCount, setRowCount } from '../../src/domain/shelves';
import { createShelf } from '../../src/domain/shelves';
import { toBackup } from '../../src/domain/backup';
import { DEFAULT_ROOM } from '../../src/persistence/db';

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

test('reshapeShelf returns books outside to unplaced', async () => {
  const { s, id } = await storeWithPlacedBooks();
  await s.getState().reshapeShelf(id, setRowCount(s.getState().shelves[0], 3));
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

test('reshapeShelf with fewer columns in one row only unplaces that row removed columns', async () => {
  const s = createDataStore();
  await s.getState().hydrate();
  const id = await s.getState().addShelf('kubus');
  const [a, b] = await s.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: 2 });
  await s.getState().placeBooks([a.id], { shelfId: id, row: 1, col: 3 });
  await s.getState().placeBooks([b.id], { shelfId: id, row: 1, col: 0 });
  await s.getState().reshapeShelf(id, setColumnCount(s.getState().shelves[0], 1, 2));
  expect(s.getState().shelves[0].colWidthsCm[1]).toHaveLength(2);
  const byId = Object.fromEntries((await loadAll()).books.map((x) => [x.id, x.placement]));
  expect(byId[a.id]).toBeNull();
  expect(byId[b.id]).not.toBeNull();
});

test('import refits rows whose widths do not fill the shelf', async () => {
  const shelf = { ...createShelf('rak-buku', 'R'), innerWidthCm: 80 };
  shelf.colWidthsCm = [[10, 10], [80], [80], [80], [80]];
  const s = createDataStore();
  await s.getState().importData(toBackup({ room: DEFAULT_ROOM, shelves: [shelf], books: [] }));
  expect(s.getState().shelves[0].colWidthsCm[0]).toEqual([10, 68]);
});

describe('two layers', () => {
  async function storeWithBack() {
    const s = createDataStore();
    await s.getState().hydrate();
    await s.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: 4 });
    const id = await s.getState().addShelf('kubus');
    const [a, b, c, d] = s.getState().books.map((x) => x.id);
    await s.getState().placeBooks([a, b], { shelfId: id, row: 0, col: 0 });
    await s.getState().placeBooks([c, d], { shelfId: id, row: 0, col: 0 }, 'belakang');
    return { s, id, ids: [a, b, c, d] };
  }

  test('placeBooks on the back layer is saved and loads back', async () => {
    const { ids } = await storeWithBack();
    const fresh = createDataStore();
    await fresh.getState().hydrate();
    const layerOfId = (id: string) => fresh.getState().books.find((x) => x.id === id)!.placement!.layer;
    expect(ids.map(layerOfId)).toEqual(['depan', 'depan', 'belakang', 'belakang']);
  });

  test('moveToLayer is saved', async () => {
    const { s, ids } = await storeWithBack();
    await s.getState().moveToLayer(ids[0], 'belakang');
    const saved = (await loadAll()).books.find((x) => x.id === ids[0])!;
    expect(saved.placement!.layer).toBe('belakang');
  });

  test('a shelf made shallower than 26 cm sends its back layer to unplaced', async () => {
    const { s, id, ids } = await storeWithBack();
    await s.getState().reshapeShelf(id, { ...s.getState().shelves[0], depthCm: 20 });
    const byId = (x: string) => s.getState().books.find((b) => b.id === x)!;
    expect(ids.map((x) => byId(x).placement === null)).toEqual([false, false, true, true]);
    expect(s.getState().shelves[0].depthCm).toBe(20);
  });

  test('import drops back-layer books on shallow shelves and clamps the riser', async () => {
    const shallow = { ...createShelf('dinding', 'D'), backRiserCm: 99 };
    const deep = createShelf('kubus', 'K');
    const s0 = createDataStore();
    await s0.getState().hydrate();
    await s0.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: 2 });
    const [a, b] = s0.getState().books;
    const books = [
      { ...a, placement: { shelfId: shallow.id, row: 0, col: 0, order: 0, layer: 'belakang' as const } },
      { ...b, placement: { shelfId: deep.id, row: 0, col: 0, order: 0, layer: 'belakang' as const } },
    ];
    const s = createDataStore();
    await s.getState().importData(toBackup({ room: DEFAULT_ROOM, shelves: [shallow, deep], books }));
    expect(s.getState().books.find((x) => x.id === a.id)!.placement).toBeNull();
    expect(s.getState().books.find((x) => x.id === b.id)!.placement!.layer).toBe('belakang');
    expect(s.getState().shelves.find((x) => x.id === shallow.id)!.backRiserCm).toBe(15);
  });
});

test('moveBooksToLayer moves and saves several books at once', async () => {
  const s = createDataStore();
  await s.getState().hydrate();
  await s.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: 3 });
  const id = await s.getState().addShelf('kubus');
  const ids = s.getState().books.map((b) => b.id);
  await s.getState().placeBooks(ids, { shelfId: id, row: 0, col: 0 });
  await s.getState().moveBooksToLayer([ids[0], ids[2]], 'belakang');
  const saved = (await loadAll()).books;
  const layer = (x: string) => saved.find((b) => b.id === x)!.placement!.layer;
  expect(ids.map(layer)).toEqual(['belakang', 'depan', 'belakang']);
});

describe('filling slots', () => {
  async function store(n: number) {
    const s = createDataStore();
    await s.getState().hydrate();
    await s.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: n });
    const id = await s.getState().addShelf('kubus');
    return { s, id, ids: s.getState().books.map((b) => b.id) };
  }

  test('fillSlot saves what fits and returns the rest', async () => {
    const { s, id, ids } = await store(25);
    const rest = await s.getState().fillSlot(ids, { shelfId: id, row: 0, col: 0 }, 'belakang');
    expect(rest).toEqual(ids.slice(22));
    expect((await loadAll()).books.filter((b) => b.placement?.layer === 'belakang')).toHaveLength(22);
  });

  test('flowToRight saves into the next slots and returns what is left', async () => {
    const { s, id, ids } = await store(30);
    const rest = await s.getState().flowToRight(ids, { shelfId: id, row: 0, col: 2 }, 'belakang');
    expect(rest).toEqual(ids.slice(22));
    expect((await loadAll()).books.filter((b) => b.placement?.col === 3)).toHaveLength(22);
  });
});

describe('spine images', () => {
  const img = 'data:image/webp;base64,AAA';

  test('setCover is saved and loads into a fresh store; removeCover deletes it', async () => {
    const s = createDataStore();
    await s.getState().hydrate();
    await s.getState().setCover('Naruto', img);
    const fresh = createDataStore();
    await fresh.getState().hydrate();
    expect(fresh.getState().covers).toEqual({ Naruto: img });
    await fresh.getState().removeCover('Naruto');
    expect(fresh.getState().covers).toEqual({});
    expect((await loadAll()).covers).toEqual([]);
  });

  test('export then import brings the images back', async () => {
    const s = createDataStore();
    await s.getState().hydrate();
    await s.getState().setCover('Naruto', img);
    const text = s.getState().exportData();
    await s.getState().removeCover('Naruto');
    await s.getState().importData(text);
    expect(s.getState().covers).toEqual({ Naruto: img });
  });

  test('importing an older backup without images keeps the images', async () => {
    const s = createDataStore();
    await s.getState().hydrate();
    await s.getState().setCover('Naruto', img);
    const old = JSON.parse(s.getState().exportData());
    old.version = 2;
    delete old.covers;
    await s.getState().importData(JSON.stringify(old));
    expect(s.getState().covers).toEqual({ Naruto: img });
    expect((await loadAll()).covers).toHaveLength(1);
  });

  test('an image outlives its books and shows again when the series comes back', async () => {
    const s = createDataStore();
    await s.getState().hydrate();
    await s.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 2 });
    await s.getState().setCover('Naruto', img);
    await s.getState().deleteBooks(s.getState().books.map((b) => b.id));
    await s.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 1 });
    expect(s.getState().covers.Naruto).toBe(img);
  });
});
