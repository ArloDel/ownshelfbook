import { ImageIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { seriesSpineRatio, spineCrop } from '../../domain/covers';
import { useDataStore } from '../../store/dataStore';
import { loadImage, NOT_AN_IMAGE, renderSpine } from './spineImage';

/** The image button in a series heading, and the dialog that sets that series' spine image. */
export function SpineImageButton({ name }: { name: string }) {
  const saved = useDataStore((s) => s.covers[name]);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label={`Gambar punggung ${name}`} title="Gambar punggung" onClick={() => setOpen(true)}>
        {saved ? <img src={saved} alt={`Punggung ${name}`} className="h-6 w-auto rounded-[2px]" /> : <ImageIcon aria-hidden />}
      </Button>
      {open && <SpineImageDialog name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

function SpineImageDialog({ name, onClose }: { name: string; onClose(): void }) {
  const saved = useDataStore((s) => s.covers[name]);
  const ratio = useDataStore((s) => seriesSpineRatio(s.books, name));
  const { setCover, removeCover } = useDataStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const sliderId = useId();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [pos, setPos] = useState(50);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Free the shown source picture when it changes or the dialog closes.
  useEffect(() => () => void (sourceUrl && URL.revokeObjectURL?.(sourceUrl)), [sourceUrl]);

  useEffect(() => {
    if (!img) return;
    try {
      setPreview(renderSpine(img, ratio, pos / 100));
    } catch {
      setError(NOT_AN_IMAGE);
    }
  }, [img, ratio, pos]);

  async function take(file: Blob | undefined) {
    if (!file) return;
    setError(null);
    try {
      const loaded = await loadImage(file);
      setImg(loaded);
      setSourceUrl(URL.createObjectURL?.(file) ?? null);
    } catch {
      setImg(null);
      setPreview(null);
      setSourceUrl(null);
      setError(NOT_AN_IMAGE);
    }
  }

  const crop = img ? spineCrop(img.naturalWidth, img.naturalHeight, ratio, pos / 100) : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gambar punggung — {name}</DialogTitle>
          <DialogDescription>Satu gambar untuk semua volume seri ini. Nomor volume tampil di punggungnya.</DialogDescription>
        </DialogHeader>

        <div
          className="spine-drop"
          tabIndex={0}
          onPaste={(e) => void take(e.clipboardData?.files?.[0])}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void take(e.dataTransfer?.files?.[0]);
          }}
        >
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Pilih file
          </Button>
          <span className="hint">atau tempel (Ctrl+V) / seret gambar ke sini</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            aria-label="Pilih file"
            className="visually-hidden"
            onChange={(e) => {
              void take(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        {(preview || saved) && (
          <div className="spine-compare">
            {sourceUrl && crop && img && (
              <div className="spine-source">
                <img src={sourceUrl} alt="Gambar sumber" />
                <span
                  className="spine-window"
                  style={{ left: `${(crop.sx / img.naturalWidth) * 100}%`, width: `${(crop.sw / img.naturalWidth) * 100}%` }}
                />
              </div>
            )}
            <figure className="spine-preview">
              <img src={preview ?? saved} alt="Pratinjau punggung" />
              <figcaption>1</figcaption>
            </figure>
          </div>
        )}

        {img && (
          <div className="field">
            <label htmlFor={sliderId}>Posisi potongan</label>
            <input id={sliderId} type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} />
          </div>
        )}

        <DialogFooter>
          {saved && (
            <Button
              variant="ghost"
              className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                await removeCover(name);
                onClose();
              }}
            >
              Hapus gambar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={!preview || saving}
            onClick={async () => {
              if (!preview) return;
              setSaving(true);
              try {
                await setCover(name, preview);
                onClose();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
