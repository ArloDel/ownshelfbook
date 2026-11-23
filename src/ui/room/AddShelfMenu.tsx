import { useState } from 'react';
import { SHELF_PRESETS } from '../../domain/shelves';
import type { ShelfModel } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';

const MODELS = Object.keys(SHELF_PRESETS) as ShelfModel[];

export function AddShelfMenu() {
  const [open, setOpen] = useState(false);
  const addShelf = useDataStore((s) => s.addShelf);
  const selectShelf = useUiStore((s) => s.selectShelf);
  const setMode = useUiStore((s) => s.setMode);

  async function add(model: ShelfModel) {
    setOpen(false);
    const id = await addShelf(model);
    setMode('tata');
    selectShelf(id);
  }

  return (
    <div className="menu-wrap">
      <button className="primary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        + Tambah rak
      </button>
      {open && (
        <ul role="menu" className="menu" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          {MODELS.map((m) => (
            <li key={m} role="none">
              <button role="menuitem" onClick={() => void add(m)}>
                {SHELF_PRESETS[m].label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
