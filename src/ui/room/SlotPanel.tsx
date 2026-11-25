import { ArrowDown, ArrowLeftRight, ArrowUp, Crosshair, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { booksInSlot, hasSlotRight, slotUsage } from '../../domain/placement';
import { canDoubleStack } from '../../domain/shelves';
import type { Book, Layer } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { bookLabel } from '../common/labels';

export function SlotPanel() {
  const slot = useUiStore((s) => s.selectedSlot);
  const checked = useUiStore((s) => s.checkedBookIds);
  const setChecked = useUiStore((s) => s.setChecked);
  const focusShelf = useUiStore((s) => s.focusShelf);
  const chosenLayer = useUiStore((s) => s.slotLayer);
  const setSlotLayer = useUiStore((s) => s.setSlotLayer);
  const books = useDataStore((s) => s.books);
  const shelf = useDataStore((s) => s.shelves.find((x) => x.id === slot?.shelfId));
  const { fillSlot, flowToRight, unplaceBooks, moveInSlot, moveToLayer, moveBooksToLayer } = useDataStore.getState();
  const [placing, setPlacing] = useState(false);
  // Books that did not fit the last time Taruh ran in this slot, and the ways still open for them.
  const [leftover, setLeftover] = useState<Leftover | null>(null);

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
  // One selection for the whole room: books picked here can be acted on here, or carried to another slot.
  const checkedSet = new Set(checked);
  const hereIds = new Set(list.map((b) => b.id));
  const pickedHere = list.filter((b) => checkedSet.has(b.id)).map((b) => b.id);
  const toPlace = checked.filter((id) => !hereIds.has(id));
  const runs = seriesRuns(list);
  const slotKey = `${slot.shelfId}|${slot.row}|${slot.col}`;
  const ask = leftover?.slotKey === slotKey ? leftover : null;
  const canOther = !!ask && double && !ask.triedOther;
  const canSide = !!ask && !ask.triedSide && hasSlotRight(shelf, slot);
  /** Place the leftover somewhere else, keep whatever still does not fit for the next question. */
  const resolve = async (next: Partial<Leftover>, place: (ids: string[]) => Promise<string[]>) => {
    if (!ask) return;
    const rest = await place(ask.rest);
    drop(ask.rest.filter((id) => !rest.includes(id)));
    setLeftover(rest.length ? { ...ask, ...next, rest } : null);
  };
  const setPicked = (ids: string[], on: boolean) => {
    const rest = checked.filter((id) => !ids.includes(id));
    setChecked(on ? [...rest, ...ids] : rest);
  };
  // Read the selection fresh: this runs after an await, when `checked` may be stale.
  const drop = (ids: string[]) => setChecked(useUiStore.getState().checkedBookIds.filter((id) => !ids.includes(id)));
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
          disabled={toPlace.length === 0 || placing}
          onClick={async () => {
            setPlacing(true);
            try {
              const rest = await fillSlot(toPlace, slot, layer);
              drop(toPlace.filter((id) => !rest.includes(id)));
              setLeftover(rest.length ? { slotKey, rest, last: layer, triedOther: false, triedSide: false } : null);
            } finally {
              setPlacing(false);
            }
          }}
        >
          {placing ? 'Menaruh…' : double ? `Taruh di lapis ${layer} (${toPlace.length})` : `Taruh di slot ini (${toPlace.length})`}
        </Button>
        <Button variant="ghost" onClick={() => focusShelf(shelf.id)}>
          <Crosshair data-icon="inline-start" aria-hidden />
          Fokus ke rak
        </Button>
      </div>

      {ask && (
        <section aria-label="Sisa buku" role="region" className="leftover">
          <p>
            {canOther || canSide
              ? `Lapis ${ask.last} penuh. ${ask.rest.length} buku belum tertaruh.`
              : `${ask.rest.length} buku tidak muat di tingkat ini.`}
          </p>
          <div className="row">
            {canOther && (
              <Button size="sm" variant="outline" onClick={() => void resolve({ triedOther: true, last: other }, (ids) => fillSlot(ids, slot, other))}>
                Ke lapis {other}
              </Button>
            )}
            {canSide && (
              <Button size="sm" variant="outline" onClick={() => void resolve({ triedSide: true }, (ids) => flowToRight(ids, slot, layer))}>
                Ke slot sebelah
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setLeftover(null)}>
              Biarkan
            </Button>
          </div>
        </section>
      )}

      <h4>{double ? `Isi lapis ${layer}` : 'Isi slot'}</h4>
      {list.length === 0 && <p className="hint">{double ? `Lapis ${layer} masih kosong.` : 'Slot ini masih kosong.'}</p>}
      {pickedHere.length > 0 && (
        <section aria-label="Buku dipilih di slot" className="row checked-bar">
          <span className="grow">{pickedHere.length} dipilih</span>
          {pickedHere.length < list.length && (
            <Button variant="ghost" size="sm" onClick={() => setPicked(list.map((b) => b.id), true)}>
              Pilih semua
            </Button>
          )}
          {double && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await moveBooksToLayer(pickedHere, other);
                drop(pickedHere);
              }}
            >
              Pindah ke {other}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={async () => {
              await unplaceBooks(pickedHere);
              drop(pickedHere);
            }}
          >
            Keluarkan
          </Button>
          <Button variant="ghost" size="sm" onClick={() => drop(pickedHere)}>
            Batal
          </Button>
        </section>
      )}
      {runs.map((run) => {
        const ids = run.books.map((b) => b.id);
        const count = ids.filter((id) => checkedSet.has(id)).length;
        return (
          <div key={run.key} className="slot-run">
            <label className="row group-head">
              <Checkbox
                aria-label={`Pilih semua ${run.name}`}
                checked={count === ids.length ? true : count > 0 ? 'indeterminate' : false}
                onCheckedChange={(c) => setPicked(ids, c === true)}
              />
              <strong className="grow">{run.name}</strong>
              <small>{ids.length}</small>
            </label>
            <ol className="slot-list">
              {run.books.map((b) => {
                const i = run.start + run.books.indexOf(b);
                return (
                  <li key={b.id} className="row">
                    <Checkbox aria-label={`Pilih ${bookLabel(b)}`} checked={checkedSet.has(b.id)} onCheckedChange={(c) => setPicked([b.id], c === true)} />
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
                );
              })}
            </ol>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Books in shelf order, split wherever the series changes. Keeping shelf order (not
 * grouping a series together) keeps the up/down buttons meaning what they show.
 */
function seriesRuns(list: Book[]): { key: string; name: string; start: number; books: Book[] }[] {
  const runs: { key: string; name: string; start: number; books: Book[] }[] = [];
  list.forEach((b, i) => {
    const name = b.series ?? b.title;
    const last = runs[runs.length - 1];
    if (last && last.name === name) last.books.push(b);
    else runs.push({ key: `${name}-${i}`, name, start: i, books: [b] });
  });
  return runs;
}

interface Leftover {
  slotKey: string;
  rest: string[];
  /** The layer that filled up last, named in the question. */
  last: Layer;
  triedOther: boolean;
  triedSide: boolean;
}
