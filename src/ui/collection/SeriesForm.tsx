import { useState, type FormEvent } from 'react';
import type { BookType } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';

export function SeriesForm({ onDone }: { onDone(): void }) {
  const addSeries = useDataStore((s) => s.addSeries);
  const [series, setSeries] = useState('');
  const [type, setType] = useState<BookType>('komik');
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('1');
  const [author, setAuthor] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await addSeries({ series, type, from: Number(from), to: Number(to), author });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form aria-label="Tambah berseri" className="card form" onSubmit={submit}>
      <h3>Tambah berseri</h3>
      <label className="field">
        <span>Nama seri</span>
        <input value={series} onChange={(e) => setSeries(e.target.value)} autoFocus />
      </label>
      <label className="field">
        <span>Jenis</span>
        <select value={type} onChange={(e) => setType(e.target.value as BookType)}>
          <option value="komik">Komik</option>
          <option value="buku">Buku</option>
        </select>
      </label>
      <div className="row">
        <label className="field">
          <span>Dari volume</span>
          <input type="number" min={1} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>Sampai volume</span>
          <input type="number" min={1} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Penulis (opsional)</span>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="row end">
        <button type="button" onClick={onDone}>
          Batal
        </button>
        <button type="submit" className="primary">
          Simpan
        </button>
      </div>
    </form>
  );
}
