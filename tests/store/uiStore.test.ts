import { createUiStore } from '../../src/store/uiStore';

test('switching mode clears the selected slot', () => {
  const s = createUiStore();
  s.getState().selectSlot({ shelfId: 'a', row: 0, col: 0 });
  s.getState().setMode('tata');
  expect(s.getState().selectedSlot).toBeNull();
});

test('toggleChecked adds and removes ids', () => {
  const s = createUiStore();
  s.getState().toggleChecked('x');
  s.getState().toggleChecked('y');
  s.getState().toggleChecked('x');
  expect(s.getState().checkedBookIds).toEqual(['y']);
  s.getState().clearChecked();
  expect(s.getState().checkedBookIds).toEqual([]);
});

test('focusBook sets the book and its shelf', () => {
  const s = createUiStore();
  s.getState().focusBook('b1', 'shelf1');
  expect(s.getState()).toMatchObject({ highlightBookId: 'b1', focusShelfId: 'shelf1' });
});

test('a slot opens on its back layer unless a layer is named', () => {
  const s = createUiStore();
  expect(s.getState().slotLayer).toBe('belakang');
  s.getState().selectSlot({ shelfId: 'a', row: 0, col: 0 }, 'depan');
  expect(s.getState().slotLayer).toBe('depan');
  s.getState().selectSlot({ shelfId: 'a', row: 1, col: 0 });
  expect(s.getState().slotLayer).toBe('belakang');
  s.getState().setSlotLayer('depan');
  expect(s.getState().slotLayer).toBe('depan');
});
