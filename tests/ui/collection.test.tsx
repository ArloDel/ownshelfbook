import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionPage } from '../../src/ui/collection/CollectionPage';
import { useDataStore } from '../../src/store/dataStore';
import { resetAll } from './helpers';

beforeEach(resetAll);

async function addSeries(from: string, to: string) {
  const user = userEvent.setup();
  render(<CollectionPage />);
  await user.click(screen.getByRole('button', { name: 'Tambah berseri' }));
  const form = screen.getByRole('form', { name: 'Tambah berseri' });
  await user.type(within(form).getByLabelText('Nama seri'), 'Naruto');
  await user.selectOptions(within(form).getByLabelText('Jenis'), 'komik');
  await user.clear(within(form).getByLabelText('Dari volume'));
  await user.type(within(form).getByLabelText('Dari volume'), from);
  await user.clear(within(form).getByLabelText('Sampai volume'));
  await user.type(within(form).getByLabelText('Sampai volume'), to);
  await user.click(within(form).getByRole('button', { name: 'Simpan' }));
  return user;
}

test('bulk add series shows the volumes grouped', async () => {
  await addSeries('1', '5');
  const group = await screen.findByRole('region', { name: 'Naruto' });
  expect(within(group).getAllByRole('listitem')).toHaveLength(5);
  expect(useDataStore.getState().books).toHaveLength(5);
});

test('bad range shows an error and adds nothing', async () => {
  await addSeries('5', '1');
  expect(await screen.findByRole('alert')).toHaveTextContent(/tidak boleh lebih besar/);
  expect(useDataStore.getState().books).toHaveLength(0);
});

test('add a single book', async () => {
  const user = userEvent.setup();
  render(<CollectionPage />);
  await user.click(screen.getByRole('button', { name: 'Tambah buku' }));
  const form = screen.getByRole('form', { name: 'Tambah buku' });
  await user.type(within(form).getByLabelText('Judul'), 'Laskar Pelangi');
  await user.selectOptions(within(form).getByLabelText('Jenis'), 'buku');
  await user.click(within(form).getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByRole('region', { name: 'Laskar Pelangi' })).toBeInTheDocument();
});

test('delete asks for confirmation', async () => {
  const user = await addSeries('1', '2');
  const group = await screen.findByRole('region', { name: 'Naruto' });
  const [first] = within(group).getAllByRole('listitem');
  await user.click(within(first).getByRole('button', { name: /Hapus/ }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('Hapus 1 buku?');
  await user.click(within(dialog).getByRole('button', { name: 'Hapus' }));
  expect(within(screen.getByRole('region', { name: 'Naruto' })).getAllByRole('listitem')).toHaveLength(1);
});

test('filter by status', async () => {
  const user = await addSeries('1', '2');
  await user.selectOptions(screen.getByLabelText('Status'), 'ditata');
  expect(screen.queryByRole('region', { name: 'Naruto' })).not.toBeInTheDocument();
});
