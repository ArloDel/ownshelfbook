import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDataStore } from '../../src/store/dataStore';
import { useUiStore } from '../../src/store/uiStore';
import { SlotPanel } from '../../src/ui/room/SlotPanel';
import { UnplacedList } from '../../src/ui/room/UnplacedList';
import { resetAll } from './helpers';

beforeEach(resetAll);

async function setup(n = 3) {
  const id = await useDataStore.getState().addShelf('kubus');
  await useDataStore.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: n });
  useUiStore.setState({ mode: 'isi', selectedSlot: { shelfId: id, row: 0, col: 0 }, selectedShelfId: id });
  const user = userEvent.setup();
  render(
    <>
      <UnplacedList />
      <SlotPanel />
    </>,
  );
  return { id, user };
}

const unplaced = () => screen.getByRole('region', { name: 'Belum ditata' });
const slot = () => screen.getByRole('region', { name: /Tingkat 1 · Kolom 1/ });

test('place checked books into the selected slot, then take one out', async () => {
  const { user } = await setup();
  for (const v of ['Naruto 1', 'Naruto 2', 'Naruto 3']) {
    await user.click(within(unplaced()).getByRole('checkbox', { name: v }));
  }
  await user.click(screen.getByRole('button', { name: 'Taruh di lapis depan (3)' }));
  await waitFor(() => expect(within(slot()).getAllByRole('listitem')).toHaveLength(3));
  expect(within(unplaced()).queryByRole('checkbox', { name: 'Naruto 1' })).not.toBeInTheDocument();
  await waitFor(() => expect(useUiStore.getState().checkedBookIds).toEqual([]));

  await user.click(within(slot()).getByRole('button', { name: 'Keluarkan Naruto 1' }));
  await waitFor(() => expect(within(slot()).getAllByRole('listitem')).toHaveLength(2));
  expect(within(unplaced()).getByRole('checkbox', { name: 'Naruto 1' })).toBeInTheDocument();
});

test('select all volumes of a series', async () => {
  const { user } = await setup(4);
  await user.click(within(unplaced()).getByRole('checkbox', { name: 'Pilih semua Naruto' }));
  expect(screen.getByRole('button', { name: 'Taruh di lapis depan (4)' })).toBeEnabled();
});

test('overflowing slot shows a warning', async () => {
  const { user } = await setup(30);
  await user.click(within(unplaced()).getByRole('checkbox', { name: 'Pilih semua Naruto' }));
  await user.click(screen.getByRole('button', { name: 'Taruh di lapis depan (30)' }));
  expect(await within(slot()).findByText(/Meluap/)).toBeInTheDocument();
  expect(within(slot()).getAllByRole('listitem')).toHaveLength(30);
});

test('move a book up within the slot', async () => {
  const { user, id } = await setup(2);
  const ids = useDataStore.getState().books.map((b) => b.id);
  await useDataStore.getState().placeBooks(ids, { shelfId: id, row: 0, col: 0 });
  await user.click(within(slot()).getByRole('button', { name: 'Naikkan Naruto 2' }));
  await waitFor(() =>
    expect(within(slot()).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Naruto 2'),
      expect.stringContaining('Naruto 1'),
    ]),
  );
});

test('button disabled without a selected slot', async () => {
  await setup();
  useUiStore.setState({ selectedSlot: null });
  expect(await screen.findByText(/Klik salah satu slot/)).toBeInTheDocument();
});

describe('two layers', () => {
  test('choose the back layer, then place books there', async () => {
    const { user } = await setup();
    await user.click(within(slot()).getByRole('radio', { name: 'Belakang' }));
    await user.click(within(unplaced()).getByLabelText('Naruto 1'));
    await user.click(within(unplaced()).getByLabelText('Naruto 2'));
    await user.click(within(slot()).getByRole('button', { name: 'Taruh di lapis belakang (2)' }));
    await waitFor(() =>
      expect(useDataStore.getState().books.filter((b) => b.placement?.layer === 'belakang').map((b) => b.volume).sort()).toEqual([1, 2]),
    );
    expect(slot()).toHaveTextContent('Depan: 0 buku');
    expect(within(slot()).getAllByRole('listitem')).toHaveLength(2);
  });

  test('a book in the front layer can move to the back', async () => {
    const { id, user } = await setup();
    const ids = useDataStore.getState().books.map((b) => b.id);
    await useDataStore.getState().placeBooks(ids, { shelfId: id, row: 0, col: 0 });
    await user.click(await within(slot()).findByRole('button', { name: 'Pindah Naruto 1 ke belakang' }));
    await waitFor(() => expect(useDataStore.getState().books.find((b) => b.volume === 1)!.placement!.layer).toBe('belakang'));
    expect(slot()).toHaveTextContent('Belakang: 1 buku');
  });
});

test('a shallow wall shelf has a single layer and no move buttons', async () => {
  const id = await useDataStore.getState().addShelf('dinding');
  const [b] = await useDataStore.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 1 });
  await useDataStore.getState().placeBooks([b.id], { shelfId: id, row: 0, col: 0 });
  useUiStore.setState({ mode: 'isi', selectedSlot: { shelfId: id, row: 0, col: 0 }, selectedShelfId: id });
  render(<SlotPanel />);
  const region = screen.getByRole('region', { name: /Tingkat 1 · Kolom 1/ });
  expect(within(region).queryByRole('radiogroup', { name: 'Lapis' })).not.toBeInTheDocument();
  expect(within(region).queryByRole('button', { name: /Pindah/ })).not.toBeInTheDocument();
});

test('on the back layer, a too-tall warning points at the riser', async () => {
  const id = await useDataStore.getState().addShelf('kubus');
  // A 22 cm row with a 15 cm riser leaves 7 cm: an 18 cm comic does not fit.
  await useDataStore.getState().updateShelf(id, { backRiserCm: 15, rowHeightsCm: [22, 33, 33, 33] });
  const [b] = await useDataStore.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 1 });
  await useDataStore.getState().placeBooks([b.id], { shelfId: id, row: 0, col: 0 }, 'belakang');
  useUiStore.setState({ mode: 'isi', selectedSlot: { shelfId: id, row: 0, col: 0 }, selectedShelfId: id, slotLayer: 'belakang' });
  render(<SlotPanel />);
  expect(await screen.findByText('Ada buku lebih tinggi dari ruang di atas penyangga. Turunkan penyangga di panel rak.')).toBeInTheDocument();
});

test('the place button names the layer it places into', async () => {
  const { user } = await setup();
  expect(within(slot()).getByRole('button', { name: 'Taruh di lapis depan (0)' })).toBeInTheDocument();
  await user.click(within(slot()).getByRole('radio', { name: 'Belakang' }));
  expect(within(slot()).getByRole('button', { name: 'Taruh di lapis belakang (0)' })).toBeInTheDocument();
});
