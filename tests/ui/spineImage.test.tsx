import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDataStore } from '../../src/store/dataStore';
import { CollectionPage } from '../../src/ui/collection/CollectionPage';
import { renderSpine } from '../../src/ui/collection/spineImage';
import { resetAll } from './helpers';

vi.mock('../../src/ui/collection/spineImage', () => ({
  NOT_AN_IMAGE: 'File ini bukan gambar yang bisa dibaca.',
  loadImage: vi.fn(async (f: Blob) => {
    if (!f.type.startsWith('image/')) throw new Error('File ini bukan gambar yang bisa dibaca.');
    return { naturalWidth: 1000, naturalHeight: 1500 };
  }),
  renderSpine: vi.fn(() => 'data:image/webp;base64,SPINE'),
}));

beforeEach(async () => {
  await resetAll();
  vi.mocked(renderSpine).mockClear();
  await useDataStore.getState().addSeries({ series: 'Naruto', type: 'komik', from: 1, to: 2 });
});

const png = () => new File(['x'], 'naruto.png', { type: 'image/png' });

async function openDialog() {
  // The file input accepts image/* only; let a wrong file through to test the dialog's own check.
  const user = userEvent.setup({ applyAccept: false });
  render(<CollectionPage />);
  await user.click(screen.getByRole('button', { name: 'Gambar punggung Naruto' }));
  return { user, dialog: await screen.findByRole('dialog', { name: 'Gambar punggung — Naruto' }) };
}

test('pick a picture, preview it, and save it for the whole series', async () => {
  const { user, dialog } = await openDialog();
  await user.upload(within(dialog).getByLabelText('Pilih file'), png());
  expect(await within(dialog).findByAltText('Pratinjau punggung')).toHaveAttribute('src', 'data:image/webp;base64,SPINE');
  await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(useDataStore.getState().covers.Naruto).toBe('data:image/webp;base64,SPINE'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(within(screen.getByRole('button', { name: 'Gambar punggung Naruto' })).getByRole('img')).toBeInTheDocument();
});

test('the strip follows the series shape and the crop slider', async () => {
  const { user, dialog } = await openDialog();
  await user.upload(within(dialog).getByLabelText('Pilih file'), png());
  await within(dialog).findByAltText('Pratinjau punggung');
  const [, ratio, pos] = vi.mocked(renderSpine).mock.calls.at(-1)!;
  expect(ratio).toBeCloseTo(1.5 / 18);
  expect(pos).toBe(0.5);
  fireEvent.change(within(dialog).getByLabelText('Posisi potongan'), { target: { value: '20' } });
  await waitFor(() => expect(vi.mocked(renderSpine).mock.calls.at(-1)![2]).toBe(0.2));
});

test('a file that is not a picture is refused and nothing is saved', async () => {
  const { user, dialog } = await openDialog();
  await user.upload(within(dialog).getByLabelText('Pilih file'), new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }));
  expect(await within(dialog).findByText('File ini bukan gambar yang bisa dibaca.')).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: 'Simpan' })).toBeDisabled();
  expect(useDataStore.getState().covers).toEqual({});
});

test('a saved picture can be removed', async () => {
  await useDataStore.getState().setCover('Naruto', 'data:image/webp;base64,OLD');
  const { user, dialog } = await openDialog();
  await user.click(within(dialog).getByRole('button', { name: 'Hapus gambar' }));
  await waitFor(() => expect(useDataStore.getState().covers).toEqual({}));
});

test('a picture can be pasted', async () => {
  const { dialog } = await openDialog();
  fireEvent.paste(within(dialog).getByText(/tempel \(Ctrl\+V\)/), { clipboardData: { files: [png()] } });
  expect(await within(dialog).findByAltText('Pratinjau punggung')).toBeInTheDocument();
});

test('Ctrl+V works anywhere in the dialog, not only on the drop area', async () => {
  const { dialog } = await openDialog();
  fireEvent.paste(dialog, { clipboardData: { files: [png()] } });
  expect(await within(dialog).findByAltText('Pratinjau punggung')).toBeInTheDocument();
});
