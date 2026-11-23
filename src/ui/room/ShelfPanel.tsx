import { useState } from 'react';
import { countBooksOutside } from '../../domain/placement';
import {
  DIM_MAX_CM,
  DIM_MIN_CM,
  MAX_INNER_WIDTH_CM,
  MAX_ROWS_COLS,
  SHELF_PRESETS,
  setColumnCount,
  setColumnWidth,
  setInnerWidth,
  setRowCount,
  shelfSize,
  snapRotation,
} from '../../domain/shelves';
import type { Shelf } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { NumberField } from '../common/NumberField';

type Pending = { kind: 'reshape'; shape: Shelf; count: number } | { kind: 'delete'; count: number } | null;

export function ShelfPanel() {
  const selectedId = useUiStore((s) => s.selectedShelfId);
  const selectShelf = useUiStore((s) => s.selectShelf);
  const shelf = useDataStore((s) => s.shelves.find((x) => x.id === selectedId));
  const books = useDataStore((s) => s.books);
  const { updateShelf, reshapeShelf, duplicateShelf, deleteShelf } = useDataStore.getState();
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
  const size = shelfSize(shelf);
  const board = shelf.boardThicknessCm;

  /** Every shape edit goes through here: books that would lose their slot need a confirmation first. */
  const reshape = (shape: Shelf) => {
    const count = countBooksOutside(books, shape);
    if (count > 0) setPending({ kind: 'reshape', shape, count });
    else void reshapeShelf(shelf.id, shape);
  };

  const cancel = () => {
    setPending(null);
    setResetKey((k) => k + 1);
  };

  const confirm = async () => {
    const p = pending;
    setPending(null);
    if (p?.kind === 'reshape') await reshapeShelf(shelf.id, p.shape);
    if (p?.kind === 'delete') {
      selectShelf(null);
      await deleteShelf(shelf.id);
    }
  };

  const setRowHeight = (row: number, v: number) => {
    const heights = [...shelf.rowHeightsCm];
    heights[row] = v;
    reshape({ ...shelf, rowHeightsCm: heights });
  };

  // Show the top row first, like the shelf itself.
  const rowOrder = shelf.rowHeightsCm.map((_, i) => i).reverse();

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
        <NumberField
          label="Lebar rak"
          value={shelf.innerWidthCm + 2 * board}
          min={DIM_MIN_CM + 2 * board}
          max={MAX_INNER_WIDTH_CM + 2 * board}
          suffix="cm"
          onChange={(v) => reshape(setInnerWidth(shelf, v - 2 * board))}
        />
        <NumberField label="Jumlah tingkat" value={rows} min={1} max={MAX_ROWS_COLS} onChange={(v) => reshape(setRowCount(shelf, v))} />
      </div>
      <div className="row">
        <NumberField label="Kedalaman" value={shelf.depthCm} min={DIM_MIN_CM} max={DIM_MAX_CM} suffix="cm" onChange={(v) => void updateShelf(shelf.id, { depthCm: v })} />
        <label className="field">
          <span>Warna kayu</span>
          <input type="color" value={shelf.color} onChange={(e) => void updateShelf(shelf.id, { color: e.target.value })} />
        </label>
      </div>

      <h4>Tingkat</h4>
      <p className="hint">Tingkat 1 = paling bawah. Kolom 1 = paling kiri (dilihat dari depan). Kolom terakhir menyesuaikan otomatis.</p>
      {rowOrder.map((r) => {
        const cols = shelf.colWidthsCm[r];
        const n = r + 1;
        return (
          <fieldset key={r} className="tier" aria-label={`Tingkat ${n}`}>
            <legend>Tingkat {n}</legend>
            <div className="row">
              <NumberField label={`Tinggi tingkat ${n}`} value={shelf.rowHeightsCm[r]} min={DIM_MIN_CM} max={DIM_MAX_CM} suffix="cm" onChange={(v) => setRowHeight(r, v)} />
              <NumberField label={`Jumlah kolom tingkat ${n}`} value={cols.length} min={1} max={MAX_ROWS_COLS} onChange={(v) => reshape(setColumnCount(shelf, r, v))} />
            </div>
            {cols.length > 1 && (
              <div className="dims">
                {cols.slice(0, -1).map((w, c) => (
                  <NumberField
                    key={c}
                    label={`Tingkat ${n} kolom ${c + 1}`}
                    value={w}
                    min={DIM_MIN_CM}
                    max={DIM_MAX_CM}
                    suffix="cm"
                    onChange={(v) => reshape(setColumnWidth(shelf, r, c, v))}
                  />
                ))}
                <p className="auto-col">
                  Kolom {cols.length}: {cols[cols.length - 1]} cm (otomatis)
                </p>
              </div>
            )}
          </fieldset>
        );
      })}

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
        <button
          className="danger"
          onClick={() => setPending({ kind: 'delete', count: countBooksOutside(books, { id: shelf.id, rowHeightsCm: [], colWidthsCm: [] }) })}
        >
          Hapus rak
        </button>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'delete' ? `Hapus ${shelf.name}?` : 'Ubah bentuk rak?'}
        message={pending && pending.count > 0 ? `${pending.count} buku akan dikembalikan ke Belum ditata. Bukunya tidak dihapus.` : 'Rak ini kosong.'}
        confirmLabel={pending?.kind === 'delete' ? 'Hapus' : 'Kurangi'}
        danger
        onCancel={cancel}
        onConfirm={confirm}
      />
    </div>
  );
}
