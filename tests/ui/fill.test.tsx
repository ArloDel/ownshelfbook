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
  await user.click(screen.getByRole('button', { name: 'Taruh di slot ini (3)' }));
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
  expect(screen.getByRole('button', { name: 'Taruh di slot ini (4)' })).toBeEnabled();
});

test('overflowing slot shows a warning', async () => {
  const { user } = await setup(30);
  await user.click(within(unplaced()).getByRole('checkbox', { name: 'Pilih semua Naruto' }));
  await user.click(screen.getByRole('button', { name: 'Taruh di slot ini (30)' }));
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
