import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useState, type FormEvent } from 'react';
import type { BookType } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';
import { ThicknessField, useThickness } from './ThicknessField';

export function SeriesForm({ onDone }: { onDone(): void }) {
  const addSeries = useDataStore((s) => s.addSeries);
  const [series, setSeries] = useState('');
  const [type, setType] = useState<BookType>('komik');
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('1');
  const [author, setAuthor] = useState('');
  const thickness = useThickness(type);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addSeries({ series, type, from: Number(from), to: Number(to), author, thicknessCm: thickness.cm() });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form aria-label="Tambah berseri" className="card form" onSubmit={submit}>
      <h3>Tambah berseri</h3>
      <label className="field">
        <span>Nama seri</span>
        <Input value={series} onChange={(e) => setSeries(e.target.value)} autoFocus />
      </label>
      <label className="field">
        <span>Jenis</span>
        <NativeSelect className="w-full" value={type} onChange={(e) => setType(e.target.value as BookType)}>
          <option value="komik">Komik</option>
          <option value="buku">Buku</option>
        </NativeSelect>
      </label>
      <div className="row">
        <label className="field">
          <span>Dari volume</span>
          <Input type="number" min={1} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>Sampai volume</span>
          <Input type="number" min={1} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <ThicknessField value={thickness.text} onChange={thickness.change} />
      </div>
      <label className="field">
        <span>Penulis (opsional)</span>
        <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="row end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </form>
  );
}
