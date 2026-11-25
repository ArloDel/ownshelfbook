import { migrateShelfV1 } from './shelves';
import type { AppData, Book, Cover, Room, Shelf, ShelfV1 } from './types';

export const BACKUP_VERSION = 3;
/** Longest image (characters of its data URL) a backup may carry, ~220 KB: stops large photos coming in. */
export const MAX_COVER_CHARS = 300_000;

export function toBackup(d: AppData): string {
  const body = { version: BACKUP_VERSION, room: d.room, shelves: d.shelves, books: d.books, ...(d.covers ? { covers: d.covers } : {}) };
  return JSON.stringify(body, null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNumList = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every(isNum);
const optStr = (v: unknown) => v === undefined || isStr(v);

function fail(what: string): never {
  throw new Error(`File cadangan tidak valid: ${what}`);
}

function checkRoom(r: unknown): Room {
  if (!isObj(r) || !isNum(r.widthCm) || !isNum(r.depthCm) || !isNum(r.heightCm)) fail('data ruangan');
  return r as unknown as Room;
}

function checkShelf(s: unknown, i: number, version: number): Shelf {
  const ok =
    isObj(s) &&
    isStr(s.id) &&
    isStr(s.name) &&
    ['rak-buku', 'kubus', 'dinding', 'rendah'].includes(s.model as string) &&
    isObj(s.position) &&
    isNum(s.position.x) &&
    isNum(s.position.z) &&
    isNum(s.rotationY) &&
    isNum(s.elevationCm) &&
    isNumList(s.rowHeightsCm) &&
    (version === 1
      ? isNumList(s.colWidthsCm)
      : isNum(s.innerWidthCm) &&
        Array.isArray(s.colWidthsCm) &&
        Array.isArray(s.rowHeightsCm) &&
        s.colWidthsCm.length === s.rowHeightsCm.length &&
        s.colWidthsCm.every(isNumList)) &&
    isNum(s.depthCm) &&
    isNum(s.boardThicknessCm) &&
    isStr(s.color) &&
    (s.backRiserCm === undefined || isNum(s.backRiserCm));
  if (!ok) fail(`rak ke-${i + 1}`);
  return version === 1 ? migrateShelfV1(s as unknown as ShelfV1) : (s as unknown as Shelf);
}

function checkBook(b: unknown, i: number): Book {
  const p = isObj(b) ? b.placement : undefined;
  const placementOk =
    p === null ||
    (isObj(p) &&
      isStr(p.shelfId) &&
      isNum(p.row) &&
      isNum(p.col) &&
      isNum(p.order) &&
      (p.layer === undefined || p.layer === 'depan' || p.layer === 'belakang'));
  const ok =
    isObj(b) &&
    isStr(b.id) &&
    isStr(b.title) &&
    (b.type === 'komik' || b.type === 'buku') &&
    optStr(b.series) &&
    (b.volume === undefined || isNum(b.volume)) &&
    optStr(b.author) &&
    optStr(b.notes) &&
    isStr(b.color) &&
    isNum(b.thicknessCm) &&
    isNum(b.heightCm) &&
    isNum(b.createdAt) &&
    placementOk;
  if (!ok) fail(`buku ke-${i + 1}`);
  return b as unknown as Book;
}

function checkCover(c: unknown, i: number): Cover {
  const ok =
    isObj(c) && isStr(c.key) && isStr(c.image) && c.image.startsWith('data:image/') && c.image.length <= MAX_COVER_CHARS;
  if (!ok) fail(`gambar ke-${i + 1}`);
  return { key: c.key as string, image: c.image as string };
}

export function parseBackup(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('bukan file JSON');
  }
  if (!isObj(raw)) fail('format tidak dikenal');
  const version = raw.version;
  if (version !== 1 && version !== 2 && version !== BACKUP_VERSION) fail(`versi ${String(version)} tidak didukung`);
  if (raw.covers !== undefined && !Array.isArray(raw.covers)) fail('daftar gambar');
  if (!Array.isArray(raw.shelves) || !Array.isArray(raw.books)) fail('daftar rak/buku tidak ada');
  return {
    room: checkRoom(raw.room),
    shelves: raw.shelves.map((sh, i) => checkShelf(sh, i, version as number)),
    books: raw.books.map(checkBook),
    ...(Array.isArray(raw.covers) ? { covers: raw.covers.map(checkCover) } : {}),
  };
}

export function backupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `ownshelfbook-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}
