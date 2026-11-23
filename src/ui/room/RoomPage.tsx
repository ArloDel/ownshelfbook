import { useUiStore, type Mode } from '../../store/uiStore';
import { Scene } from '../scene/Scene';

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: 'tata', label: 'Tata', hint: 'Atur letak dan bentuk rak' },
  { mode: 'isi', label: 'Isi', hint: 'Taruh buku ke slot rak' },
];

export function RoomPage({ left, right, toolbar }: { left?: React.ReactNode; right?: React.ReactNode; toolbar?: React.ReactNode }) {
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  return (
    <div className="room">
      <aside className="room-left">{left}</aside>
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
          {toolbar}
        </div>
        <div className="canvas-wrap">
          <Scene />
        </div>
      </section>
      <aside className="room-right">{right}</aside>
    </div>
  );
}
