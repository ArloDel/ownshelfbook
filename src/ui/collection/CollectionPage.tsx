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

  const groups = useMemo(() => {
    const filtered = books.filter(
      (b) =>
        (typeFilter === 'semua' || b.type === typeFilter) &&
        (statusFilter === 'semua' || (statusFilter === 'ditata') === (b.placement !== null)),
    );
    return groupBooks(filtered);
  }, [books, typeFilter, statusFilter]);

  return (
    <div className="collection">
      <div className="toolbar">
        <h2>
          Koleksi <small>{books.length} buku</small>
        </h2>
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

      {groups.map(([name, list]) => (
        <section key={name} aria-label={name} className="group">
          <header className="row">
            <h3>{name}</h3>
            <small>{list.length} buku</small>
          </header>
          <ul>
            {list.map((b) => (
              <li key={b.id} className="book-row">
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
      ))}

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus buku"
        message={`Hapus ${toDelete?.length ?? 0} buku?`}
        confirmLabel="Hapus"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const ids = toDelete ?? [];
          setToDelete(null);
          await deleteBooks(ids);
        }}
      />
    </div>
  );
}
