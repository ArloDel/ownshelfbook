import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDataStore } from '../../src/store/dataStore';
import { useUiStore } from '../../src/store/uiStore';
import { AddShelfMenu } from '../../src/ui/room/AddShelfMenu';
import { RoomSettings } from '../../src/ui/room/RoomSettings';
import { resetAll } from './helpers';

beforeEach(resetAll);

test('add shelf menu adds the chosen model and selects it', async () => {
  const user = userEvent.setup();
  render(<AddShelfMenu />);
  await user.click(screen.getByRole('button', { name: '+ Tambah rak' }));
  await user.click(screen.getByRole('menuitem', { name: 'Rak kubus' }));
  const [shelf] = useDataStore.getState().shelves;
  expect(shelf.model).toBe('kubus');
  expect(useUiStore.getState().selectedShelfId).toBe(shelf.id);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

test('room settings change the room size', async () => {
  const user = userEvent.setup();
  render(<RoomSettings />);
  await user.click(screen.getByRole('button', { name: 'Ukuran ruangan' }));
  const dlg = screen.getByRole('group', { name: 'Ukuran ruangan' });
  const w = within(dlg).getByLabelText('Lebar');
  await user.clear(w);
  await user.type(w, '320{Enter}');
  expect(useDataStore.getState().room.widthCm).toBe(320);
});
