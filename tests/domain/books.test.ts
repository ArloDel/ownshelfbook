import { createBook, createSeriesBooks, seriesColor } from '../../src/domain/books';

test('createBook komik uses komik defaults', () => {
  const b = createBook({ title: 'Naruto', type: 'komik', series: 'Naruto', volume: 3 });
  expect(b).toMatchObject({ title: 'Naruto', volume: 3, thicknessCm: 1.5, heightCm: 18, placement: null });
  expect(b.id).toBeTruthy();
});

test('createBook buku uses buku defaults', () => {
  expect(createBook({ title: 'Laskar Pelangi', type: 'buku' })).toMatchObject({ thicknessCm: 3, heightCm: 21 });
});

test('createBook rejects blank title', () => {
  expect(() => createBook({ title: '  ', type: 'buku' })).toThrow('Judul wajib diisi');
});

test('seriesColor is deterministic and hex', () => {
  expect(seriesColor('Naruto')).toBe(seriesColor('Naruto'));
  expect(seriesColor('Naruto')).toMatch(/^#[0-9a-f]{6}$/);
});

test('books of the same series share default color', () => {
  expect(createBook({ title: 'A', type: 'komik', series: 'One Piece' }).color)
    .toBe(createBook({ title: 'B', type: 'komik', series: 'One Piece' }).color);
});

describe('createSeriesBooks', () => {
  test('creates volumes from..to inclusive', () => {
    const books = createSeriesBooks({ series: 'Naruto', type: 'komik', from: 1, to: 72 });
    expect(books).toHaveLength(72);
    expect(books[0].volume).toBe(1);
    expect(books[71].volume).toBe(72);
    expect(books[0].title).toBe('Naruto');
    expect(new Set(books.map((b) => b.id)).size).toBe(72);
  });

  test.each([
    [{ from: 5, to: 1 }],
    [{ from: 0, to: 3 }],
    [{ from: 1.5, to: 3 }],
    [{ from: 1, to: 501 }],
  ])('rejects bad range %o', (r) => {
    expect(() => createSeriesBooks({ series: 'X', type: 'komik', ...r })).toThrow();
  });

  test('rejects blank series', () => {
    expect(() => createSeriesBooks({ series: '', type: 'komik', from: 1, to: 2 })).toThrow();
  });
});
