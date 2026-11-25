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

describe('layers in backups', () => {
  const withBack = () => {
    const obj = JSON.parse(toBackup(data));
    obj.books[0].placement = { shelfId: data.shelves[0].id, row: 0, col: 0, order: 0, layer: 'belakang' };
    obj.shelves[0].backRiserCm = 6;
    return obj;
  };

  test('a back-layer book and a riser height load as they are', () => {
    const d = parseBackup(JSON.stringify(withBack()));
    expect(d.books[0].placement!.layer).toBe('belakang');
    expect(d.shelves[0].backRiserCm).toBe(6);
  });

  test('an unknown layer or a riser that is not a number is rejected', () => {
    const badLayer = withBack();
    badLayer.books[0].placement.layer = 'samping';
    expect(() => parseBackup(JSON.stringify(badLayer))).toThrow('buku ke-1');
    const badRiser = withBack();
    badRiser.shelves[0].backRiserCm = 'x';
    expect(() => parseBackup(JSON.stringify(badRiser))).toThrow('rak ke-1');
  });

  test('older files without layers or risers still load', () => {
    const obj = JSON.parse(toBackup(data));
    obj.books[0].placement = { shelfId: data.shelves[0].id, row: 0, col: 0, order: 0 };
    const d = parseBackup(JSON.stringify(obj));
    expect(d.books[0].placement!.layer).toBeUndefined();
    expect(d.shelves[0].backRiserCm).toBeUndefined();
  });
});
