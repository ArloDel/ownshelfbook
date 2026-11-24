import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDataStore } from '../../src/store/dataStore';
import { useUiStore } from '../../src/store/uiStore';
import { RoomPage } from '../../src/ui/room/RoomPage';
import { resetAll } from './helpers';

vi.mock('../../src/ui/scene/Scene', () => ({ Scene: () => <div>kanvas-3d</div> }));

beforeEach(resetAll);

test('the shelf sheet appears only while a shelf is selected', async () => {
  const id = await useDataStore.getState().addShelf('kubus');
  render(<RoomPage />);
  expect(screen.queryByRole('complementary', { name: 'Pengaturan rak' })).not.toBeInTheDocument();
  expect(screen.getByText(/Klik rak untuk memilih/)).toBeInTheDocument();
  useUiStore.getState().selectShelf(id);
  const sheet = await screen.findByRole('complementary', { name: 'Pengaturan rak' });
  expect(within(sheet).getByLabelText('Nama rak')).toHaveValue('Rak 1');
});

test('in fill mode the slot sheet waits for a slot; the caption says what to do', async () => {
  const id = await useDataStore.getState().addShelf('kubus');
  useUiStore.setState({ mode: 'isi' });
  render(<RoomPage />);
  expect(screen.getByText(/Klik salah satu slot/)).toBeInTheDocument();
  expect(screen.queryByRole('complementary', { name: 'Panel slot' })).not.toBeInTheDocument();
  useUiStore.getState().selectSlot({ shelfId: id, row: 0, col: 0 });
  expect(await screen.findByRole('complementary', { name: 'Panel slot' })).toBeInTheDocument();
});

test('the unplaced sheet folds into a chip with the count and opens again', async () => {
  await useDataStore.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 4 });
  const user = userEvent.setup();
  render(<RoomPage />);
  expect(screen.getByRole('region', { name: 'Belum ditata' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Sembunyikan Belum ditata' }));
  expect(screen.queryByRole('region', { name: 'Belum ditata' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Belum ditata 4' }));
  expect(screen.getByRole('region', { name: 'Belum ditata' })).toBeInTheDocument();
});

test('mode switch and room actions sit together in one floating toolbar', () => {
  render(<RoomPage />);
  const bar = screen.getByRole('toolbar', { name: 'Alat ruang' });
  expect(within(bar).getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument();
  expect(within(bar).getByRole('button', { name: '+ Tambah rak' })).toBeInTheDocument();
  expect(within(bar).getByRole('button', { name: 'Ukuran ruangan' })).toBeInTheDocument();
});
