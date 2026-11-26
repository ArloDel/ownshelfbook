import type { Book, BookType } from './types';

export const BOOK_DEFAULTS: Record<BookType, { thicknessCm: number; heightCm: number }> = {
  komik: { thicknessCm: 1.5, heightCm: 18 },
  buku: { thicknessCm: 3, heightCm: 21 },
};

export const THICKNESS_MIN_CM = 0.1;
export const THICKNESS_MAX_CM = 30;

/** Validate and round (0.1 cm) a user-given thickness; undefined → the type default. */
function bookThickness(type: BookType, t: number | undefined): number {
  if (t === undefined) return BOOK_DEFAULTS[type].thicknessCm;
  if (!(t >= THICKNESS_MIN_CM && t <= THICKNESS_MAX_CM)) throw new Error('Tebal harus antara 0,1 dan 30 cm');
  return Math.round(t * 10) / 10;
}

export const HEIGHT_MIN_CM = 5;
export const HEIGHT_MAX_CM = 60;

/** Validate and round (0.1 cm) a user-given height; undefined → the type default. */
function bookHeight(type: BookType, h: number | undefined): number {
  if (h === undefined) return BOOK_DEFAULTS[type].heightCm;
  if (!(h >= HEIGHT_MIN_CM && h <= HEIGHT_MAX_CM)) throw new Error('Tinggi harus antara 5 dan 60 cm');
  return Math.round(h * 10) / 10;
}

/** For edits: throw the same messages as new books when a size is out of range. */
export function checkBookSize(size: { thicknessCm: number; heightCm: number }): void {
  bookThickness('buku', size.thicknessCm);
  bookHeight('buku', size.heightCm);
}

/** Deterministic color from a string (same name → same color). */
export function seriesColor(name: string): string {
  let h = 2166136261;
  for (const ch of name.trim().toLowerCase()) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  const hue = (h >>> 0) % 360;
  return hslToHex(hue, 55, 45);
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

export interface NewBookInput {
  title: string;
  type: BookType;
  series?: string;
  volume?: number;
  author?: string;
  notes?: string;
  color?: string;
  /** Spine thickness in cm; omitted → default for the type. */
  thicknessCm?: number;
  /** Height in cm; omitted → default for the type. */
  heightCm?: number;
}

export function createBook(input: NewBookInput): Book {
  const title = input.title.trim();
  if (!title) throw new Error('Judul wajib diisi');
  const series = input.series?.trim() || undefined;
  const thicknessCm = bookThickness(input.type, input.thicknessCm);
  const heightCm = bookHeight(input.type, input.heightCm);
  return {
    id: crypto.randomUUID(),
    title,
    series,
    volume: input.volume,
    type: input.type,
    author: input.author?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    color: input.color ?? seriesColor(series ?? title),
    ...BOOK_DEFAULTS[input.type],
    thicknessCm,
    heightCm,
    placement: null,
    createdAt: Date.now(),
  };
}

export const MAX_SERIES_BATCH = 500;

export interface NewSeriesInput {
  series: string;
  type: BookType;
  from: number;
  to: number;
  author?: string;
  /** Spine thickness in cm for every volume; omitted → default for the type. */
  thicknessCm?: number;
  /** Height in cm for every volume; omitted → default for the type. */
  heightCm?: number;
}

export function createSeriesBooks(input: NewSeriesInput): Book[] {
  const series = input.series.trim();
  if (!series) throw new Error('Nama seri wajib diisi');
  const { from, to } = input;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1) {
    throw new Error('Nomor volume harus bilangan bulat positif');
  }
  bookThickness(input.type, input.thicknessCm);
  bookHeight(input.type, input.heightCm);
  if (from > to) throw new Error('Volume awal tidak boleh lebih besar dari volume akhir');
  if (to - from + 1 > MAX_SERIES_BATCH) {
    throw new Error(`Maksimal ${MAX_SERIES_BATCH} volume sekali tambah`);
  }
  const books: Book[] = [];
  for (let v = from; v <= to; v++) {
    books.push(
      createBook({
        title: series,
        series,
        volume: v,
        type: input.type,
        author: input.author,
        thicknessCm: input.thicknessCm,
        heightCm: input.heightCm,
      }),
    );
  }
  return books;
}
