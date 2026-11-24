import { useMemo, type ReactNode } from 'react';
import { CanvasTexture } from 'three';
import { SHELF_PRESETS, shelfSize, slotRect } from '../../domain/shelves';
import type { Shelf } from '../../domain/types';
import { footShadowAlpha, footShadowSize } from './footShadow';

const SHADOW_TEX_SIZE = 64;
let shadowTexture: CanvasTexture | null = null;

/** One shared soft-rectangle texture for every shelf's foot shadow. */
function getShadowTexture(): CanvasTexture {
  if (shadowTexture) return shadowTexture;
  const n = SHADOW_TEX_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      // alphaMap reads the green channel, so write the strength as grey.
      const g = Math.round(255 * footShadowAlpha((x + 0.5) / n, (y + 0.5) / n));
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  shadowTexture = new CanvasTexture(canvas);
  return shadowTexture;
}

/** Soft dark patch on the floor under a floor-standing shelf. */
function FootShadow({ width, depth }: { width: number; depth: number }) {
  const [w, d] = footShadowSize(width, depth);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.15} raycast={() => null} renderOrder={-1}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial color="#2a1c10" alphaMap={getShadowTexture()} transparent opacity={0.45} depthWrite={false} />
    </mesh>
  );
}

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
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c < s.colWidthsCm[r].length; c++) {
      const slot = slotRect(s, r, c);
      boards.push({ key: `v${r}-${c}`, position: [slot.x - b / 2, slot.y + slot.height / 2, 0], size: [b, slot.height, D] });
    }
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
  const size = shelfSize(shelf);
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
      {shelf.elevationCm === 0 && <FootShadow width={size.width} depth={size.depth} />}
      {children}
    </group>
  );
}
