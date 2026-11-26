import Dexie from 'dexie';
import { createBook } from '../../src/domain/books';
import { createShelf } from '../../src/domain/shelves';
import { db } from '../../src/persistence/db';
import { loadAll } from '../../src/persistence/repo';

test('v1 shelves in IndexedDB are converted to per-row columns, books keep their place', async () => {
  await db.delete();
  db.close();
  const { innerWidthCm: _i, colWidthsCm: _c, ...rest } = createShelf('rendah', 'Lama');
  const v1Shelf = { ...rest, rowHeightsCm: [30, 30, 30], colWidthsCm: [33, 33] };
  const book = { ...createBook({ title: 'A', type: 'komik' }), placement: { shelfId: v1Shelf.id, row: 2, col: 1, order: 0 } };

  const old = new Dexie('ownshelfbook');
  old.version(1).stores({ books: 'id, series, placement.shelfId', shelves: 'id', meta: 'key' });
  await old.table('shelves').put(v1Shelf);
  await old.table('books').put(book);
  old.close();

  await db.open();
  const data = await loadAll();
  expect(data.shelves[0].colWidthsCm).toEqual([[33, 33], [33, 33], [33, 33]]);
  expect(data.shelves[0].innerWidthCm).toBe(68);
  expect(data.books[0].placement).toEqual(book.placement);
});

test('a v2 database opens as v3 with its shelves and books intact', async () => {
  await db.delete();
  db.close();
  const shelf = createShelf('kubus', 'Lama');
  const book = { ...createBook({ title: 'B', type: 'komik' }), placement: { shelfId: shelf.id, row: 0, col: 0, order: 0, layer: 'belakang' as const } };
  const old = new Dexie('ownshelfbook');
  old.version(2).stores({ books: 'id, series, placement.shelfId', shelves: 'id', meta: 'key' });
  await old.table('shelves').put(shelf);
  await old.table('books').put(book);
  old.close();

  await db.open();
  const data = await loadAll();
  expect(data.shelves).toEqual([shelf]);
  expect(data.books).toEqual([book]);
  expect(data.covers).toEqual([]);
});
