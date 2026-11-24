import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionPage } from '../../src/ui/collection/CollectionPage';
import { useDataStore } from '../../src/store/dataStore';
import { resetAll } from './helpers';

beforeEach(resetAll);

async function openForm(name: 'Tambah buku' | 'Tambah berseri') {
  const user = userEvent.setup();
  render(<CollectionPage />);
  await user.click(screen.getByRole('button', { name }));
  return { user, form: screen.getByRole('form', { name }) };
}

test('single book: thickness starts at the type default and follows the type until edited', async () => {
  const { user, form } = await openForm('Tambah buku');
  const field = within(form).getByLabelText('Tebal (cm)');
  expect(field).toHaveValue('3');
  await user.selectOptions(within(form).getByLabelText('Jenis'), 'komik');
  expect(field).toHaveValue('1.5');
  await user.clear(field);
  await user.type(field, '2,5');
  await user.selectOptions(within(form).getByLabelText('Jenis'), 'buku');
  expect(field).toHaveValue('2,5');
});

test('single book: the custom thickness is saved', async () => {
  const { user, form } = await openForm('Tambah buku');
  await user.type(within(form).getByLabelText('Judul'), 'Atlas');
  const field = within(form).getByLabelText('Tebal (cm)');
  await user.clear(field);
  await user.type(field, '4,2');
  await user.click(within(form).getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(useDataStore.getState().books).toHaveLength(1));
  expect(useDataStore.getState().books[0].thicknessCm).toBe(4.2);
});

test('series: every volume gets the custom thickness', async () => {
  const { user, form } = await openForm('Tambah berseri');
  await user.type(within(form).getByLabelText('Nama seri'), 'Naruto');
  const field = within(form).getByLabelText('Tebal (cm)');
  expect(field).toHaveValue('1.5');
  await user.clear(within(form).getByLabelText('Sampai volume'));
  await user.type(within(form).getByLabelText('Sampai volume'), '3');
  await user.clear(field);
  await user.type(field, '1,8');
  await user.click(within(form).getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(useDataStore.getState().books).toHaveLength(3));
  expect(useDataStore.getState().books.map((b) => b.thicknessCm)).toEqual([1.8, 1.8, 1.8]);
});

test('an invalid thickness shows an error and saves nothing', async () => {
  const { user, form } = await openForm('Tambah berseri');
  await user.type(within(form).getByLabelText('Nama seri'), 'Naruto');
  const field = within(form).getByLabelText('Tebal (cm)');
  await user.clear(field);
  await user.type(field, 'abc');
  await user.click(within(form).getByRole('button', { name: 'Simpan' }));
  expect(await within(form).findByRole('alert')).toHaveTextContent('Tebal harus antara 0,1 dan 30 cm');
  expect(useDataStore.getState().books).toHaveLength(0);
});
