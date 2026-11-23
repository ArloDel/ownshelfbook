import { useMemo } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { groupBooks } from '../collection/CollectionPage';
import { bookLabel } from '../common/labels';

export function UnplacedList() {
  const books = useDataStore((s) => s.books);
  const checked = useUiStore((s) => s.checkedBookIds);
  const toggleChecked = useUiStore((s) => s.toggleChecked);
  const setChecked = useUiStore((s) => s.setChecked);
  const filter = useUiStore((s) => s.unplacedFilter);
  const setFilter = useUiStore((s) => s.setUnplacedFilter);
  const highlight = useUiStore((s) => s.highlightBookId);

  const unplaced = useMemo(() => books.filter((b) => b.placement === null), [books]);
  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q ? unplaced.filter((b) => `${bookLabel(b)} ${b.series ?? ''} ${b.author ?? ''}`.toLowerCase().includes(q)) : unplaced;
    return groupBooks(list);
  }, [unplaced, filter]);
  const checkedSet = new Set(checked);

  const toggleGroup = (ids: string[], all: boolean) => {
    const rest = checked.filter((id) => !ids.includes(id));
    setChecked(all ? rest : [...rest, ...ids]);
  };

  return (
    <section aria-label="Belum ditata" className="unplaced">
      <header className="row">
        <h3 className="grow">Belum ditata</h3>
        <small>{unplaced.length}</small>
      </header>
      <input
        type="search"
        placeholder="Saring judul…"
        aria-label="Saring buku belum ditata"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {checked.length > 0 && (
        <div className="row checked-bar">
          <span className="grow">{checked.length} dipilih</span>
          <button className="ghost" onClick={() => setChecked([])}>
            Batal pilih
          </button>
        </div>
      )}
      {unplaced.length === 0 && <p className="hint">Semua buku sudah ditata.</p>}
      {groups.map(([name, list]) => {
        const ids = list.map((b) => b.id);
        const all = ids.every((id) => checkedSet.has(id));
        return (
          <div key={name} className="unplaced-group">
            <label className="row group-head">
              <input type="checkbox" checked={all} onChange={() => toggleGroup(ids, all)} aria-label={`Pilih semua ${name}`} />
              <strong className="grow">{name}</strong>
              <small>{list.length}</small>
            </label>
            <ul>
              {list.map((b) => (
                <li key={b.id} className={b.id === highlight ? 'highlight' : undefined}>
                  <label className="row">
                    <input type="checkbox" checked={checkedSet.has(b.id)} onChange={() => toggleChecked(b.id)} aria-label={bookLabel(b)} />
                    <span className="swatch" style={{ background: b.color }} />
                    <span>{bookLabel(b)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
