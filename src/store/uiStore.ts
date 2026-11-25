import { create } from 'zustand';
import type { Layer, SlotRef } from '../domain/types';

export type Page = 'room' | 'collection';
export type Mode = 'tata' | 'isi';

export interface UiState {
  page: Page;
  mode: Mode;
  selectedShelfId: string | null;
  selectedSlot: SlotRef | null;
  /** Which layer of the selected slot the slot panel shows and places into. */
  slotLayer: Layer;
  checkedBookIds: string[];
  highlightBookId: string | null;
  focusShelfId: string | null;
  unplacedFilter: string;
  setPage(page: Page): void;
  setMode(mode: Mode): void;
  selectShelf(id: string | null): void;
  selectSlot(slot: SlotRef | null, layer?: Layer): void;
  setSlotLayer(layer: Layer): void;
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
    // Fill the back row first: a slot opens on its back layer (single-layer shelves show the front).
    slotLayer: 'belakang',
    checkedBookIds: [],
    highlightBookId: null,
    focusShelfId: null,
    unplacedFilter: '',
    setPage: (page) => set({ page }),
    setMode: (mode) => set({ mode, selectedSlot: null }),
    selectShelf: (selectedShelfId) => set({ selectedShelfId }),
    selectSlot: (selectedSlot, slotLayer = 'belakang') =>
      set({ selectedSlot, slotLayer, selectedShelfId: selectedSlot?.shelfId ?? get().selectedShelfId }),
    setSlotLayer: (slotLayer) => set({ slotLayer }),
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
