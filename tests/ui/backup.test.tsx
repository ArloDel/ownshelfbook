import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDataStore } from '../../src/store/dataStore';
import { BackupButtons } from '../../src/ui/BackupButtons';
import { resetAll } from './helpers';

beforeEach(resetAll);

test('importing a broken file shows an error and keeps data', async () => {
  await useDataStore.getState().addSeries({ series: 'Keep', type: 'buku', from: 1, to: 2 });
  const user = userEvent.setup();
  render(<BackupButtons />);
  const file = new File(['oops'], 'x.json', { type: 'application/json' });
  await user.upload(screen.getByLabelText('Pilih file cadangan'), file);
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Ganti semua' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/tidak valid/);
  expect(useDataStore.getState().books).toHaveLength(2);
});

test('importing a valid file replaces data', async () => {
  await useDataStore.getState().addSeries({ series: 'A', type: 'buku', from: 1, to: 3 });
  const text = useDataStore.getState().exportData();
  await useDataStore.getState().deleteBooks(useDataStore.getState().books.map((b) => b.id));
  const user = userEvent.setup();
  render(<BackupButtons />);
  await user.upload(screen.getByLabelText('Pilih file cadangan'), new File([text], 'b.json'));
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Ganti semua' }));
  await waitFor(() => expect(useDataStore.getState().books).toHaveLength(3));
});
