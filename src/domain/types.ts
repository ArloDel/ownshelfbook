export type BookType = 'komik' | 'buku';

export type ShelfModel = 'rak-buku' | 'kubus' | 'dinding' | 'rendah';

export interface Book {
  id: string;
  title: string;
  series?: string;
  volume?: number;
  type: BookType;
  author?: string;
  notes?: string;
  color: string;
  thicknessCm: number;
  heightCm: number;
  placement: null | {
    shelfId: string;
    row: number;
    col: number;
    order: number;
  };
  createdAt: number;
}

export type Placement = NonNullable<Book['placement']>;

export interface SlotRef {
  shelfId: string;
  row: number;
  col: number;
}

export interface Shelf {
  id: string;
  name: string;
  model: ShelfModel;
  position: { x: number; z: number };
  rotationY: number;
  elevationCm: number;
  rowHeightsCm: number[];
  /** Width between the two side boards. Every row fills it exactly. */
  innerWidthCm: number;
  /** colWidthsCm[row] = column widths of that row, left→right. */
  colWidthsCm: number[][];
  depthCm: number;
  boardThicknessCm: number;
  color: string;
}

/** Shelf as stored before per-row columns (DB v1, backup v1). */
export type ShelfV1 = Omit<Shelf, 'colWidthsCm' | 'innerWidthCm'> & { colWidthsCm: number[] };

export interface Room {
  widthCm: number;
  depthCm: number;
  heightCm: number;
}

export interface AppData {
  room: Room;
  shelves: Shelf[];
  books: Book[];
}
