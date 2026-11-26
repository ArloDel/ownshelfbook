import { create } from 'zustand';
import type { Layer, SlotRef } from '../domain/types';

export type Page = 'room' | 'collection';
export type Mode = 'tata' | 'isi';

/** The card for the book being pointed at while exploring; `pinned` keeps it after the pointer leaves. */
export interface ExploreCard {
  bookId: string;
  x: number;
  y: number;
  pinned: boolean;
}

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
  /** Walking around the room (Jelajahi): no panels, no editing. */
  exploring: boolean;
  exploreCard: ExploreCard | null;
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
  startExplore(): void;
  stopExplore(): void;
  setExploreCard(card: ExploreCard | null): void;
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
    exploring: false,
    exploreCard: null,
    // Exploring belongs to the room page: leaving it ends the walk.
    setPage: (page) => set(page === 'room' ? { page } : { page, exploring: false, exploreCard: null }),
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
    startExplore: () => set({ exploring: true, selectedShelfId: null, selectedSlot: null, focusShelfId: null, exploreCard: null }),
    stopExplore: () => set({ exploring: false, exploreCard: null }),
    setExploreCard: (exploreCard) => set({ exploreCard }),
  }));

export const useUiStore = createUiStore();
