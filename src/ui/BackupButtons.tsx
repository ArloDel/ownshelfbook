import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { backupFileName } from '../domain/backup';
import { useDataStore } from '../store/dataStore';
import { ConfirmDialog } from './common/ConfirmDialog';

export function BackupButtons() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  function exportFile() {
    const blob = new Blob([useDataStore.getState().exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(new Date());
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    setPendingText(await file.text());
    if (fileRef.current) fileRef.current.value = '';
  }

  async function confirmImport() {
    const text = pendingText ?? '';
    setPendingText(null);
    setImporting(true);
    try {
      await useDataStore.getState().importData(text);
      setMessage({ kind: 'ok', text: 'Data berhasil dipulihkan dari cadangan.' });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="row backup">
      <Button variant="ghost" className="font-normal text-muted-foreground" onClick={exportFile} title="Unduh semua data sebagai file JSON">
        Ekspor
      </Button>
      <Button
        variant="ghost"
        className="font-normal text-muted-foreground"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        title="Pulihkan data dari file cadangan"
      >
        {importing ? 'Mengimpor…' : 'Impor'}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        aria-label="Pilih file cadangan"
        className="visually-hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={`toast ${message.kind}`} onClick={() => setMessage(null)}>
          {message.text}
        </p>
      )}
      <ConfirmDialog
        open={pendingText !== null}
        title="Impor cadangan"
        message="Ganti semua data dengan isi file ini? Data saat ini akan diganti seluruhnya."
        confirmLabel="Ganti semua"
        danger
        onCancel={() => setPendingText(null)}
        onConfirm={() => void confirmImport()}
      />
    </div>
  );
}
