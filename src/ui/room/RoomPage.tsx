import { useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useUiStore, type Mode } from '../../store/uiStore';
import { Scene } from '../scene/Scene';
import { AddShelfMenu } from './AddShelfMenu';
import { RoomSettings } from './RoomSettings';
import { ShelfPanel } from './ShelfPanel';
import { SlotPanel } from './SlotPanel';
import { UnplacedList } from './UnplacedList';

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: 'tata', label: 'Tata', hint: 'Atur letak dan bentuk rak' },
  { mode: 'isi', label: 'Isi', hint: 'Taruh buku ke slot rak' },
];

const HINTS: Record<Mode, string> = {
  tata: 'Klik rak untuk memilih, seret untuk menggeser. Seret area kosong untuk memutar kamera.',
  isi: 'Centang buku di Belum ditata, lalu taruh di slot ini.',
};
const PICK_SLOT = 'Klik salah satu slot rak di ruang 3D untuk mengisinya.';

/** The 3D room fills the page; lists and editors float over it and appear only when needed. */
export function RoomPage() {
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const checkedCount = useUiStore((s) => s.checkedBookIds.length);
  const selectedShelfId = useUiStore((s) => s.selectedShelfId);
  const shelfSelected = useDataStore((s) => s.shelves.some((x) => x.id === selectedShelfId));
  const slot = useUiStore((s) => s.selectedSlot);
  const slotShelf = useDataStore((s) => s.shelves.find((x) => x.id === slot?.shelfId));
  const unplacedCount = useDataStore((s) => s.books.filter((b) => b.placement === null).length);
  const [listOpen, setListOpen] = useState(true);

  const slotSelected =
    !!slot && !!slotShelf && slot.row < slotShelf.rowHeightsCm.length && slot.col < slotShelf.colWidthsCm[slot.row].length;

  let caption = HINTS[mode];
  if (mode === 'isi' && !slotSelected) {
    caption = checkedCount > 0 ? `${PICK_SLOT} ${checkedCount} buku dipilih dan siap ditaruh.` : PICK_SLOT;
  }

  return (
    <div className="room">
      <div className="canvas-wrap">
        <Scene />
      </div>

      {listOpen ? (
        <aside className="sheet sheet-left">
          <UnplacedList onCollapse={() => setListOpen(false)} />
        </aside>
      ) : (
        <button className="sheet-chip" aria-expanded={false} onClick={() => setListOpen(true)}>
          Belum ditata <span className="count">{unplacedCount}</span>
        </button>
      )}

      {mode === 'tata' && shelfSelected && (
        <aside className="sheet sheet-right" aria-label="Pengaturan rak">
          <ShelfPanel />
        </aside>
      )}
      {mode === 'isi' && slotSelected && (
        <aside className="sheet sheet-right" aria-label="Panel slot">
          <SlotPanel />
        </aside>
      )}

      <div className="room-dock">
        <p className="caption">{caption}</p>
        <div role="toolbar" aria-label="Alat ruang" className="room-toolbar">
          <div className="segmented" role="radiogroup" aria-label="Mode">
            {MODES.map((m) => (
              <button
                key={m.mode}
                role="radio"
                aria-checked={mode === m.mode}
                title={m.hint}
                className={mode === m.mode ? 'active' : ''}
                onClick={() => setMode(m.mode)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <span className="divider" aria-hidden />
          <AddShelfMenu />
          <RoomSettings />
        </div>
      </div>
    </div>
  );
}
