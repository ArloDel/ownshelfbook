import { db, DEFAULT_ROOM } from '../../src/persistence/db';
import { deleteCover, loadAll, replaceAll, saveCover } from '../../src/persistence/repo';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const naruto = { key: 'Naruto', image: 'data:image/webp;base64,AAA' };
const empty = { room: DEFAULT_ROOM, shelves: [], books: [] };

test('a spine image is saved, loaded and deleted', async () => {
  await saveCover(naruto);
  expect((await loadAll()).covers).toEqual([naruto]);
  await deleteCover('Naruto');
  expect((await loadAll()).covers).toEqual([]);
});

test('replacing all data keeps the images unless new ones are given', async () => {
  await saveCover(naruto);
  await replaceAll({ ...empty, covers: undefined });
  expect((await loadAll()).covers).toEqual([naruto]);
  await replaceAll({ ...empty, covers: [] });
  expect((await loadAll()).covers).toEqual([]);
});
