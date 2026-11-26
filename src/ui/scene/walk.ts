import { shelfSize } from '../../domain/shelves';
import type { Room, Shelf } from '../../domain/types';

/** Rules for walking around the room (Jelajahi). Positions are floor cm `{ x, z }`, angles radians. */

export interface Floor {
  x: number;
  z: number;
}

export const PLAYER_RADIUS_CM = 25;
export const WALK_SPEED_CM = 140;
export const RUN_SPEED_CM = 280;
export const MAX_PITCH = Math.PI / 3;
export const LOOK_RAD_PER_PX = (0.25 * Math.PI) / 180;
const EYE_CM = 160;
const HEAD_ROOM_CM = 20;
const START_DISTANCE_CM = 150;
const STOP_SHORT_CM = 30;
const SEARCH_STEP_CM = 10;
/** Points tried on each search ring are about this far apart (cm). */
const SEARCH_SPACING_CM = 10;

export function eyeHeightCm(room: Room): number {
  return room.heightCm < EYE_CM + HEAD_ROOM_CM ? room.heightCm - HEAD_ROOM_CM : EYE_CM;
}

/** Inside a shelf's turned footprint, grown by the body radius. */
function hitsShelf(p: Floor, s: Shelf): boolean {
  const { width, depth } = shelfSize(s);
  const t = (s.rotationY * Math.PI) / 180;
  const dx = p.x - s.position.x;
  const dz = p.z - s.position.z;
  // Undo the shelf's turn (same rotation as its footprint corners).
  const lx = dx * Math.cos(t) - dz * Math.sin(t);
  const lz = dx * Math.sin(t) + dz * Math.cos(t);
  return Math.abs(lx) < width / 2 + PLAYER_RADIUS_CM && Math.abs(lz) < depth / 2 + PLAYER_RADIUS_CM;
}

export function isBlocked(p: Floor, room: Room, shelves: Shelf[]): boolean {
  const hx = room.widthCm / 2 - PLAYER_RADIUS_CM;
  const hz = room.depthCm / 2 - PLAYER_RADIUS_CM;
  if (Math.abs(p.x) > hx || Math.abs(p.z) > hz) return true;
  return shelves.some((s) => hitsShelf(p, s));
}

/** Move by (dx, dz); when that is blocked, slide along whichever single axis is still free. */
export function moveWithCollision(from: Floor, dx: number, dz: number, room: Room, shelves: Shelf[]): Floor {
  const both = { x: from.x + dx, z: from.z + dz };
  // Someone already inside a shelf (a crowded start) may always move, so they can walk out.
  if (isBlocked(from, room, shelves)) return both;
  if (!isBlocked(both, room, shelves)) return both;
  const alongX = { x: from.x + dx, z: from.z };
  if (dx !== 0 && !isBlocked(alongX, room, shelves)) return alongX;
  const alongZ = { x: from.x, z: from.z + dz };
  if (dz !== 0 && !isBlocked(alongZ, room, shelves)) return alongZ;
  return from;
}

/** Camera yaw that looks from `from` towards `to` (yaw 0 looks along −z). */
const yawTowards = (from: Floor, to: Floor) => Math.atan2(-(to.x - from.x), -(to.z - from.z));

/** Where a walk starts: in front of the shelf nearest the middle, else the middle; always a free spot. */
export function startPoint(room: Room, shelves: Shelf[]): Floor & { yaw: number } {
  const middle = { x: 0, z: 0 };
  const nearest = [...shelves].sort(
    (a, b) => Math.hypot(a.position.x, a.position.z) - Math.hypot(b.position.x, b.position.z),
  )[0];
  let spot: Floor & { yaw: number } = { ...middle, yaw: 0 };
  if (nearest) {
    const t = (nearest.rotationY * Math.PI) / 180;
    const front = { x: nearest.position.x + Math.sin(t) * START_DISTANCE_CM, z: nearest.position.z + Math.cos(t) * START_DISTANCE_CM };
    spot = { ...front, yaw: yawTowards(front, nearest.position) };
  }
  if (!isBlocked(spot, room, shelves)) return spot;
  // Rings around the middle, 10 cm apart, until a free spot turns up.
  const reach = Math.max(room.widthCm, room.depthCm) / 2;
  if (!isBlocked(middle, room, shelves)) return { ...middle, yaw: nearest ? yawTowards(middle, nearest.position) : 0 };
  for (let r = SEARCH_STEP_CM; r <= reach; r += SEARCH_STEP_CM) {
    const directions = Math.max(8, Math.ceil((2 * Math.PI * r) / SEARCH_SPACING_CM));
    for (let k = 0; k < directions; k++) {
      const a = (k / directions) * Math.PI * 2;
      const p = { x: Math.sin(a) * r, z: Math.cos(a) * r };
      if (!isBlocked(p, room, shelves)) return { ...p, yaw: nearest ? yawTowards(p, nearest.position) : 0 };
    }
  }
  return { ...middle, yaw: 0 };
}

/** Dragging turns the view; up/down stops at ±60°. */
export function look(yaw: number, pitch: number, dxPx: number, dyPx: number): { yaw: number; pitch: number } {
  return {
    yaw: yaw - dxPx * LOOK_RAD_PER_PX,
    pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch - dyPx * LOOK_RAD_PER_PX)),
  };
}

/** One step of walking to a clicked spot, stopping 30 cm short of it. */
export function stepToward(pos: Floor, target: Floor, maxStepCm: number): { pos: Floor; done: boolean } {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const left = Math.hypot(dx, dz) - STOP_SHORT_CM;
  if (left <= 0) return { pos, done: true };
  const step = Math.min(maxStepCm, left);
  const k = step / (left + STOP_SHORT_CM);
  return { pos: { x: pos.x + dx * k, z: pos.z + dz * k }, done: step >= left };
}

/** Keys typed into a text field must not walk. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const editable = el.isContentEditable || ['', 'true', 'plaintext-only'].includes(el.getAttribute('contenteditable') ?? 'no');
  return editable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/** Walk to a spot in one go (no animation), in 10 cm steps that stop where something is in the way. */
export function walkStraight(from: Floor, target: Floor, room: Room, shelves: Shelf[]): Floor {
  let pos = from;
  for (let i = 0; i < 1000; i++) {
    const step = stepToward(pos, target, SEARCH_SPACING_CM);
    const next = moveWithCollision(pos, step.pos.x - pos.x, step.pos.z - pos.z, room, shelves);
    if (Math.hypot(next.x - pos.x, next.z - pos.z) < 0.5) return next;
    pos = next;
    if (step.done) return pos;
  }
  return pos;
}

export type WalkDir = 'fwd' | 'back' | 'left' | 'right';
const WALK_KEYS: Record<string, WalkDir> = {
  KeyW: 'fwd',
  ArrowUp: 'fwd',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

/** The walking direction for a key; with Ctrl, Cmd or Alt the key belongs to the browser. */
export function walkKey(e: { code: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): WalkDir | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  return WALK_KEYS[e.code] ?? null;
}
