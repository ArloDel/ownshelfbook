import type { Book } from './types';

/** Spine images belong to a series; a book without a series uses its title. */
export const seriesKey = (b: Pick<Book, 'series' | 'title'>): string => b.series ?? b.title;

const FALLBACK_RATIO = 1 / 8;
export const SPINE_HEIGHT_PX = 512;
const MIN_SPINE_WIDTH_PX = 16;

/** Width ÷ height of the series' spine, from its first volume, so the image is not stretched. */
export function seriesSpineRatio(books: Book[], key: string): number {
  const first = books
    .filter((b) => seriesKey(b) === key)
    .sort((a, b) => (a.volume ?? 0) - (b.volume ?? 0))[0];
  return first && first.heightCm > 0 ? first.thicknessCm / first.heightCm : FALLBACK_RATIO;
}

/** A full-height vertical strip of the source, moved across it by `pos` (0 = left, 1 = right). */
export function spineCrop(srcW: number, srcH: number, ratio: number, pos: number) {
  const sw = Math.min(srcW, srcH * ratio);
  const sx = (srcW - sw) * Math.min(1, Math.max(0, pos));
  return {
    sx,
    sy: 0,
    sw,
    sh: srcH,
    outW: Math.max(MIN_SPINE_WIDTH_PX, Math.round(SPINE_HEIGHT_PX * ratio)),
    outH: SPINE_HEIGHT_PX,
  };
}
