import type { Book, Shelf } from '../../domain/types';

export const bookLabel = (b: Book) => (b.volume !== undefined ? `${b.title} ${b.volume}` : b.title);

export function placementLabel(b: Book, shelves: Shelf[]): string {
  if (!b.placement) return 'Belum ditata';
  const shelf = shelves.find((s) => s.id === b.placement!.shelfId);
  return `${shelf?.name ?? 'Rak?'} T${b.placement.row + 1}K${b.placement.col + 1}`;
}
