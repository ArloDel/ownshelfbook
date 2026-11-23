import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/ui/App';
import { useDataStore } from '../../src/store/dataStore';
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
  expect(screen.getByRole('heading', { name: /Koleksi/ })).toBeInTheDocument();
});
