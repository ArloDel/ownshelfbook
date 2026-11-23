import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDataStore } from '../../src/store/dataStore';
import { useUiStore } from '../../src/store/uiStore';
import { SearchBox } from '../../src/ui/SearchBox';
import { resetAll } from './helpers';

beforeEach(resetAll);

test('choosing a placed book focuses its shelf on the room page', async () => {
  const id = await useDataStore.getState().addShelf('kubus');
  const [b1, b2] = await useDataStore.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 2 });
  await useDataStore.getState().placeBooks([b2.id], { shelfId: id, row: 1, col: 2 });
  useUiStore.setState({ page: 'collection' });
  const user = userEvent.setup();
  render(<SearchBox />);
  await user.type(screen.getByRole('combobox', { name: 'Cari buku' }), 'naruto 2');
  const option = await screen.findByRole('option', { name: /Naruto 2.*Rak 1 T2K3/ });
  await user.click(option);
  expect(useUiStore.getState()).toMatchObject({ page: 'room', highlightBookId: b2.id, focusShelfId: id, mode: 'isi' });
  expect(useUiStore.getState().selectedSlot).toEqual({ shelfId: id, row: 1, col: 2 });
  void b1;
});

test('choosing an unplaced book filters the unplaced list', async () => {
  const [b1] = await useDataStore.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 1 });
  const user = userEvent.setup();
  render(<SearchBox />);
  await user.type(screen.getByRole('combobox', { name: 'Cari buku' }), 'naruto');
  await user.click(await screen.findByRole('option', { name: /Naruto 1.*Belum ditata/ }));
  expect(useUiStore.getState()).toMatchObject({ page: 'room', highlightBookId: b1.id, unplacedFilter: 'Naruto 1' });
});
