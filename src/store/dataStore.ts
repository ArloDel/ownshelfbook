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
import {
  clampDim,
  clampShelfToRoom,
  createShelf,
  MAX_ROWS_COLS,
  resizeShelf as resizeShelfDomain,
} from '../domain/shelves';
import type { AppData, Book, Room, Shelf, ShelfModel, SlotRef } from '../domain/types';
import { DEFAULT_ROOM } from '../persistence/db';
import * as repo from '../persistence/repo';

export type BookPatch = Partial<Omit<Book, 'id' | 'placement'>>;

export interface DataState {
  loaded: boolean;
  room: Room;
  shelves: Shelf[];
  books: Book[];
  /** Last persistence/load error, shown to the user; null when all is well. */
  error: string | null;
  clearError(): void;
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

const clampRoom = (r: Room): Room => {
  const ok = (v: number, d: number) => Math.max(50, Number.isFinite(v) && v > 0 ? v : d);
  return {
    widthCm: ok(r.widthCm, DEFAULT_ROOM.widthCm),
    depthCm: ok(r.depthCm, DEFAULT_ROOM.depthCm),
    heightCm: ok(r.heightCm, DEFAULT_ROOM.heightCm),
  };
};

function sanitizeShelf(s: Shelf, room: Room): Shelf {
  const elevation = Number.isFinite(s.elevationCm) ? Math.min(Math.max(0, s.elevationCm), room.heightCm) : 0;
  const rotation = Number.isFinite(s.rotationY) ? ((s.rotationY % 360) + 360) % 360 : 0;
  return clampShelfToRoom(
    {
      ...s,
      depthCm: clampDim(s.depthCm),
      rowHeightsCm: s.rowHeightsCm.slice(0, MAX_ROWS_COLS).map(clampDim),
      colWidthsCm: s.colWidthsCm.slice(0, MAX_ROWS_COLS).map(clampDim),
      boardThicknessCm: Number.isFinite(s.boardThicknessCm) && s.boardThicknessCm > 0 ? Math.min(s.boardThicknessCm, 10) : 2,
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

/** Make imported data safe: unique ids, sane sizes, placements only into slots that exist. */
function normaliseImport(d: AppData): AppData {
  const dupe = (ids: string[]) => ids.find((id, i) => ids.indexOf(id) !== i);
  if (dupe(d.books.map((b) => b.id)) || dupe(d.shelves.map((s) => s.id))) {
    throw new Error('File cadangan tidak valid: ada id ganda');
  }
  const room = clampRoom(d.room);
  const shelves = d.shelves.map((s) => sanitizeShelf(s, room));
  const byId = new Map(shelves.map((s) => [s.id, s]));
  const books = d.books.map((b) => {
    const p = b.placement;
    if (!p) return b;
    const s = byId.get(p.shelfId);
    const valid =
      s &&
      Number.isInteger(p.row) &&
      Number.isInteger(p.col) &&
      p.row >= 0 &&
      p.col >= 0 &&
      p.row < s.rowHeightsCm.length &&
      p.col < s.colWidthsCm.length;
    return valid ? b : { ...b, placement: null };
  });
  return { room, shelves, books: normalizeOrders(books) };
}

function nextShelfName(shelves: Shelf[]): string {
  const nums = shelves.map((s) => /^Rak (\d+)$/.exec(s.name)?.[1]).filter(Boolean).map(Number);
  return `Rak ${Math.max(shelves.length, ...nums, 0) + 1}`;
}

const SAVE_ERROR = 'Perubahan gagal disimpan ke penyimpanan browser dan dibatalkan. Coba lagi, atau ekspor cadangan.';

export const createDataStore = () =>
  create<DataState>()((set, get) => {
    /**
     * Apply a state change optimistically, then persist it in one transaction.
     * If the write fails, restore the previous state and surface an error — never keep
     * a change on screen that is not on disk.
     */
    async function commit(next: Partial<Pick<DataState, 'books' | 'shelves' | 'room'>>, write: () => Promise<void>): Promise<boolean> {
      const { books, shelves, room } = get();
      set(next);
      try {
        await repo.transact(write);
        return true;
      } catch (err) {
        console.error(err);
        set({ books, shelves, room, error: SAVE_ERROR });
        return false;
      }
    }

    function shelfById(id: string) {
      const s = get().shelves.find((x) => x.id === id);
      if (!s) throw new Error('Rak tidak ditemukan');
      return s;
    }

    async function commitBooks(next: Book[]) {
      const changed = changedBooks(get().books, next);
      await commit({ books: next }, () => repo.saveBooks(changed));
    }

    const replaceShelf = (shelf: Shelf) => get().shelves.map((s) => (s.id === shelf.id ? shelf : s));

    return {
      loaded: false,
      room: DEFAULT_ROOM,
      shelves: [],
      books: [],
      error: null,

      clearError: () => set({ error: null }),

      async hydrate() {
        try {
          const data = await repo.loadAll();
          set({ ...data, loaded: true, error: null });
        } catch (err) {
          console.error(err);
          set({ error: 'Gagal memuat data dari penyimpanan browser. Muat ulang halaman untuk mencoba lagi.' });
        }
      },

      async addBook(input) {
        const book = createBook(input);
        const ok = await commit({ books: [...get().books, book] }, () => repo.saveBooks([book]));
        if (!ok) throw new Error(SAVE_ERROR);
        return book;
      },

      async addSeries(input) {
        const books = createSeriesBooks(input);
        const ok = await commit({ books: [...get().books, ...books] }, () => repo.saveBooks(books));
        if (!ok) throw new Error(SAVE_ERROR);
        return books;
      },

      async updateBook(id, patch) {
        const { id: _ignoreId, placement: _ignorePlacement, ...rest } = patch as Partial<Book>;
        await commitBooks(get().books.map((b) => (b.id === id ? { ...b, ...rest } : b)));
      },

      async deleteBooks(ids) {
        const gone = new Set(ids);
        const before = get().books;
        const next = normalizeOrders(before.filter((b) => !gone.has(b.id)));
        const changed = changedBooks(before, next);
        await commit({ books: next }, async () => {
          await repo.deleteBooks(ids);
          await repo.saveBooks(changed);
        });
      },

      async addShelf(model) {
        const { room, shelves } = get();
        const shelf = clampShelfToRoom(createShelf(model, nextShelfName(shelves)), room);
        await commit({ shelves: [...shelves, shelf] }, () => repo.saveShelves([shelf]));
        return shelf.id;
      },

      async updateShelf(id, patch) {
        const shelf = sanitizeShelf({ ...shelfById(id), ...patch, id }, get().room);
        await commit({ shelves: replaceShelf(shelf) }, () => repo.saveShelves([shelf]));
      },

      async resizeShelf(id, rows, cols) {
        const resized = clampShelfToRoom(resizeShelfDomain(shelfById(id), rows, cols), get().room);
        const before = get().books;
        const books = returnBooksOutside(before, id, resized.rowHeightsCm.length, resized.colWidthsCm.length);
        const changed = changedBooks(before, books);
        await commit({ books, shelves: replaceShelf(resized) }, async () => {
          await repo.saveBooks(changed);
          await repo.saveShelves([resized]);
        });
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
        await commit({ shelves: [...get().shelves, copy] }, () => repo.saveShelves([copy]));
        return copy.id;
      },

      async deleteShelf(id) {
        const before = get().books;
        const books = returnBooksOutside(before, id, 0, 0);
        const changed = changedBooks(before, books);
        await commit({ books, shelves: get().shelves.filter((s) => s.id !== id) }, async () => {
          await repo.saveBooks(changed);
          await repo.deleteShelf(id);
        });
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
        await commit({ room: r, shelves }, async () => {
          await repo.saveRoom(r);
          await repo.saveShelves(shelves);
        });
      },

      async importData(text) {
        const data = normaliseImport(parseBackup(text));
        await repo.replaceAll(data);
        set({ ...data, error: null });
      },

      exportData() {
        const { room, shelves, books } = get();
        return toBackup({ room, shelves, books });
      },
    };
  });

export const useDataStore = createDataStore();
