import { spineCrop } from '../../domain/covers';

export const NOT_AN_IMAGE = 'File ini bukan gambar yang bisa dibaca.';

/** Decode a picked, pasted or dropped file into an image element. */
export function loadImage(source: Blob): Promise<HTMLImageElement> {
  if (!source.type.startsWith('image/')) return Promise.reject(new Error(NOT_AN_IMAGE));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve(img);
      else reject(new Error(NOT_AN_IMAGE));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(NOT_AN_IMAGE));
    };
    img.src = url;
  });
}

/**
 * Cut the spine strip out of an image and shrink it to 512 px tall.
 * WebP when the browser can encode it, otherwise JPEG.
 */
export function renderSpine(img: HTMLImageElement, ratio: number, pos: number): string {
  const c = spineCrop(img.naturalWidth, img.naturalHeight, ratio, pos);
  const canvas = document.createElement('canvas');
  canvas.width = c.outW;
  canvas.height = c.outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(NOT_AN_IMAGE);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, c.sx, c.sy, c.sw, c.sh, 0, 0, c.outW, c.outH);
  const webp = canvas.toDataURL('image/webp', 0.8);
  // Browsers that cannot encode WebP get JPEG, which stays small; PNG of a photo can be too big for a backup.
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
}
