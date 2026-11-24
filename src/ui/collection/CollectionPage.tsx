import { useMemo, useState } from 'react';
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
        <label className="field inline">
          <span>Jenis</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="semua">Semua</option>
            <option value="komik">Komik</option>
            <option value="buku">Buku</option>
          </select>
        </label>
        <label className="field inline">
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="semua">Semua</option>
            <option value="ditata">Ditata</option>
            <option value="belum">Belum ditata</option>
          </select>
        </label>
        <span className="spacer" />
        <button onClick={() => setPanel({ kind: 'add' })}>Tambah buku</button>
        <button className="primary" onClick={() => setPanel({ kind: 'series' })}>
          Tambah berseri
        </button>
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
            <button className="ghost" onClick={() => toggle(shownIds, true)}>
              Pilih semua yang tampil
            </button>
          )}
          <button className="ghost" onClick={() => setPicked(new Set())}>
            Batal pilih
          </button>
          <button className="danger" onClick={() => setToDelete(selected)}>
            Hapus {selected.length} buku
          </button>
        </section>
      )}

      {groups.map(([name, list]) => {
        const ids = list.map((b) => b.id);
        const count = ids.filter((id) => picked.has(id)).length;
        return (
          <section key={name} aria-label={name} className="group">
            <header className="row">
              <input
                type="checkbox"
                aria-label={`Pilih semua ${name}`}
                checked={count === ids.length}
                ref={(el) => {
                  if (el) el.indeterminate = count > 0 && count < ids.length;
                }}
                onChange={(e) => toggle(ids, e.target.checked)}
              />
              <h3>{name}</h3>
              <small>{list.length} buku</small>
            </header>
            <ul>
              {list.map((b) => (
                <li key={b.id} className="book-row">
                  <input
                    type="checkbox"
                    aria-label={`Pilih ${bookLabel(b)}`}
                    checked={picked.has(b.id)}
                    onChange={(e) => toggle([b.id], e.target.checked)}
                  />
                  <span className="swatch" style={{ background: b.color }} />
                  <span className="grow">{bookLabel(b)}</span>
                  <span className="tag">{b.type === 'komik' ? 'Komik' : 'Buku'}</span>
                  <span className={b.placement ? 'status placed' : 'status'}>{placementLabel(b, shelves)}</span>
                  <button className="ghost" onClick={() => setPanel({ kind: 'edit', book: b })} aria-label={`Edit ${bookLabel(b)}`}>
                    Edit
                  </button>
                  <button className="ghost" onClick={() => setToDelete([b.id])} aria-label={`Hapus ${bookLabel(b)}`}>
                    Hapus
                  </button>
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
