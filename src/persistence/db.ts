import Dexie, { type EntityTable } from 'dexie';
import type { Book, Room, Shelf } from '../domain/types';

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

db.version(1).stores({
  books: 'id, series, placement.shelfId',
  shelves: 'id',
  meta: 'key',
});
