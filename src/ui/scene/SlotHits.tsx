import { Edges } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { slotUsage } from '../../domain/placement';
import { slotRect } from '../../domain/shelves';
import type { Book, Shelf, SlotRef } from '../../domain/types';
import { isClick } from './clicks';

interface Props {
  shelf: Shelf;
  books: Book[];
  selected: SlotRef | null;
  onSelect(slot: SlotRef): void;
}

/** Clickable boxes over each slot of a shelf (fill mode), plus selection/overflow markers. */
export function SlotHits({ shelf, books, selected, onSelect }: Props) {
  const d = shelf.depthCm;
  const boxes = [];
  for (let r = 0; r < shelf.rowHeightsCm.length; r++) {
    for (let c = 0; c < shelf.colWidthsCm.length; c++) {
      const rect = slotRect(shelf, r, c);
      const isSel = selected?.shelfId === shelf.id && selected.row === r && selected.col === c;
      const over = slotUsage(books, shelf, r, c).overflow;
      const click = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (!isClick(e)) return;
        onSelect({ shelfId: shelf.id, row: r, col: c });
      };
      boxes.push(
        <mesh
          key={`${r}-${c}`}
          position={[rect.x + rect.width / 2, rect.y + rect.height / 2, 0]}
          onClick={click}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <boxGeometry args={[rect.width - 0.4, rect.height - 0.4, d - 0.4]} />
          <meshBasicMaterial
            color={over ? '#d0392b' : '#2f8a6d'}
            transparent
            opacity={isSel ? 0.18 : over ? 0.12 : 0}
            depthWrite={false}
          />
          {isSel && <Edges color="#1f6b55" lineWidth={2} />}
        </mesh>,
      );
    }
  }
  return <>{boxes}</>;
}
