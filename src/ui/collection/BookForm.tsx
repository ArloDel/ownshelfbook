import { useState, type FormEvent } from 'react';
import type { Book, BookType } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';

export function BookForm({ book, onDone }: { book?: Book; onDone(): void }) {
  const addBook = useDataStore((s) => s.addBook);
  const updateBook = useDataStore((s) => s.updateBook);
  const editing = !!book;
  const [title, setTitle] = useState(book?.title ?? '');
  const [series, setSeries] = useState(book?.series ?? '');
  const [volume, setVolume] = useState(book?.volume?.toString() ?? '');
  const [type, setType] = useState<BookType>(book?.type ?? 'buku');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [notes, setNotes] = useState(book?.notes ?? '');
  const [color, setColor] = useState(book?.color ?? '#8a6d4b');
  const [thickness, setThickness] = useState(book?.thicknessCm.toString() ?? '');
  const [height, setHeight] = useState(book?.heightCm.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const name = editing ? 'Edit buku' : 'Tambah buku';

  async function submit(e: FormEvent) {
    e.preventDefault();
    const vol = volume.trim() === '' ? undefined : Number(volume);
    if (vol !== undefined && (!Number.isInteger(vol) || vol < 0)) {
      setError('Volume harus bilangan bulat');
      return;
    }
    setSaving(true);
    try {
      if (!editing) {
        await addBook({ title, series, volume: vol, type, author, notes });
      } else {
        if (!title.trim()) throw new Error('Judul wajib diisi');
        const t = Number(thickness);
        const h = Number(height);
        if (!(t > 0) || !(h > 0)) throw new Error('Tebal dan tinggi harus lebih dari 0');
        await updateBook(book.id, {
          title: title.trim(),
          series: series.trim() || undefined,
          volume: vol,
          type,
          author: author.trim() || undefined,
          notes: notes.trim() || undefined,
          color,
          thicknessCm: t,
          heightCm: h,
        });
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form aria-label={name} className="card form" onSubmit={submit}>
      <h3>{name}</h3>
      <label className="field">
        <span>Judul</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <div className="row">
        <label className="field grow">
          <span>Seri (opsional)</span>
          <input value={series} onChange={(e) => setSeries(e.target.value)} />
        </label>
        <label className="field">
          <span>Volume</span>
          <input type="number" min={0} value={volume} onChange={(e) => setVolume(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Jenis</span>
        <select value={type} onChange={(e) => setType(e.target.value as BookType)}>
          <option value="komik">Komik</option>
          <option value="buku">Buku</option>
        </select>
      </label>
      <label className="field">
        <span>Penulis (opsional)</span>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />
      </label>
      <label className="field">
        <span>Catatan (opsional)</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {editing && (
        <div className="row">
          <label className="field">
            <span>Warna punggung</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label className="field">
            <span>Tebal (cm)</span>
            <input type="number" step={0.1} min={0.1} value={thickness} onChange={(e) => setThickness(e.target.value)} />
          </label>
          <label className="field">
            <span>Tinggi (cm)</span>
            <input type="number" step={0.5} min={1} value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="row end">
        <button type="button" onClick={onDone}>
          Batal
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}
