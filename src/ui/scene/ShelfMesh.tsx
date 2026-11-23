import { useMemo, type ReactNode } from 'react';
import { SHELF_PRESETS, shelfSize, slotRect } from '../../domain/shelves';
import type { Shelf } from '../../domain/types';

export interface Board {
  key: string;
  position: [number, number, number];
  size: [number, number, number];
}

/** All boards of a shelf in shelf-local cm (origin = footprint center at the base). */
export function shelfBoards(s: Shelf): Board[] {
  const { width: W, height: H, depth: D } = shelfSize(s);
  const b = s.boardThicknessCm;
  const rows = s.rowHeightsCm.length;
  const cols = s.colWidthsCm.length;
  const boards: Board[] = [
    { key: 'bottom', position: [0, b / 2, 0], size: [W, b, D] },
    { key: 'top', position: [0, H - b / 2, 0], size: [W, b, D] },
    { key: 'left', position: [-W / 2 + b / 2, H / 2, 0], size: [b, H - 2 * b, D] },
    { key: 'right', position: [W / 2 - b / 2, H / 2, 0], size: [b, H - 2 * b, D] },
  ];
  for (let r = 1; r < rows; r++) {
    const y = slotRect(s, r, 0).y - b / 2;
    boards.push({ key: `h${r}`, position: [0, y, 0], size: [W - 2 * b, b, D] });
  }
  for (let c = 1; c < cols; c++) {
    const x = slotRect(s, 0, c).x - b / 2;
    boards.push({ key: `v${c}`, position: [x, H / 2, 0], size: [b, H - 2 * b, D] });
  }
  if (SHELF_PRESETS[s.model].hasBackPanel) {
    boards.push({ key: 'back', position: [0, H / 2, -D / 2 + 0.3], size: [W, H, 0.6] });
  }
  return boards;
}

interface Props {
  shelf: Shelf;
  tint?: string | null;
  children?: ReactNode;
  onPointerDown?(e: import('@react-three/fiber').ThreeEvent<PointerEvent>): void;
}

export function ShelfMesh({ shelf, tint, children, onPointerDown }: Props) {
  const boards = useMemo(() => shelfBoards(shelf), [shelf]);
  return (
    <group
      position={[shelf.position.x, shelf.elevationCm, shelf.position.z]}
      rotation-y={(shelf.rotationY * Math.PI) / 180}
      onPointerDown={onPointerDown}
    >
      {boards.map((bd) => (
        <mesh key={bd.key} position={bd.position} castShadow receiveShadow>
          <boxGeometry args={bd.size} />
          <meshStandardMaterial
            color={shelf.color}
            emissive={tint ?? '#000000'}
            emissiveIntensity={tint ? 0.35 : 0}
            roughness={0.8}
          />
        </mesh>
      ))}
      {children}
    </group>
  );
}
