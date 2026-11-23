import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDataStore } from '../../src/store/dataStore';
import { useUiStore } from '../../src/store/uiStore';
import { ShelfPanel } from '../../src/ui/room/ShelfPanel';
import { resetAll } from './helpers';

beforeEach(resetAll);

async function setup() {
  const store = useDataStore.getState();
  const id = await store.addShelf('rak-buku');
  const books = await useDataStore.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: 2 });
  await useDataStore.getState().placeBooks(books.map((b) => b.id), { shelfId: id, row: 4, col: 0 });
  useUiStore.setState({ selectedShelfId: id, mode: 'tata' });
  const user = userEvent.setup();
  render(<ShelfPanel />);
  return { id, user };
}

const rows = () => useDataStore.getState().shelves[0].rowHeightsCm.length;

test('shrinking rows with books asks first; cancel keeps rows', async () => {
  const { user } = await setup();
  const field = screen.getByLabelText('Jumlah tingkat');
  await user.clear(field);
  await user.type(field, '4{Enter}');
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('2 buku akan dikembalikan ke Belum ditata');
  await user.click(within(dialog).getByRole('button', { name: 'Batal' }));
  expect(rows()).toBe(5);
  expect(screen.getByLabelText('Jumlah tingkat')).toHaveValue('5');
});

test('confirming the shrink applies it and unplaces the books', async () => {
  const { user } = await setup();
  const field = screen.getByLabelText('Jumlah tingkat');
  await user.clear(field);
  await user.type(field, '4{Enter}');
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Kurangi' }));
  await waitFor(() => expect(rows()).toBe(4));
  expect(useDataStore.getState().books.every((b) => b.placement === null)).toBe(true);
});

test('growing rows needs no confirmation', async () => {
  const { user } = await setup();
  const field = screen.getByLabelText('Jumlah tingkat');
  await user.clear(field);
  await user.type(field, '6{Enter}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(rows()).toBe(6));
});

test('per-row height edits one row', async () => {
  const { user } = await setup();
  const field = screen.getByLabelText('Tingkat 1');
  await user.clear(field);
  await user.type(field, '40{Enter}');
  await waitFor(() => expect(useDataStore.getState().shelves[0].rowHeightsCm).toEqual([40, 33, 33, 33, 33]));
});

test('delete shelf confirms and returns books', async () => {
  const { user } = await setup();
  await user.click(screen.getByRole('button', { name: 'Hapus rak' }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('2 buku akan dikembalikan ke Belum ditata');
  await user.click(within(dialog).getByRole('button', { name: 'Hapus' }));
  await waitFor(() => expect(useDataStore.getState().shelves).toHaveLength(0));
  expect(useDataStore.getState().books).toHaveLength(2);
  expect(useUiStore.getState().selectedShelfId).toBeNull();
});
