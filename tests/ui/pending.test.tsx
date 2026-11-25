import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDataStore } from '../../src/store/dataStore';
import { useUiStore } from '../../src/store/uiStore';
import { CollectionPage } from '../../src/ui/collection/CollectionPage';
import { SlotPanel } from '../../src/ui/room/SlotPanel';
import { resetAll } from './helpers';

const never = () => new Promise<never>(() => {});
let original: ReturnType<typeof useDataStore.getState>;

beforeEach(async () => {
  await resetAll();
  original = useDataStore.getState();
});
afterEach(() => {
  useDataStore.setState({ addSeries: original.addSeries, fillSlot: original.fillSlot });
});

test('series form shows a saving state while the store works', async () => {
  useDataStore.setState({ addSeries: never });
  const user = userEvent.setup();
  render(<CollectionPage />);
  await user.click(screen.getByRole('button', { name: 'Tambah berseri' }));
  const form = screen.getByRole('form', { name: 'Tambah berseri' });
  await user.type(within(form).getByLabelText('Nama seri'), 'Naruto');
  await user.click(within(form).getByRole('button', { name: 'Simpan' }));
  expect(within(form).getByRole('button', { name: 'Menyimpan…' })).toBeDisabled();
});

test('place button shows a placing state', async () => {
  const id = await original.addShelf('kubus');
  const [b] = await useDataStore.getState().addSeries({ series: 'X', type: 'komik', from: 1, to: 1 });
  useDataStore.setState({ fillSlot: never });
  useUiStore.setState({ mode: 'isi', selectedSlot: { shelfId: id, row: 0, col: 0 }, checkedBookIds: [b.id] });
  const user = userEvent.setup();
  render(<SlotPanel />);
  await user.click(screen.getByRole('button', { name: 'Taruh di lapis depan (1)' }));
  expect(screen.getByRole('button', { name: 'Menaruh…' })).toBeDisabled();
});
