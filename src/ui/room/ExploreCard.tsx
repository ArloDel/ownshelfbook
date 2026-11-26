import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { bookLabel, placementLabel } from '../common/labels';

/** The small card next to the pointer for the book being pointed at while exploring. */
export function ExploreCard() {
  const card = useUiStore((s) => s.exploreCard);
  const book = useDataStore((s) => (card ? s.books.find((b) => b.id === card.bookId) : undefined));
  const shelves = useDataStore((s) => s.shelves);
  if (!card || !book) return null;
  return (
    <div
      role="status"
      aria-label="Buku ditunjuk"
      className={card.pinned ? 'explore-card pinned' : 'explore-card'}
      style={{ left: card.x + 12, top: card.y + 12 }}
    >
      <strong>{bookLabel(book)}</strong>
      {book.author && <span>{book.author}</span>}
      <small>{placementLabel(book, shelves)}</small>
    </div>
  );
}
