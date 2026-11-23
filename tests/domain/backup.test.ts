import { createBook } from '../../src/domain/books';
import { backupFileName, parseBackup, toBackup } from '../../src/domain/backup';
import { createShelf } from '../../src/domain/shelves';
import type { AppData } from '../../src/domain/types';

const data: AppData = {
  room: { widthCm: 500, depthCm: 400, heightCm: 260 },
  shelves: [createShelf('kubus', 'K')],
  books: [createBook({ title: 'Naruto', type: 'komik', series: 'Naruto', volume: 1 })],
};

test('round trip', () => {
  expect(parseBackup(toBackup(data))).toEqual(data);
});

test('rejects non-JSON', () => {
  expect(() => parseBackup('nope')).toThrow();
});

test('rejects other versions', () => {
  const obj = JSON.parse(toBackup(data));
  obj.version = 3;
  expect(() => parseBackup(JSON.stringify(obj))).toThrow();
});

test('rejects a book without title', () => {
  const obj = JSON.parse(toBackup(data));
  delete obj.books[0].title;
  expect(() => parseBackup(JSON.stringify(obj))).toThrow();
});

test('rejects a shelf with bad dimensions list', () => {
  const obj = JSON.parse(toBackup(data));
  obj.shelves[0].rowHeightsCm = 'x';
  expect(() => parseBackup(JSON.stringify(obj))).toThrow();
});

test('rejects missing room', () => {
  const obj = JSON.parse(toBackup(data));
  delete obj.room;
  expect(() => parseBackup(JSON.stringify(obj))).toThrow();
});

test('backupFileName uses local date', () => {
  expect(backupFileName(new Date(2026, 10, 3))).toBe('ownshelfbook-backup-2026-11-03.json');
});

test('writes version 2', () => {
  expect(JSON.parse(toBackup(data)).version).toBe(2);
});

test('v1 files are converted to per-row columns', () => {
  const obj = JSON.parse(toBackup(data));
  obj.version = 1;
  const { innerWidthCm: _i, ...shelf } = obj.shelves[0];
  obj.shelves = [{ ...shelf, colWidthsCm: [30, 40] }];
  const parsed = parseBackup(JSON.stringify(obj));
  expect(parsed.shelves[0].colWidthsCm).toEqual([[30, 40], [30, 40], [30, 40], [30, 40]]);
  expect(parsed.shelves[0].innerWidthCm).toBe(72);
});

test('v2 rejects column lists that do not match the rows', () => {
  const obj = JSON.parse(toBackup(data));
  obj.shelves[0].colWidthsCm = [[33]];
  expect(() => parseBackup(JSON.stringify(obj))).toThrow();
});

test('v2 rejects a shelf without inner width', () => {
  const obj = JSON.parse(toBackup(data));
  delete obj.shelves[0].innerWidthCm;
  expect(() => parseBackup(JSON.stringify(obj))).toThrow();
});
