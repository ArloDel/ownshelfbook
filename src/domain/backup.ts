import type { AppData, Book, Room, Shelf } from './types';

export const BACKUP_VERSION = 1;

export function toBackup(d: AppData): string {
  return JSON.stringify({ version: BACKUP_VERSION, room: d.room, shelves: d.shelves, books: d.books }, null, 2);
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

function checkShelf(s: unknown, i: number): Shelf {
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
    isNumList(s.colWidthsCm) &&
    isNum(s.depthCm) &&
    isNum(s.boardThicknessCm) &&
    isStr(s.color);
  if (!ok) fail(`rak ke-${i + 1}`);
  return s as unknown as Shelf;
}

function checkBook(b: unknown, i: number): Book {
  const p = isObj(b) ? b.placement : undefined;
  const placementOk =
    p === null ||
    (isObj(p) && isStr(p.shelfId) && isNum(p.row) && isNum(p.col) && isNum(p.order));
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

export function parseBackup(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('bukan file JSON');
  }
  if (!isObj(raw)) fail('format tidak dikenal');
  if (raw.version !== BACKUP_VERSION) fail(`versi ${String(raw.version)} tidak didukung`);
  if (!Array.isArray(raw.shelves) || !Array.isArray(raw.books)) fail('daftar rak/buku tidak ada');
  return {
    room: checkRoom(raw.room),
    shelves: raw.shelves.map(checkShelf),
    books: raw.books.map(checkBook),
  };
}

export function backupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `ownshelfbook-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}
