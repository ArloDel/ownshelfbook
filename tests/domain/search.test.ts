import { createBook, createSeriesBooks } from '../../src/domain/books';
import { searchBooks } from '../../src/domain/search';

const books = [
  ...createSeriesBooks({ series: 'Naruto', type: 'komik', from: 1, to: 72 }),
  ...createSeriesBooks({ series: 'One Piece', type: 'komik', from: 1, to: 3, author: 'Eiichiro Oda' }),
  createBook({ title: 'Laskar Pelangi', type: 'buku', author: 'Andrea Hirata' }),
];

test('trailing number matches the volume first', () => {
  expect(searchBooks(books, 'naruto 34')[0].volume).toBe(34);
});

test('case-insensitive match on series', () => {
  expect(searchBooks(books, 'PIECE')).toHaveLength(3);
});

test('matches author', () => {
  expect(searchBooks(books, 'hirata')[0].title).toBe('Laskar Pelangi');
});

test('empty query returns nothing', () => {
  expect(searchBooks(books, '   ')).toEqual([]);
});

test('limit caps results', () => {
  expect(searchBooks(books, 'naruto')).toHaveLength(20);
  expect(searchBooks(books, 'naruto', 5)).toHaveLength(5);
});
