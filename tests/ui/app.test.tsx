import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/ui/App';
import { useDataStore } from '../../src/store/dataStore';
import { useUiStore } from '../../src/store/uiStore';
import { resetAll } from './helpers';

vi.mock('../../src/ui/room/RoomPage', () => ({ RoomPage: () => <div>ruang-3d</div> }));

beforeEach(resetAll);

test('shows loading until data is hydrated', async () => {
  useDataStore.setState({ loaded: false });
  render(<App />);
  expect(screen.getByText('Memuat…')).toBeInTheDocument();
  expect(await screen.findByRole('tab', { name: 'Ruang 3D' })).toBeInTheDocument();
});

test('tabs switch between room and collection', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByText('ruang-3d')).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: 'Koleksi' }));
  expect(screen.getByRole('heading', { name: '0 buku' })).toBeInTheDocument();
});

test('store errors are shown and can be dismissed', async () => {
  const user = userEvent.setup();
  render(<App />);
  useDataStore.setState({ error: 'Perubahan gagal disimpan' });
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Perubahan gagal disimpan');
  await user.click(alert);
  expect(useDataStore.getState().error).toBeNull();
});

test('load failure shows the error instead of loading forever', async () => {
  const hydrate = useDataStore.getState().hydrate;
  useDataStore.setState({ loaded: false, error: 'Gagal memuat data', hydrate: async () => {} });
  try {
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memuat data');
    expect(screen.queryByText('Memuat…')).not.toBeInTheDocument();
  } finally {
    useDataStore.setState({ hydrate });
  }
});

test('the top bar steps aside while exploring', async () => {
  render(<App />);
  expect(await screen.findByRole('tablist', { name: 'Halaman' })).toBeInTheDocument();
  act(() => useUiStore.getState().startExplore());
  expect(screen.queryByRole('tablist', { name: 'Halaman' })).not.toBeInTheDocument();
});
