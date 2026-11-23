import { create } from 'zustand';
import { parseBackup, toBackup } from '../domain/backup';
import { createBook, createSeriesBooks, type NewBookInput, type NewSeriesInput } from '../domain/books';
import {
  moveInSlot as moveInSlotDomain,
  normalizeOrders,
  placeBooks as placeBooksDomain,
  returnBooksOutside,
  unplaceBooks as unplaceBooksDomain,
} from '../domain/placement';
import { clampDim, clampShelfToRoom, createShelf, resizeShelf as resizeShelfDomain } from '../domain/shelves';
import type { Book, Room, Shelf, ShelfModel, SlotRef } from '../domain/types';
import { DEFAULT_ROOM } from '../persistence/db';
import * as repo from '../persistence/repo';

export type BookPatch = Partial<Omit<Book, 'id' | 'placement'>>;

export interface DataState {
  loaded: boolean;
  room: Room;
  shelves: Shelf[];
  books: Book[];
  hydrate(): Promise<void>;
  addBook(input: NewBookInput): Promise<Book>;
  addSeries(input: NewSeriesInput): Promise<Book[]>;
  updateBook(id: string, patch: BookPatch): Promise<void>;
  deleteBooks(ids: string[]): Promise<void>;
  addShelf(model: ShelfModel): Promise<string>;
  updateShelf(id: string, patch: Partial<Shelf>): Promise<void>;
  resizeShelf(id: string, rows: number, cols: number): Promise<void>;
  duplicateShelf(id: string): Promise<string>;
  deleteShelf(id: string): Promise<void>;
  placeBooks(ids: string[], slot: SlotRef): Promise<void>;
  unplaceBooks(ids: string[]): Promise<void>;
  moveInSlot(id: string, index: number): Promise<void>;
  setRoom(room: Room): Promise<void>;
  importData(text: string): Promise<void>;
  exportData(): string;
}

/** Books whose object identity changed between two arrays (domain functions keep unchanged books by reference). */
const changedBooks = (before: Book[], after: Book[]) => {
  const prev = new Map(before.map((b) => [b.id, b]));
  return after.filter((b) => prev.get(b.id) !== b);
};

const clampRoom = (r: Room): Room => ({
  widthCm: Math.max(50, Number.isFinite(r.widthCm) ? r.widthCm : DEFAULT_ROOM.widthCm),
  depthCm: Math.max(50, Number.isFinite(r.depthCm) ? r.depthCm : DEFAULT_ROOM.depthCm),
  heightCm: Math.max(50, Number.isFinite(r.heightCm) ? r.heightCm : DEFAULT_ROOM.heightCm),
});

function sanitizeShelf(s: Shelf, room: Room): Shelf {
  const elevation = Number.isFinite(s.elevationCm) ? Math.min(Math.max(0, s.elevationCm), room.heightCm) : 0;
  const rotation = Number.isFinite(s.rotationY) ? ((s.rotationY % 360) + 360) % 360 : 0;
  return clampShelfToRoom(
    {
      ...s,
      depthCm: clampDim(s.depthCm),
      rowHeightsCm: s.rowHeightsCm.map(clampDim),
      colWidthsCm: s.colWidthsCm.map(clampDim),
      elevationCm: elevation,
      rotationY: rotation,
      position: {
        x: Number.isFinite(s.position.x) ? s.position.x : 0,
        z: Number.isFinite(s.position.z) ? s.position.z : 0,
      },
    },
    room,
  );
}

function nextShelfName(shelves: Shelf[]): string {
  const nums = shelves.map((s) => /^Rak (\d+)$/.exec(s.name)?.[1]).filter(Boolean).map(Number);
  return `Rak ${Math.max(shelves.length, ...nums, 0) + 1}`;
}

export const createDataStore = () =>
  create<DataState>()((set, get) => {
    async function commitBooks(next: Book[]) {
      const changed = changedBooks(get().books, next);
      set({ books: next });
      await repo.saveBooks(changed);
    }

    function shelfById(id: string) {
      const s = get().shelves.find((x) => x.id === id);
      if (!s) throw new Error('Rak tidak ditemukan');
      return s;
    }

    async function commitShelf(shelf: Shelf) {
      set({ shelves: get().shelves.map((s) => (s.id === shelf.id ? shelf : s)) });
      await repo.saveShelves([shelf]);
    }

    return {
      loaded: false,
      room: DEFAULT_ROOM,
      shelves: [],
      books: [],

      async hydrate() {
        const data = await repo.loadAll();
        set({ ...data, loaded: true });
      },

      async addBook(input) {
        const book = createBook(input);
        set({ books: [...get().books, book] });
        await repo.saveBooks([book]);
        return book;
      },

      async addSeries(input) {
        const books = createSeriesBooks(input);
        set({ books: [...get().books, ...books] });
        await repo.saveBooks(books);
        return books;
      },

      async updateBook(id, patch) {
        const { id: _ignoreId, placement: _ignorePlacement, ...rest } = patch as Partial<Book>;
        const next = get().books.map((b) => (b.id === id ? { ...b, ...rest } : b));
        await commitBooks(next);
      },

      async deleteBooks(ids) {
        const set_ = new Set(ids);
        const before = get().books;
        const next = normalizeOrders(before.filter((b) => !set_.has(b.id)));
        await commitBooks(next);
        await repo.deleteBooks(ids);
      },

      async addShelf(model) {
        const { room, shelves } = get();
        const shelf = clampShelfToRoom(createShelf(model, nextShelfName(shelves)), room);
        set({ shelves: [...shelves, shelf] });
        await repo.saveShelves([shelf]);
        return shelf.id;
      },

      async updateShelf(id, patch) {
        const current = shelfById(id);
        await commitShelf(sanitizeShelf({ ...current, ...patch, id }, get().room));
      },

      async resizeShelf(id, rows, cols) {
        const resized = resizeShelfDomain(shelfById(id), rows, cols);
        await commitBooks(
          returnBooksOutside(get().books, id, resized.rowHeightsCm.length, resized.colWidthsCm.length),
        );
        await commitShelf(clampShelfToRoom(resized, get().room));
      },

      async duplicateShelf(id) {
        const src = shelfById(id);
        const copy = clampShelfToRoom(
          {
            ...src,
            id: crypto.randomUUID(),
            name: `${src.name} (salinan)`,
            position: { x: src.position.x + 20, z: src.position.z },
            rowHeightsCm: [...src.rowHeightsCm],
            colWidthsCm: [...src.colWidthsCm],
          },
          get().room,
        );
        set({ shelves: [...get().shelves, copy] });
        await repo.saveShelves([copy]);
        return copy.id;
      },

      async deleteShelf(id) {
        await commitBooks(returnBooksOutside(get().books, id, 0, 0));
        set({ shelves: get().shelves.filter((s) => s.id !== id) });
        await repo.deleteShelf(id);
      },

      async placeBooks(ids, slot) {
        await commitBooks(placeBooksDomain(get().books, ids, slot));
      },

      async unplaceBooks(ids) {
        await commitBooks(unplaceBooksDomain(get().books, ids));
      },

      async moveInSlot(id, index) {
        await commitBooks(moveInSlotDomain(get().books, id, index));
      },

      async setRoom(room) {
        const r = clampRoom(room);
        const shelves = get().shelves.map((s) => clampShelfToRoom(s, r));
        set({ room: r, shelves });
        await repo.saveRoom(r);
        await repo.saveShelves(shelves);
      },

      async importData(text) {
        const data = parseBackup(text);
        await repo.replaceAll(data);
        set({ ...data });
      },

      exportData() {
        const { room, shelves, books } = get();
        return toBackup({ room, shelves, books });
      },
    };
  });

export const useDataStore = createDataStore();
