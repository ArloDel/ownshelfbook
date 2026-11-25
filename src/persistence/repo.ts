import type { AppData, Book, Cover, Room, Shelf } from '../domain/types';
import { db, DEFAULT_ROOM } from './db';

export async function loadAll(): Promise<AppData> {
  const [books, shelves, roomRow, covers] = await Promise.all([
    db.books.toArray(),
    db.shelves.toArray(),
    db.meta.get('room'),
    db.covers.toArray(),
  ]);
  return { room: (roomRow?.value as Room | undefined) ?? DEFAULT_ROOM, shelves, books, covers };
}

export async function saveBooks(books: Book[]): Promise<void> {
  if (books.length) await db.books.bulkPut(books);
}

export async function deleteBooks(ids: string[]): Promise<void> {
  if (ids.length) await db.books.bulkDelete(ids);
}

export async function saveShelves(shelves: Shelf[]): Promise<void> {
  if (shelves.length) await db.shelves.bulkPut(shelves);
}

export async function deleteShelf(id: string): Promise<void> {
  await db.shelves.delete(id);
}

export async function saveRoom(room: Room): Promise<void> {
  await db.meta.put({ key: 'room', value: room });
}

export async function saveCover(cover: Cover): Promise<void> {
  await db.covers.put(cover);
}

export async function deleteCover(key: string): Promise<void> {
  await db.covers.delete(key);
}

/** Replace everything; the images are replaced only when `d.covers` is given. */
export async function replaceAll(d: AppData): Promise<void> {
  await db.transaction('rw', [db.books, db.shelves, db.meta, db.covers], async () => {
    await Promise.all([db.books.clear(), db.shelves.clear(), db.meta.clear()]);
    await db.books.bulkPut(d.books);
    await db.shelves.bulkPut(d.shelves);
    await db.meta.put({ key: 'room', value: d.room });
    if (d.covers !== undefined) {
      await db.covers.clear();
      await db.covers.bulkPut(d.covers);
    }
  });
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Run several writes as one IndexedDB transaction: all succeed or none do. */
export async function transact(fn: () => Promise<void>): Promise<void> {
  await db.transaction('rw', [db.books, db.shelves, db.meta, db.covers], fn);
}
