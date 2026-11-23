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
  colWidthsCm: number[];
  depthCm: number;
  boardThicknessCm: number;
  color: string;
}

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
