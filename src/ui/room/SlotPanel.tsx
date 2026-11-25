import { ArrowDown, ArrowLeftRight, ArrowUp, Crosshair, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { booksInSlot, slotUsage } from '../../domain/placement';
import { canDoubleStack } from '../../domain/shelves';
import type { Layer } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { bookLabel } from '../common/labels';

export function SlotPanel() {
  const slot = useUiStore((s) => s.selectedSlot);
  const checked = useUiStore((s) => s.checkedBookIds);
  const clearChecked = useUiStore((s) => s.clearChecked);
  const focusShelf = useUiStore((s) => s.focusShelf);
  const chosenLayer = useUiStore((s) => s.slotLayer);
  const setSlotLayer = useUiStore((s) => s.setSlotLayer);
  const books = useDataStore((s) => s.books);
  const shelf = useDataStore((s) => s.shelves.find((x) => x.id === slot?.shelfId));
  const { placeBooks, unplaceBooks, moveInSlot, moveToLayer } = useDataStore.getState();
  const [placing, setPlacing] = useState(false);

  const valid = slot && shelf && slot.row < shelf.rowHeightsCm.length && slot.col < shelf.colWidthsCm[slot.row].length;
  if (!valid) {
    return (
      <div className="panel-empty">
        <p>Klik salah satu slot rak di ruang 3D untuk mengisinya.</p>
        {checked.length > 0 && <p className="hint">{checked.length} buku dipilih dan siap ditaruh.</p>}
      </div>
    );
  }

  const double = canDoubleStack(shelf);
  // A single-layer shelf only has the front layer, whatever was chosen before.
  const layer: Layer = double ? chosenLayer : 'depan';
  const other: Layer = layer === 'depan' ? 'belakang' : 'depan';
  const list = booksInSlot(books, slot, layer);
  const otherCount = booksInSlot(books, slot, other).length;
  const usage = slotUsage(books, shelf, slot.row, slot.col, layer);
  const pct = Math.min(100, (usage.usedCm / usage.capacityCm) * 100);
  const title = `${shelf.name} · Tingkat ${slot.row + 1} · Kolom ${slot.col + 1}`;

  return (
    <section aria-label={title} className="slot-panel">
      <h3>{title}</h3>
      {double && (
        <div className="row">
          <ToggleGroup
            type="single"
            role="radiogroup"
            aria-label="Lapis"
            spacing={0}
            value={layer}
            onValueChange={(v) => v && setSlotLayer(v as Layer)}
            className="rounded-full bg-muted p-0.5"
          >
            {(['depan', 'belakang'] as const).map((l) => (
              <ToggleGroupItem
                key={l}
                value={l}
                size="sm"
                className="rounded-full! px-4! text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                {l === 'depan' ? 'Depan' : 'Belakang'}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="hint">
            {other === 'depan' ? 'Depan' : 'Belakang'}: {otherCount} buku
          </span>
        </div>
      )}
      <div className={usage.overflow ? 'capacity over' : 'capacity'} aria-hidden>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="hint">
        {usage.usedCm} / {usage.capacityCm} cm terisi · {list.length} buku
      </p>
      {usage.overflow && <p className="warn">Meluap: sebagian buku tidak muat dan tidak tampil di 3D.</p>}
      {usage.tooTall && (
        <p className="warn">
          {layer === 'belakang'
            ? 'Ada buku lebih tinggi dari ruang di atas penyangga. Turunkan penyangga di panel rak.'
            : 'Ada buku lebih tinggi dari tingkat ini.'}
        </p>
      )}

      <div className="row">
        <Button
          className="grow"
          disabled={checked.length === 0 || placing}
          onClick={async () => {
            setPlacing(true);
            try {
              await placeBooks(checked, slot, layer);
              clearChecked();
            } finally {
              setPlacing(false);
            }
          }}
        >
          {placing ? 'Menaruh…' : double ? `Taruh di lapis ${layer} (${checked.length})` : `Taruh di slot ini (${checked.length})`}
        </Button>
        <Button variant="ghost" onClick={() => focusShelf(shelf.id)}>
          <Crosshair data-icon="inline-start" aria-hidden />
          Fokus ke rak
        </Button>
      </div>

      <h4>{double ? `Isi lapis ${layer}` : 'Isi slot'}</h4>
      {list.length === 0 && <p className="hint">{double ? `Lapis ${layer} masih kosong.` : 'Slot ini masih kosong.'}</p>}
      <ol className="slot-list">
        {list.map((b, i) => (
          <li key={b.id} className="row">
            <span className="swatch" style={{ background: b.color }} />
            <span className="grow">{bookLabel(b)}</span>
            <Button variant="ghost" size="icon-sm" disabled={i === 0} aria-label={`Naikkan ${bookLabel(b)}`} onClick={() => void moveInSlot(b.id, i - 1)}>
              <ArrowUp aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={i === list.length - 1}
              aria-label={`Turunkan ${bookLabel(b)}`}
              onClick={() => void moveInSlot(b.id, i + 1)}
            >
              <ArrowDown aria-hidden />
            </Button>
            {double && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Pindah ${bookLabel(b)} ke ${other}`}
                title={`Pindah ke lapis ${other}`}
                onClick={() => void moveToLayer(b.id, other)}
              >
                <ArrowLeftRight aria-hidden />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Keluarkan ${bookLabel(b)}`}
              title="Keluarkan dari slot"
              onClick={() => void unplaceBooks([b.id])}
            >
              <X aria-hidden />
            </Button>
          </li>
        ))}
      </ol>
    </section>
  );
}
