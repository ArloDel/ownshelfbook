import { create } from 'zustand';
import type { SlotRef } from '../domain/types';

export type Page = 'room' | 'collection';
export type Mode = 'tata' | 'isi';

export interface UiState {
  page: Page;
  mode: Mode;
  selectedShelfId: string | null;
  selectedSlot: SlotRef | null;
  checkedBookIds: string[];
  highlightBookId: string | null;
  focusShelfId: string | null;
  unplacedFilter: string;
  setPage(page: Page): void;
  setMode(mode: Mode): void;
  selectShelf(id: string | null): void;
  selectSlot(slot: SlotRef | null): void;
  toggleChecked(id: string): void;
  setChecked(ids: string[]): void;
  clearChecked(): void;
  focusBook(id: string | null, shelfId?: string | null): void;
  focusShelf(id: string | null): void;
  setUnplacedFilter(text: string): void;
}

export const createUiStore = () =>
  create<UiState>()((set, get) => ({
    page: 'room',
    mode: 'tata',
    selectedShelfId: null,
    selectedSlot: null,
    checkedBookIds: [],
    highlightBookId: null,
    focusShelfId: null,
    unplacedFilter: '',
    setPage: (page) => set({ page }),
    setMode: (mode) => set({ mode, selectedSlot: null }),
    selectShelf: (selectedShelfId) => set({ selectedShelfId }),
    selectSlot: (selectedSlot) => set({ selectedSlot, selectedShelfId: selectedSlot?.shelfId ?? get().selectedShelfId }),
    toggleChecked: (id) => {
      const ids = get().checkedBookIds;
      set({ checkedBookIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
    },
    setChecked: (checkedBookIds) => set({ checkedBookIds }),
    clearChecked: () => set({ checkedBookIds: [] }),
    focusBook: (highlightBookId, shelfId = null) => set({ highlightBookId, focusShelfId: shelfId }),
    focusShelf: (focusShelfId) => set({ focusShelfId }),
    setUnplacedFilter: (unplacedFilter) => set({ unplacedFilter }),
  }));

export const useUiStore = createUiStore();
