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

describe('height', () => {
  test('single book: height follows the type until typed, and is saved', async () => {
    const { user, form } = await openForm('Tambah buku');
    const field = within(form).getByLabelText('Tinggi (cm)');
    expect(field).toHaveValue('21');
    await user.selectOptions(within(form).getByLabelText('Jenis'), 'komik');
    expect(field).toHaveValue('18');
    await user.type(within(form).getByLabelText('Judul'), 'Atlas');
    await user.clear(field);
    await user.type(field, '19,5');
    await user.click(within(form).getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(useDataStore.getState().books).toHaveLength(1));
    expect(useDataStore.getState().books[0].heightCm).toBe(19.5);
  });

  test('series: every volume gets the custom height', async () => {
    const { user, form } = await openForm('Tambah berseri');
    await user.type(within(form).getByLabelText('Nama seri'), 'Berserk');
    await user.clear(within(form).getByLabelText('Sampai volume'));
    await user.type(within(form).getByLabelText('Sampai volume'), '2');
    const field = within(form).getByLabelText('Tinggi (cm)');
    await user.clear(field);
    await user.type(field, '25');
    await user.click(within(form).getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(useDataStore.getState().books).toHaveLength(2));
    expect(useDataStore.getState().books.map((b) => b.heightCm)).toEqual([25, 25]);
  });

  test('a height out of range shows an error and saves nothing', async () => {
    const { user, form } = await openForm('Tambah buku');
    await user.type(within(form).getByLabelText('Judul'), 'Mini');
    const field = within(form).getByLabelText('Tinggi (cm)');
    await user.clear(field);
    await user.type(field, '3');
    await user.click(within(form).getByRole('button', { name: 'Simpan' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Tinggi harus antara 5 dan 60 cm');
    expect(useDataStore.getState().books).toHaveLength(0);
  });

  test('editing a book takes a height with a decimal comma and checks the range', async () => {
    await useDataStore.getState().addBook({ title: 'Atlas', type: 'buku' });
    const user = userEvent.setup();
    render(<CollectionPage />);
    await user.click(screen.getByRole('button', { name: 'Edit Atlas' }));
    const form = screen.getByRole('form', { name: 'Edit buku' });
    const field = within(form).getByLabelText('Tinggi (cm)');
    expect(field).toHaveValue('21');
    await user.clear(field);
    await user.type(field, '70');
    await user.click(within(form).getByRole('button', { name: 'Simpan' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Tinggi harus antara 5 dan 60 cm');
    await user.clear(field);
    await user.type(field, '20,5');
    await user.click(within(form).getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(useDataStore.getState().books[0].heightCm).toBe(20.5));
  });
});
