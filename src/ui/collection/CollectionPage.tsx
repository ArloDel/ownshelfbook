import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import type { Book, BookType } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { bookLabel, placementLabel } from '../common/labels';
import { BookForm } from './BookForm';
import { SeriesForm } from './SeriesForm';

type TypeFilter = 'semua' | BookType;
type StatusFilter = 'semua' | 'ditata' | 'belum';
type Panel = { kind: 'add' } | { kind: 'series' } | { kind: 'edit'; book: Book } | null;

export function groupBooks(books: Book[]): [string, Book[]][] {
  const groups = new Map<string, Book[]>();
  for (const b of books) {
    const key = b.series ?? b.title;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.volume ?? 0) - (b.volume ?? 0) || a.title.localeCompare(b.title));
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'id'));
}

export function CollectionPage() {
  const books = useDataStore((s) => s.books);
  const shelves = useDataStore((s) => s.shelves);
  const deleteBooks = useDataStore((s) => s.deleteBooks);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('semua');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua');
  const [panel, setPanel] = useState<Panel>(null);
  const [toDelete, setToDelete] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const filtered = books.filter(
      (b) =>
        (typeFilter === 'semua' || b.type === typeFilter) &&
        (statusFilter === 'semua' || (statusFilter === 'ditata') === (b.placement !== null)),
    );
    return groupBooks(filtered);
  }, [books, typeFilter, statusFilter]);

  // Only books on screen count as selected: a filter never hides a book that is about to be deleted.
  const shownIds = useMemo(() => groups.flatMap(([, list]) => list.map((b) => b.id)), [groups]);
  const selected = shownIds.filter((id) => picked.has(id));

  const toggle = (ids: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  return (
    <div className="collection">
      <div className="toolbar">
        <h2>{books.length} buku</h2>
        <label className="field field-inline">
          <span>Jenis</span>
          <NativeSelect size="sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="semua">Semua</option>
            <option value="komik">Komik</option>
            <option value="buku">Buku</option>
          </NativeSelect>
        </label>
        <label className="field field-inline">
          <span>Status</span>
          <NativeSelect size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="semua">Semua</option>
            <option value="ditata">Ditata</option>
            <option value="belum">Belum ditata</option>
          </NativeSelect>
        </label>
        <span className="spacer" />
        <Button variant="ghost" onClick={() => setPanel({ kind: 'add' })}>
          Tambah buku
        </Button>
        <Button onClick={() => setPanel({ kind: 'series' })}>Tambah berseri</Button>
      </div>

      {panel?.kind === 'add' && <BookForm onDone={() => setPanel(null)} />}
      {panel?.kind === 'series' && <SeriesForm onDone={() => setPanel(null)} />}
      {panel?.kind === 'edit' && <BookForm key={panel.book.id} book={panel.book} onDone={() => setPanel(null)} />}

      {books.length === 0 && !panel && (
        <p className="empty">
          Koleksimu masih kosong. Mulai dengan &ldquo;Tambah berseri&rdquo; untuk memasukkan banyak volume sekaligus.
        </p>
      )}

      {selected.length > 0 && (
        <section aria-label="Buku dipilih" className="row bulk-bar">
          <span className="grow">{selected.length} dipilih</span>
          {selected.length < shownIds.length && (
            <Button variant="ghost" size="sm" onClick={() => toggle(shownIds, true)}>
              Pilih semua yang tampil
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
            Batal pilih
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setToDelete(selected)}>
            Hapus {selected.length} buku
          </Button>
        </section>
      )}

      {groups.map(([name, list]) => {
        const ids = list.map((b) => b.id);
        const count = ids.filter((id) => picked.has(id)).length;
        return (
          <section key={name} aria-label={name} className="group">
            <header className="row">
              <Checkbox
                aria-label={`Pilih semua ${name}`}
                checked={count === ids.length ? true : count > 0 ? 'indeterminate' : false}
                onCheckedChange={(c) => toggle(ids, c === true)}
              />
              <h3>{name}</h3>
              <small>{list.length} buku</small>
            </header>
            <ul>
              {list.map((b) => (
                <li key={b.id} className="book-row">
                  <Checkbox
                    aria-label={`Pilih ${bookLabel(b)}`}
                    checked={picked.has(b.id)}
                    onCheckedChange={(c) => toggle([b.id], c === true)}
                  />
                  <span className="swatch" style={{ background: b.color }} />
                  <span className="grow">{bookLabel(b)}</span>
                  <span className="tag">{b.type === 'komik' ? 'Komik' : 'Buku'}</span>
                  <span className={b.placement ? 'status placed' : 'status'}>{placementLabel(b, shelves)}</span>
                  <span className="row-actions">
                    <Button variant="ghost" size="sm" onClick={() => setPanel({ kind: 'edit', book: b })} aria-label={`Edit ${bookLabel(b)}`}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setToDelete([b.id])}
                      aria-label={`Hapus ${bookLabel(b)}`}
                    >
                      Hapus
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus buku"
        message={`Hapus ${toDelete?.length ?? 0} buku? Buku yang sudah ditata juga hilang dari rak.`}
        confirmLabel="Hapus"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const ids = toDelete ?? [];
          setToDelete(null);
          await deleteBooks(ids);
          toggle(ids, false);
        }}
      />
    </div>
  );
}
