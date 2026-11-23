import { useState } from 'react';
import { countBooksOutside } from '../../domain/placement';
import { DIM_MAX_CM, DIM_MIN_CM, MAX_ROWS_COLS, SHELF_PRESETS, shelfSize, snapRotation } from '../../domain/shelves';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { NumberField } from '../common/NumberField';

type Pending =
  | { kind: 'resize'; rows: number; cols: number; count: number }
  | { kind: 'delete'; count: number }
  | null;

export function ShelfPanel() {
  const selectedId = useUiStore((s) => s.selectedShelfId);
  const selectShelf = useUiStore((s) => s.selectShelf);
  const shelf = useDataStore((s) => s.shelves.find((x) => x.id === selectedId));
  const books = useDataStore((s) => s.books);
  const { updateShelf, resizeShelf, duplicateShelf, deleteShelf } = useDataStore.getState();
  const [pending, setPending] = useState<Pending>(null);
  const [resetKey, setResetKey] = useState(0);

  if (!shelf) {
    return (
      <div className="panel-empty">
        <p>Pilih rak di ruang 3D untuk mengatur bentuk dan letaknya, atau tambahkan rak baru.</p>
      </div>
    );
  }

  const rows = shelf.rowHeightsCm.length;
  const cols = shelf.colWidthsCm.length;
  const size = shelfSize(shelf);

  const requestResize = (r: number, c: number) => {
    const count = countBooksOutside(books, shelf.id, r, c);
    if (count > 0) setPending({ kind: 'resize', rows: r, cols: c, count });
    else void resizeShelf(shelf.id, r, c);
  };

  const cancel = () => {
    setPending(null);
    setResetKey((k) => k + 1);
  };

  const confirm = async () => {
    const p = pending;
    setPending(null);
    if (p?.kind === 'resize') await resizeShelf(shelf.id, p.rows, p.cols);
    if (p?.kind === 'delete') {
      selectShelf(null);
      await deleteShelf(shelf.id);
    }
  };

  const setList = (key: 'rowHeightsCm' | 'colWidthsCm', i: number, v: number) => {
    const list = [...shelf[key]];
    list[i] = v;
    void updateShelf(shelf.id, { [key]: list });
  };

  return (
    <div className="shelf-panel" key={`${shelf.id}-${resetKey}`}>
      <label className="field">
        <span>Nama rak</span>
        <input
          defaultValue={shelf.name}
          onBlur={(e) => e.target.value.trim() && void updateShelf(shelf.id, { name: e.target.value.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>
      <p className="meta">
        {SHELF_PRESETS[shelf.model].label} · {Math.round(size.width)} × {Math.round(size.height)} × {size.depth} cm
      </p>

      <h4>Letak</h4>
      <div className="row">
        <button aria-label="Putar kiri 15°" onClick={() => void updateShelf(shelf.id, { rotationY: snapRotation(shelf.rotationY - 15) })}>
          ⟲
        </button>
        <NumberField label="Rotasi" value={shelf.rotationY} min={0} max={359} suffix="°" onChange={(v) => void updateShelf(shelf.id, { rotationY: v })} />
        <button aria-label="Putar kanan 15°" onClick={() => void updateShelf(shelf.id, { rotationY: snapRotation(shelf.rotationY + 15) })}>
          ⟳
        </button>
      </div>
      {shelf.model === 'dinding' && (
        <NumberField label="Ketinggian dari lantai" value={shelf.elevationCm} min={0} max={250} suffix="cm" onChange={(v) => void updateShelf(shelf.id, { elevationCm: v })} />
      )}

      <h4>Bentuk</h4>
      <div className="row">
        <NumberField label="Jumlah tingkat" value={rows} min={1} max={MAX_ROWS_COLS} onChange={(v) => requestResize(v, cols)} />
        <NumberField label="Jumlah kolom" value={cols} min={1} max={MAX_ROWS_COLS} onChange={(v) => requestResize(rows, v)} />
      </div>
      <div className="row">
        <NumberField label="Kedalaman" value={shelf.depthCm} min={DIM_MIN_CM} max={DIM_MAX_CM} suffix="cm" onChange={(v) => void updateShelf(shelf.id, { depthCm: v })} />
        <label className="field">
          <span>Warna kayu</span>
          <input type="color" value={shelf.color} onChange={(e) => void updateShelf(shelf.id, { color: e.target.value })} />
        </label>
      </div>

      <h4>Tinggi tiap tingkat</h4>
      <p className="hint">Tingkat 1 = paling bawah</p>
      <div className="dims">
        {shelf.rowHeightsCm.map((h, i) => (
          <NumberField key={i} label={`Tingkat ${i + 1}`} value={h} min={DIM_MIN_CM} max={DIM_MAX_CM} suffix="cm" onChange={(v) => setList('rowHeightsCm', i, v)} />
        ))}
      </div>

      <h4>Lebar tiap kolom</h4>
      <p className="hint">Kolom 1 = paling kiri (dilihat dari depan)</p>
      <div className="dims">
        {shelf.colWidthsCm.map((w, i) => (
          <NumberField key={i} label={`Kolom ${i + 1}`} value={w} min={DIM_MIN_CM} max={DIM_MAX_CM} suffix="cm" onChange={(v) => setList('colWidthsCm', i, v)} />
        ))}
      </div>

      <div className="row panel-actions">
        <button
          onClick={async () => {
            const id = await duplicateShelf(shelf.id);
            selectShelf(id);
          }}
        >
          Duplikat
        </button>
        <span className="spacer" />
        <button className="danger" onClick={() => setPending({ kind: 'delete', count: countBooksOutside(books, shelf.id, 0, 0) })}>
          Hapus rak
        </button>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'delete' ? `Hapus ${shelf.name}?` : 'Kurangi ukuran rak?'}
        message={
          pending && pending.count > 0
            ? `${pending.count} buku akan dikembalikan ke Belum ditata. Bukunya tidak dihapus.`
            : 'Rak ini kosong.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Hapus' : 'Kurangi'}
        danger
        onCancel={cancel}
        onConfirm={confirm}
      />
    </div>
  );
}
