import { render, screen } from '@testing-library/react';
import { useDataStore } from '../../src/store/dataStore';
import { useUiStore } from '../../src/store/uiStore';
import { ExploreCard } from '../../src/ui/room/ExploreCard';
import { resetAll } from './helpers';

beforeEach(resetAll);

test('the card names the book, its author and where it stands', async () => {
  const id = await useDataStore.getState().addShelf('kubus');
  const book = await useDataStore.getState().addBook({ title: 'Naruto', series: 'Naruto', volume: 12, type: 'komik', author: 'Masashi Kishimoto' });
  await useDataStore.getState().placeBooks([book.id], { shelfId: id, row: 0, col: 0 });
  useUiStore.setState({ exploring: true, exploreCard: { bookId: book.id, x: 100, y: 80, pinned: false } });
  render(<ExploreCard />);
  const card = screen.getByRole('status', { name: 'Buku ditunjuk' });
  expect(card).toHaveTextContent('Naruto 12');
  expect(card).toHaveTextContent('Masashi Kishimoto');
  expect(card).toHaveTextContent('Rak 1 T1K1');
});

test('no card when nothing is pointed at', () => {
  useUiStore.setState({ exploring: true, exploreCard: null });
  render(<ExploreCard />);
  expect(screen.queryByRole('status', { name: 'Buku ditunjuk' })).not.toBeInTheDocument();
});
