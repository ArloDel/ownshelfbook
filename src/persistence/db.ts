import Dexie, { type EntityTable } from 'dexie';
import { migrateShelfV1 } from '../domain/shelves';
import type { Book, Room, Shelf, ShelfV1 } from '../domain/types';

export const DEFAULT_ROOM: Room = { widthCm: 500, depthCm: 400, heightCm: 260 };

interface MetaRow {
  key: string;
  value: unknown;
}

export const db = new Dexie('ownshelfbook') as Dexie & {
  books: EntityTable<Book, 'id'>;
  shelves: EntityTable<Shelf, 'id'>;
  meta: EntityTable<MetaRow, 'key'>;
};

const STORES = {
  books: 'id, series, placement.shelfId',
  shelves: 'id',
  meta: 'key',
};

db.version(1).stores(STORES);

// v2: per-row columns. Old shelves had one flat colWidthsCm list shared by every row.
db.version(2)
  .stores(STORES)
  .upgrade((tx) =>
    tx
      .table('shelves')
      .toCollection()
      .modify((shelf: Shelf | ShelfV1) => {
        if (typeof shelf.colWidthsCm[0] === 'number') Object.assign(shelf, migrateShelfV1(shelf as ShelfV1));
      }),
  );
