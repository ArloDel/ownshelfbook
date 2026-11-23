import { createBook } from '../../src/domain/books';
import { createShelf } from '../../src/domain/shelves';
import { db, DEFAULT_ROOM } from '../../src/persistence/db';
import { deleteBooks, loadAll, replaceAll, saveBooks, saveRoom, saveShelves } from '../../src/persistence/repo';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

test('fresh db loads defaults', async () => {
  expect(await loadAll()).toEqual({ room: DEFAULT_ROOM, shelves: [], books: [] });
});

test('saves and loads books, shelves and room', async () => {
  const books = [createBook({ title: 'A', type: 'buku' }), createBook({ title: 'B', type: 'komik' })];
  const shelf = createShelf('rak-buku', 'R');
  const room = { widthCm: 300, depthCm: 300, heightCm: 250 };
  await saveBooks(books);
  await saveShelves([shelf]);
  await saveRoom(room);
  const all = await loadAll();
  expect(all.room).toEqual(room);
  expect(all.shelves).toEqual([shelf]);
  expect(all.books.map((b) => b.id).sort()).toEqual(books.map((b) => b.id).sort());
});

test('deleteBooks removes', async () => {
  const books = [createBook({ title: 'A', type: 'buku' }), createBook({ title: 'B', type: 'komik' })];
  await saveBooks(books);
  await deleteBooks([books[0].id]);
  expect((await loadAll()).books.map((b) => b.id)).toEqual([books[1].id]);
});

test('replaceAll replaces everything', async () => {
  await saveBooks([createBook({ title: 'Old', type: 'buku' })]);
  await saveShelves([createShelf('kubus', 'Old')]);
  const fresh = { room: DEFAULT_ROOM, shelves: [createShelf('rendah', 'New')], books: [createBook({ title: 'New', type: 'buku' })] };
  await replaceAll(fresh);
  expect(await loadAll()).toEqual(fresh);
});
