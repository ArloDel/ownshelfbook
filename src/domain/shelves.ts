import type { Room, Shelf, ShelfModel } from './types';

export interface ShelfPreset {
  label: string;
  rowHeightsCm: number[];
  colWidthsCm: number[];
  depthCm: number;
  elevationCm: number;
  hasBackPanel: boolean;
}

export const SHELF_PRESETS: Record<ShelfModel, ShelfPreset> = {
  'rak-buku': { label: 'Rak buku', rowHeightsCm: [33, 33, 33, 33, 33], colWidthsCm: [76], depthCm: 30, elevationCm: 0, hasBackPanel: true },
  kubus: { label: 'Rak kubus', rowHeightsCm: [33, 33, 33, 33], colWidthsCm: [33, 33, 33, 33], depthCm: 35, elevationCm: 0, hasBackPanel: false },
  dinding: { label: 'Rak dinding', rowHeightsCm: [25, 25], colWidthsCm: [100], depthCm: 20, elevationCm: 120, hasBackPanel: false },
  rendah: { label: 'Rak rendah', rowHeightsCm: [35, 35], colWidthsCm: [40, 40, 40], depthCm: 35, elevationCm: 0, hasBackPanel: true },
};

export const DEFAULT_BOARD_CM = 2;
export const DEFAULT_SHELF_COLOR = '#b08355';
export const DIM_MIN_CM = 5;
export const DIM_MAX_CM = 300;
export const MAX_ROWS_COLS = 20;

export function createShelf(model: ShelfModel, name: string, position = { x: 0, z: 0 }): Shelf {
  const p = SHELF_PRESETS[model];
  return {
    id: crypto.randomUUID(),
    name,
    model,
    position: { ...position },
    rotationY: 0,
    elevationCm: p.elevationCm,
    rowHeightsCm: [...p.rowHeightsCm],
    colWidthsCm: [...p.colWidthsCm],
    depthCm: p.depthCm,
    boardThicknessCm: DEFAULT_BOARD_CM,
    color: DEFAULT_SHELF_COLOR,
  };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function shelfSize(s: Shelf): { width: number; height: number; depth: number } {
  const b = s.boardThicknessCm;
  return {
    width: sum(s.colWidthsCm) + (s.colWidthsCm.length + 1) * b,
    height: sum(s.rowHeightsCm) + (s.rowHeightsCm.length + 1) * b,
    depth: s.depthCm,
  };
}

/** Inner slot box in shelf-local cm. Origin = footprint center at the shelf base. */
export function slotRect(s: Shelf, row: number, col: number): { x: number; y: number; width: number; height: number } {
  const b = s.boardThicknessCm;
  const { width } = shelfSize(s);
  const x = -width / 2 + b + sum(s.colWidthsCm.slice(0, col)) + col * b;
  const y = b + sum(s.rowHeightsCm.slice(0, row)) + row * b;
  return { x, y, width: s.colWidthsCm[col], height: s.rowHeightsCm[row] };
}

export function clampDim(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return DIM_MIN_CM;
  return Math.min(DIM_MAX_CM, Math.max(DIM_MIN_CM, v));
}

function resizeList(list: number[], n: number): number[] {
  const count = Math.min(MAX_ROWS_COLS, Math.max(1, Math.floor(n) || 1));
  if (count <= list.length) return list.slice(0, count);
  const last = list[list.length - 1];
  return [...list, ...Array(count - list.length).fill(last)];
}

export function resizeShelf(s: Shelf, rows: number, cols: number): Shelf {
  return { ...s, rowHeightsCm: resizeList(s.rowHeightsCm, rows), colWidthsCm: resizeList(s.colWidthsCm, cols) };
}

/** Half-extents of the rotated footprint's axis-aligned bounding box. */
function aabbHalf(s: Shelf): { hx: number; hz: number } {
  const { width, depth } = shelfSize(s);
  const t = (s.rotationY * Math.PI) / 180;
  const c = Math.abs(Math.cos(t));
  const n = Math.abs(Math.sin(t));
  return { hx: (c * width + n * depth) / 2, hz: (n * width + c * depth) / 2 };
}

function clampAxis(v: number, half: number, roomHalf: number): number {
  if (half >= roomHalf) return 0;
  return Math.min(roomHalf - half, Math.max(-roomHalf + half, v));
}

export function clampShelfToRoom(s: Shelf, room: Room): Shelf {
  const { hx, hz } = aabbHalf(s);
  return {
    ...s,
    position: {
      x: clampAxis(s.position.x, hx, room.widthCm / 2),
      z: clampAxis(s.position.z, hz, room.depthCm / 2),
    },
  };
}

type Vec = [number, number];

function footprintCorners(s: Shelf): Vec[] {
  const { width, depth } = shelfSize(s);
  const t = (s.rotationY * Math.PI) / 180;
  const c = Math.cos(t);
  const n = Math.sin(t);
  const local: Vec[] = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ];
  return local.map(([x, z]) => [s.position.x + x * c + z * n, s.position.z - x * n + z * c]);
}

const EPS = 1e-6;

/** Separating-axis test on the two oriented footprints. Touching edges do not count. */
export function shelvesOverlap(a: Shelf, b: Shelf): boolean {
  const pa = footprintCorners(a);
  const pb = footprintCorners(b);
  for (const poly of [pa, pb]) {
    for (let i = 0; i < 2; i++) {
      const [x1, z1] = poly[i];
      const [x2, z2] = poly[i + 1];
      const axis: Vec = [-(z2 - z1), x2 - x1];
      const proj = (p: Vec[]) => p.map(([x, z]) => x * axis[0] + z * axis[1]);
      const ra = proj(pa);
      const rb = proj(pb);
      const len = Math.hypot(axis[0], axis[1]);
      const gap = Math.min(Math.max(...ra), Math.max(...rb)) - Math.max(Math.min(...ra), Math.min(...rb));
      if (gap / len <= EPS) return false;
    }
  }
  return true;
}

export function snapPosition(p: { x: number; z: number }, gridCm = 5): { x: number; z: number } {
  const snap = (v: number) => Math.round(v / gridCm) * gridCm || 0;
  return { x: snap(p.x), z: snap(p.z) };
}

export function snapRotation(deg: number, stepDeg = 15): number {
  const snapped = Math.round(deg / stepDeg) * stepDeg;
  return ((snapped % 360) + 360) % 360;
}
