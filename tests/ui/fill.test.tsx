import { act, render, screen, waitFor, within } from '@testing-library/react';
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

test('a slot that already holds too much (e.g. from an older backup) shows a warning', async () => {
  const { id } = await setup(30);
  // Taruh no longer overfills; older data can still hold more than fits.
  await useDataStore.getState().placeBooks(useDataStore.getState().books.map((b) => b.id), { shelfId: id, row: 0, col: 0 });
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

describe('selecting books in a slot', () => {
  async function filled() {
    const ctx = await setup(4);
    const ids = useDataStore.getState().books.map((b) => b.id);
    await useDataStore.getState().placeBooks(ids, { shelfId: ctx.id, row: 0, col: 0 });
    return { ...ctx, ids };
  }
  const placedLayer = (vol: number) => useDataStore.getState().books.find((b) => b.volume === vol)!.placement?.layer ?? null;

  test('a series checkbox picks every book of that run, then all of them move to the back', async () => {
    const { user } = await filled();
    await user.click(await within(slot()).findByRole('checkbox', { name: 'Pilih semua Naruto' }));
    const bar = within(slot()).getByRole('region', { name: 'Buku dipilih di slot' });
    expect(bar).toHaveTextContent('4 dipilih');
    await user.click(within(bar).getByRole('button', { name: 'Pindah ke belakang' }));
    await waitFor(() => expect([1, 2, 3, 4].map(placedLayer)).toEqual(['belakang', 'belakang', 'belakang', 'belakang']));
    expect(useUiStore.getState().checkedBookIds).toEqual([]);
  });

  test('take a few checked books out of the slot at once', async () => {
    const { user } = await filled();
    await user.click(await within(slot()).findByRole('checkbox', { name: 'Pilih Naruto 1' }));
    await user.click(within(slot()).getByRole('checkbox', { name: 'Pilih Naruto 3' }));
    await user.click(within(within(slot()).getByRole('region', { name: 'Buku dipilih di slot' })).getByRole('button', { name: 'Keluarkan' }));
    await waitFor(() => expect([1, 2, 3, 4].map((v) => useDataStore.getState().books.find((b) => b.volume === v)!.placement === null)).toEqual([true, false, true, false]));
  });

  test('"Pilih semua" checks every book on this layer', async () => {
    const { user } = await filled();
    await user.click(await within(slot()).findByRole('checkbox', { name: 'Pilih Naruto 2' }));
    await user.click(within(within(slot()).getByRole('region', { name: 'Buku dipilih di slot' })).getByRole('button', { name: 'Pilih semua' }));
    expect(within(slot()).getByRole('region', { name: 'Buku dipilih di slot' })).toHaveTextContent('4 dipilih');
  });

  test('books checked in one slot move to another slot with Taruh', async () => {
    const { id, user } = await filled();
    await user.click(await within(slot()).findByRole('checkbox', { name: 'Pilih Naruto 1' }));
    await user.click(within(slot()).getByRole('checkbox', { name: 'Pilih Naruto 2' }));
    // Books already in this slot do not count towards Taruh here.
    expect(within(slot()).getByRole('button', { name: 'Taruh di lapis depan (0)' })).toBeDisabled();
    act(() => useUiStore.getState().selectSlot({ shelfId: id, row: 0, col: 1 }));
    const target = await screen.findByRole('region', { name: /Tingkat 1 · Kolom 2/ });
    // The other slot opens on its back layer: the back row fills first.
    await user.click(within(target).getByRole('button', { name: 'Taruh di lapis belakang (2)' }));
    await waitFor(() =>
      expect(useDataStore.getState().books.filter((b) => b.placement?.col === 1).map((b) => b.volume).sort()).toEqual([1, 2]),
    );
    expect(useDataStore.getState().books.filter((b) => b.placement?.col === 0).map((b) => b.placement!.order).sort()).toEqual([0, 1]);
  });

  test('the unplaced list counts books picked on a shelf too', async () => {
    const { user } = await filled();
    await user.click(await within(slot()).findByRole('checkbox', { name: 'Pilih Naruto 1' }));
    expect(unplaced()).toHaveTextContent('1 dipilih');
  });
});

describe('when the back layer is full', () => {
  async function overfill(n: number, col = 0) {
    const ctx = await setup(n);
    useUiStore.setState({ slotLayer: 'belakang', selectedSlot: { shelfId: ctx.id, row: 0, col } });
    await ctx.user.click(within(unplaced()).getByRole('checkbox', { name: 'Pilih semua Naruto' }));
    const region = () => screen.getByRole('region', { name: new RegExp(`Tingkat 1 · Kolom ${col + 1}`) });
    await ctx.user.click(within(region()).getByRole('button', { name: `Taruh di lapis belakang (${n})` }));
    return { ...ctx, region };
  }
  const inSlot = (col: number, layer: string) =>
    useDataStore.getState().books.filter((b) => b.placement?.col === col && b.placement.layer === layer).length;

  // Saving 20+ books to the fake IndexedDB can take over a second when the whole suite runs.
  test('only what fits goes in, then the rest can go to the front', async () => {
    const { user, region } = await overfill(25);
    const ask = await within(region()).findByRole('region', { name: 'Sisa buku' }, { timeout: 5000 });
    expect(ask).toHaveTextContent('Lapis belakang penuh. 3 buku belum tertaruh.');
    expect(inSlot(0, 'belakang')).toBe(22);
    await user.click(within(ask).getByRole('button', { name: 'Ke lapis depan' }));
    await waitFor(() => expect(inSlot(0, 'depan')).toBe(3), { timeout: 5000 });
    expect(within(region()).queryByRole('region', { name: 'Sisa buku' })).not.toBeInTheDocument();
  });

  test('the rest can go to the slot on the right', async () => {
    const { user, region } = await overfill(25);
    await user.click(within(await within(region()).findByRole('region', { name: 'Sisa buku' }, { timeout: 5000 })).getByRole('button', { name: 'Ke slot sebelah' }));
    await waitFor(() => expect(inSlot(1, 'belakang')).toBe(3), { timeout: 5000 });
  });

  test('"Biarkan" leaves the rest unplaced and still picked', async () => {
    const { user, region } = await overfill(25);
    await user.click(within(await within(region()).findByRole('region', { name: 'Sisa buku' }, { timeout: 5000 })).getByRole('button', { name: 'Biarkan' }));
    expect(useDataStore.getState().books.filter((b) => b.placement === null)).toHaveLength(3);
    expect(useUiStore.getState().checkedBookIds).toHaveLength(3);
    expect(within(region()).queryByRole('region', { name: 'Sisa buku' })).not.toBeInTheDocument();
  });

  test('in the last column, after the front fills too, it says the books do not fit in this tier', async () => {
    const { user, region } = await overfill(50, 3);
    const ask = await within(region()).findByRole('region', { name: 'Sisa buku' }, { timeout: 5000 });
    expect(within(ask).queryByRole('button', { name: 'Ke slot sebelah' })).not.toBeInTheDocument();
    await user.click(within(ask).getByRole('button', { name: 'Ke lapis depan' }));
    await waitFor(() => expect(within(region()).getByRole('region', { name: 'Sisa buku' })).toHaveTextContent('6 buku tidak muat di tingkat ini.'), { timeout: 5000 });
    expect(within(within(region()).getByRole('region', { name: 'Sisa buku' })).queryByRole('button', { name: /Ke / })).not.toBeInTheDocument();
  });
});
