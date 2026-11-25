import type { Room, Shelf, ShelfModel, ShelfV1 } from './types';

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
export const MAX_INNER_WIDTH_CM = 1000;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Round to 0.1 cm. */
const r1 = (v: number) => Math.round(v * 10) / 10;

export function createShelf(model: ShelfModel, name: string, position = { x: 0, z: 0 }): Shelf {
  const p = SHELF_PRESETS[model];
  const innerWidthCm = sum(p.colWidthsCm) + (p.colWidthsCm.length - 1) * DEFAULT_BOARD_CM;
  return {
    id: crypto.randomUUID(),
    name,
    model,
    position: { ...position },
    rotationY: 0,
    elevationCm: p.elevationCm,
    rowHeightsCm: [...p.rowHeightsCm],
    innerWidthCm,
    colWidthsCm: p.rowHeightsCm.map(() => [...p.colWidthsCm]),
    depthCm: p.depthCm,
    boardThicknessCm: DEFAULT_BOARD_CM,
    color: DEFAULT_SHELF_COLOR,
  };
}


export function shelfSize(s: Shelf): { width: number; height: number; depth: number } {
  const b = s.boardThicknessCm;
  return {
    width: s.innerWidthCm + 2 * b,
    height: sum(s.rowHeightsCm) + (s.rowHeightsCm.length + 1) * b,
    depth: s.depthCm,
  };
}

/** Inner slot box in shelf-local cm. Origin = footprint center at the shelf base. */
export function slotRect(s: Shelf, row: number, col: number): { x: number; y: number; width: number; height: number } {
  const b = s.boardThicknessCm;
  const { width } = shelfSize(s);
  const cols = s.colWidthsCm[row];
  const x = -width / 2 + b + sum(cols.slice(0, col)) + col * b;
  const y = b + sum(s.rowHeightsCm.slice(0, row)) + row * b;
  return { x, y, width: cols[col], height: s.rowHeightsCm[row] };
}

export function clampDim(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return DIM_MIN_CM;
  return Math.min(DIM_MAX_CM, Math.max(DIM_MIN_CM, v));
}

export const columnCount = (s: Shelf, row: number): number => s.colWidthsCm[row]?.length ?? 0;

/** Narrowest inner width that still gives every column of every row DIM_MIN_CM. */
export function minInnerWidth(s: Shelf): number {
  const b = s.boardThicknessCm;
  return Math.max(DIM_MIN_CM, ...s.colWidthsCm.map((c) => c.length * DIM_MIN_CM + (c.length - 1) * b));
}

/**
 * Make one row fill `innerWidthCm` exactly: non-last columns ≥ DIM_MIN_CM (rounded to 0.1),
 * the last column takes the remainder; if that would drop below DIM_MIN_CM, shrink columns
 * from the right until it fits.
 */
export function fitRow(widths: number[], innerWidthCm: number, board: number): number[] {
  const n = widths.length;
  const total = innerWidthCm - (n - 1) * board;
  if (n <= 1) return [r1(total)];
  const head = widths.slice(0, -1).map((w) => Math.max(DIM_MIN_CM, r1(Number.isFinite(w) ? w : DIM_MIN_CM)));
  let deficit = DIM_MIN_CM - (total - sum(head));
  for (let i = head.length - 1; i >= 0 && deficit > 0; i--) {
    const cut = Math.min(deficit, head[i] - DIM_MIN_CM);
    head[i] = r1(head[i] - cut);
    deficit = r1(deficit - cut);
  }
  return [...head, r1(total - sum(head))];
}

const maxColumns = (innerWidthCm: number, board: number) =>
  Math.min(MAX_ROWS_COLS, Math.max(1, Math.floor((innerWidthCm + board) / (DIM_MIN_CM + board))));

const withRow = (s: Shelf, row: number, widths: number[]): Shelf => ({
  ...s,
  colWidthsCm: s.colWidthsCm.map((c, i) => (i === row ? widths : c)),
});

export function setRowCount(s: Shelf, rows: number): Shelf {
  const count = Math.min(MAX_ROWS_COLS, Math.max(1, Math.floor(rows) || 1));
  const n = s.rowHeightsCm.length;
  if (count <= n) {
    return { ...s, rowHeightsCm: s.rowHeightsCm.slice(0, count), colWidthsCm: s.colWidthsCm.slice(0, count) };
  }
  const topH = s.rowHeightsCm[n - 1];
  const topC = s.colWidthsCm[n - 1];
  return {
    ...s,
    rowHeightsCm: [...s.rowHeightsCm, ...Array(count - n).fill(topH)],
    colWidthsCm: [...s.colWidthsCm, ...Array.from({ length: count - n }, () => [...topC])],
  };
}

export function setColumnCount(s: Shelf, row: number, count: number): Shelf {
  const b = s.boardThicknessCm;
  const n = Math.min(maxColumns(s.innerWidthCm, b), Math.max(1, Math.floor(count) || 1));
  if (n === s.colWidthsCm[row].length) return s;
  const each = r1((s.innerWidthCm - (n - 1) * b) / n);
  return withRow(s, row, fitRow(Array(n).fill(each), s.innerWidthCm, b));
}

export function setColumnWidth(s: Shelf, row: number, col: number, widthCm: number): Shelf {
  const widths = [...s.colWidthsCm[row]];
  if (col < 0 || col >= widths.length - 1) return s;
  const b = s.boardThicknessCm;
  const total = s.innerWidthCm - (widths.length - 1) * b;
  const others = sum(widths.slice(0, -1)) - widths[col];
  widths[col] = Math.min(Math.max(DIM_MIN_CM, widthCm), total - others - DIM_MIN_CM);
  return withRow(s, row, fitRow(widths, s.innerWidthCm, b));
}

export function setInnerWidth(s: Shelf, innerWidthCm: number): Shelf {
  const b = s.boardThicknessCm;
  const target = Number.isFinite(innerWidthCm) ? r1(innerWidthCm) : s.innerWidthCm;
  const inner = Math.min(MAX_INNER_WIDTH_CM, Math.max(minInnerWidth(s), target));
  const colWidthsCm = s.colWidthsCm.map((cols) => {
    const oldTotal = s.innerWidthCm - (cols.length - 1) * b;
    const newTotal = inner - (cols.length - 1) * b;
    return fitRow(cols.map((w) => (w * newTotal) / oldTotal), inner, b);
  });
  return { ...s, innerWidthCm: inner, colWidthsCm };
}

export function migrateShelfV1(s: ShelfV1): Shelf {
  const flat = s.colWidthsCm;
  return {
    ...s,
    innerWidthCm: sum(flat) + (flat.length - 1) * s.boardThicknessCm,
    colWidthsCm: s.rowHeightsCm.map(() => [...flat]),
  };
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

export function overlappingIds(shelves: Shelf[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < shelves.length; i++) {
    for (let j = i + 1; j < shelves.length; j++) {
      if (shelvesOverlap(shelves[i], shelves[j])) {
        ids.add(shelves[i].id);
        ids.add(shelves[j].id);
      }
    }
  }
  return ids;
}

/** A slot holds a back layer only when the shelf is deep enough for two comics. */
export const MIN_DOUBLE_DEPTH_CM = 26;
export const DEFAULT_RISER_CM = 5;
export const MAX_RISER_CM = 15;

export function canDoubleStack(shelf: Pick<Shelf, 'depthCm'>): boolean {
  return shelf.depthCm >= MIN_DOUBLE_DEPTH_CM;
}

/** Riser height to 0–15 cm in 0.5 cm steps; anything that is not a number becomes the default. */
export function clampRiser(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_RISER_CM;
  return Math.min(MAX_RISER_CM, Math.max(0, Math.round(v * 2) / 2));
}

export function riserOf(shelf: Pick<Shelf, 'backRiserCm'>): number {
  return shelf.backRiserCm === undefined ? DEFAULT_RISER_CM : clampRiser(shelf.backRiserCm);
}
