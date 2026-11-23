import { db } from '../../src/persistence/db';
import { useDataStore } from '../../src/store/dataStore';
import { useUiStore } from '../../src/store/uiStore';
import { DEFAULT_ROOM } from '../../src/persistence/db';

export async function resetAll() {
  await db.delete();
  await db.open();
  useDataStore.setState({ loaded: true, room: DEFAULT_ROOM, shelves: [], books: [] });
  useUiStore.setState({
    page: 'room',
    mode: 'tata',
    selectedShelfId: null,
    selectedSlot: null,
    checkedBookIds: [],
    highlightBookId: null,
    focusShelfId: null,
    unplacedFilter: '',
  });
}
