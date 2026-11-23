import type { Book, BookType } from './types';

export const BOOK_DEFAULTS: Record<BookType, { thicknessCm: number; heightCm: number }> = {
  komik: { thicknessCm: 1.5, heightCm: 18 },
  buku: { thicknessCm: 3, heightCm: 21 },
};

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
}

export function createBook(input: NewBookInput): Book {
  const title = input.title.trim();
  if (!title) throw new Error('Judul wajib diisi');
  const series = input.series?.trim() || undefined;
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
}

export function createSeriesBooks(input: NewSeriesInput): Book[] {
  const series = input.series.trim();
  if (!series) throw new Error('Nama seri wajib diisi');
  const { from, to } = input;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1) {
    throw new Error('Nomor volume harus bilangan bulat positif');
  }
  if (from > to) throw new Error('Volume awal tidak boleh lebih besar dari volume akhir');
  if (to - from + 1 > MAX_SERIES_BATCH) {
    throw new Error(`Maksimal ${MAX_SERIES_BATCH} volume sekali tambah`);
  }
  const books: Book[] = [];
  for (let v = from; v <= to; v++) {
    books.push(createBook({ title: series, series, volume: v, type: input.type, author: input.author }));
  }
  return books;
}
