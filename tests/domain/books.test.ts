import { createBook, seriesColor } from '../../src/domain/books';

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
