import { createSeriesBooks } from '../../src/domain/books';
import { seriesKey, seriesSpineRatio, spineCrop } from '../../src/domain/covers';

test('a book is keyed by its series, or by its title when it has none', () => {
  expect(seriesKey({ series: 'Naruto', title: 'Naruto' })).toBe('Naruto');
  expect(seriesKey({ title: 'Laskar Pelangi' })).toBe('Laskar Pelangi');
});

test('the spine ratio comes from the series books, with a fallback', () => {
  const books = createSeriesBooks({ series: 'Naruto', type: 'komik', from: 1, to: 3 });
  expect(seriesSpineRatio(books, 'Naruto')).toBeCloseTo(1.5 / 18);
  expect(seriesSpineRatio(books, 'Lain')).toBe(0.125);
});

test('the crop is a full-height strip placed by the slider', () => {
  expect(spineCrop(1000, 1500, 1.5 / 18, 0.5)).toEqual({ sx: 437.5, sy: 0, sw: 125, sh: 1500, outW: 43, outH: 512 });
  expect(spineCrop(1000, 1500, 1.5 / 18, 0).sx).toBe(0);
  expect(spineCrop(1000, 1500, 1.5 / 18, 1).sx).toBeCloseTo(875);
});

test('a narrow picture is used whole, and the strip is never thinner than 16 px', () => {
  const narrow = spineCrop(50, 1500, 0.25, 0.5);
  expect([narrow.sw, narrow.sx]).toEqual([50, 0]);
  expect(spineCrop(1000, 1500, 0.01, 0.5).outW).toBe(16);
});
