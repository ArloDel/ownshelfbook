import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionPage } from '../../src/ui/collection/CollectionPage';
import { useDataStore } from '../../src/store/dataStore';
import { resetAll } from './helpers';

beforeEach(resetAll);

async function setup() {
  await useDataStore.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 3 });
  await useDataStore.getState().addBook({ title: 'Laskar Pelangi', type: 'buku' });
  const user = userEvent.setup();
  render(<CollectionPage />);
  return user;
}

const titles = () => useDataStore.getState().books.map((b) => `${b.title}${b.volume ? ' ' + b.volume : ''}`).sort();

test('select a few books and delete them at once', async () => {
  const user = await setup();
  await user.click(screen.getByRole('checkbox', { name: 'Pilih Naruto 1' }));
  await user.click(screen.getByRole('checkbox', { name: 'Pilih Naruto 3' }));
  const bar = screen.getByRole('region', { name: 'Buku dipilih' });
  expect(bar).toHaveTextContent('2 dipilih');
  await user.click(within(bar).getByRole('button', { name: 'Hapus 2 buku' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('Hapus 2 buku?');
  await user.click(within(dialog).getByRole('button', { name: 'Hapus' }));
  await waitFor(() => expect(titles()).toEqual(['Laskar Pelangi', 'Naruto 2']));
  expect(screen.queryByRole('region', { name: 'Buku dipilih' })).not.toBeInTheDocument();
});

test('a series checkbox selects the whole series; clearing empties the selection', async () => {
  const user = await setup();
  await user.click(screen.getByRole('checkbox', { name: 'Pilih semua Naruto' }));
  expect(screen.getByRole('region', { name: 'Buku dipilih' })).toHaveTextContent('3 dipilih');
  expect(screen.getByRole('checkbox', { name: 'Pilih Naruto 2' })).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Batal pilih' }));
  expect(screen.queryByRole('region', { name: 'Buku dipilih' })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Pilih semua Naruto' })).not.toBeChecked();
});

test('"select all shown" follows the filters, and hidden books are never deleted', async () => {
  const user = await setup();
  await user.click(screen.getByRole('checkbox', { name: 'Pilih Laskar Pelangi' }));
  await user.selectOptions(screen.getByLabelText('Jenis'), 'komik');
  await user.click(screen.getByRole('checkbox', { name: 'Pilih Naruto 1' }));
  const bar = screen.getByRole('region', { name: 'Buku dipilih' });
  expect(bar).toHaveTextContent('1 dipilih');
  await user.click(within(bar).getByRole('button', { name: 'Pilih semua yang tampil' }));
  expect(bar).toHaveTextContent('3 dipilih');
  await user.click(within(bar).getByRole('button', { name: 'Hapus 3 buku' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hapus' }));
  await waitFor(() => expect(titles()).toEqual(['Laskar Pelangi']));
});

test('cancelling the confirmation keeps the books and the selection', async () => {
  const user = await setup();
  await user.click(screen.getByRole('checkbox', { name: 'Pilih semua Naruto' }));
  await user.click(screen.getByRole('button', { name: 'Hapus 3 buku' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Batal' }));
  expect(useDataStore.getState().books).toHaveLength(4);
  expect(screen.getByRole('region', { name: 'Buku dipilih' })).toHaveTextContent('3 dipilih');
});
