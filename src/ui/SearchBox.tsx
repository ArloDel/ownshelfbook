import { useId, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { searchBooks } from '../domain/search';
import type { Book } from '../domain/types';
import { useDataStore } from '../store/dataStore';
import { useUiStore } from '../store/uiStore';
import { bookLabel, placementLabel } from './common/labels';

const HIGHLIGHT_MS = 3000;

export function SearchBox() {
  const books = useDataStore((s) => s.books);
  const shelves = useDataStore((s) => s.shelves);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const results = useMemo(() => searchBooks(books, query), [books, query]);

  function choose(b: Book) {
    const ui = useUiStore.getState();
    ui.setPage('room');
    if (b.placement) {
      ui.setMode('isi');
      ui.selectSlot({ shelfId: b.placement.shelfId, row: b.placement.row, col: b.placement.col });
      ui.focusBook(b.id, b.placement.shelfId);
    } else {
      ui.setUnplacedFilter(bookLabel(b));
      ui.focusBook(b.id, null);
    }
    setOpen(false);
    setQuery('');
    setTimeout(() => {
      if (useUiStore.getState().highlightBookId === b.id) useUiStore.getState().focusBook(null, null);
    }, HIGHLIGHT_MS);
  }

  const show = open && query.trim() !== '';

  return (
    <div className="search">
      <Input
        type="search"
        className="border-transparent bg-muted focus-visible:bg-card"
        role="combobox"
        aria-label="Cari buku"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && results[active] ? `${listId}-${active}` : undefined}
        placeholder="Cari judul, seri, penulis… (mis. naruto 34)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((i) => Math.min(results.length - 1, i + 1));
          else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1));
          else if (e.key === 'Enter' && results[active]) choose(results[active]);
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {show && (
        <ul role="listbox" id={listId} className="search-results">
          {results.length === 0 && <li className="hint">Tidak ditemukan.</li>}
          {results.map((b, i) => (
            <li
              key={b.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(b)}
            >
              <span className="swatch" style={{ background: b.color }} />
              <span className="grow">{bookLabel(b)}</span>
              <small>{placementLabel(b, shelves)}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
