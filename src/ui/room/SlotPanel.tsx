import { booksInSlot, slotUsage } from '../../domain/placement';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { bookLabel } from '../common/labels';

export function SlotPanel() {
  const slot = useUiStore((s) => s.selectedSlot);
  const checked = useUiStore((s) => s.checkedBookIds);
  const clearChecked = useUiStore((s) => s.clearChecked);
  const focusShelf = useUiStore((s) => s.focusShelf);
  const books = useDataStore((s) => s.books);
  const shelf = useDataStore((s) => s.shelves.find((x) => x.id === slot?.shelfId));
  const { placeBooks, unplaceBooks, moveInSlot } = useDataStore.getState();

  const valid = slot && shelf && slot.row < shelf.rowHeightsCm.length && slot.col < shelf.colWidthsCm.length;
  if (!valid) {
    return (
      <div className="panel-empty">
        <p>Klik salah satu slot rak di ruang 3D untuk mengisinya.</p>
        {checked.length > 0 && <p className="hint">{checked.length} buku dipilih dan siap ditaruh.</p>}
      </div>
    );
  }

  const list = booksInSlot(books, slot);
  const usage = slotUsage(books, shelf, slot.row, slot.col);
  const pct = Math.min(100, (usage.usedCm / usage.capacityCm) * 100);
  const title = `${shelf.name} · Tingkat ${slot.row + 1} · Kolom ${slot.col + 1}`;

  return (
    <section aria-label={title} className="slot-panel">
      <h3>{title}</h3>
      <div className={usage.overflow ? 'capacity over' : 'capacity'} aria-hidden>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="hint">
        {usage.usedCm} / {usage.capacityCm} cm terisi · {list.length} buku
      </p>
      {usage.overflow && <p className="warn">Meluap: sebagian buku tidak muat dan tidak tampil di 3D.</p>}
      {usage.tooTall && <p className="warn">Ada buku lebih tinggi dari tingkat ini.</p>}

      <div className="row">
        <button
          className="primary grow"
          disabled={checked.length === 0}
          onClick={async () => {
            const ids = checked;
            clearChecked();
            await placeBooks(ids, slot);
          }}
        >
          Taruh di slot ini ({checked.length})
        </button>
        <button onClick={() => focusShelf(shelf.id)}>Fokus ke rak</button>
      </div>

      <h4>Isi slot</h4>
      {list.length === 0 && <p className="hint">Slot ini masih kosong.</p>}
      <ol className="slot-list">
        {list.map((b, i) => (
          <li key={b.id} className="row">
            <span className="swatch" style={{ background: b.color }} />
            <span className="grow">{bookLabel(b)}</span>
            <button className="ghost" disabled={i === 0} aria-label={`Naikkan ${bookLabel(b)}`} onClick={() => void moveInSlot(b.id, i - 1)}>
              ↑
            </button>
            <button
              className="ghost"
              disabled={i === list.length - 1}
              aria-label={`Turunkan ${bookLabel(b)}`}
              onClick={() => void moveInSlot(b.id, i + 1)}
            >
              ↓
            </button>
            <button className="ghost" aria-label={`Keluarkan ${bookLabel(b)}`} onClick={() => void unplaceBooks([b.id])}>
              Keluarkan
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
