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
  isi: 'Klik slot rak, lalu taruh buku dari daftar Belum ditata.',
};

export function RoomPage() {
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  return (
    <div className="room">
      <aside className="room-left">
        <UnplacedList />
      </aside>
      <section className="room-center">
        <div className="room-toolbar">
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
          <span className="hint grow">{HINTS[mode]}</span>
          <AddShelfMenu />
          <RoomSettings />
        </div>
        <div className="canvas-wrap">
          <Scene />
        </div>
      </section>
      <aside className="room-right">{mode === 'tata' ? <ShelfPanel /> : <SlotPanel />}</aside>
    </div>
  );
}
