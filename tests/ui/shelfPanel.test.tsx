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
  const field = screen.getByLabelText('Tinggi tingkat 1');
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

const cols = (row: number) => useDataStore.getState().shelves[0].colWidthsCm[row];

async function typeInto(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const field = screen.getByLabelText(label);
  await user.clear(field);
  await user.type(field, `${value}{Enter}`);
}

test('column count of one row splits that row only', async () => {
  const { user } = await setup();
  await typeInto(user, 'Jumlah kolom tingkat 2', '2');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(cols(1)).toEqual([37, 37]));
  expect(cols(0)).toEqual([76]);
});

test('fewer columns in a row with books asks first', async () => {
  const { user, id } = await setup();
  await typeInto(user, 'Jumlah kolom tingkat 2', '2');
  await waitFor(() => expect(cols(1)).toHaveLength(2));
  const [book] = await useDataStore.getState().addSeries({ series: 'Y', type: 'komik', from: 1, to: 1 });
  await useDataStore.getState().placeBooks([book.id], { shelfId: id, row: 1, col: 1 });
  await typeInto(user, 'Jumlah kolom tingkat 2', '1');
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('1 buku akan dikembalikan ke Belum ditata');
  await user.click(within(dialog).getByRole('button', { name: 'Kurangi' }));
  await waitFor(() => expect(cols(1)).toHaveLength(1));
  expect(useDataStore.getState().books.find((b) => b.id === book.id)!.placement).toBeNull();
});

test('column width edits adjust the last column automatically', async () => {
  const { user } = await setup();
  await typeInto(user, 'Jumlah kolom tingkat 1', '2');
  await waitFor(() => expect(cols(0)).toHaveLength(2));
  await typeInto(user, 'Tingkat 1 kolom 1', '50');
  await waitFor(() => expect(cols(0)).toEqual([50, 24]));
  expect(screen.getByText('Kolom 2: 24 cm (otomatis)')).toBeInTheDocument();
});

test('shelf width sets the inner width', async () => {
  const { user } = await setup();
  await typeInto(user, 'Lebar rak', '100');
  await waitFor(() => expect(useDataStore.getState().shelves[0].innerWidthCm).toBe(96));
  expect(cols(2)).toEqual([96]);
});
