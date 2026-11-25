import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, InstancedMesh, Matrix4, Object3D, Vector3 } from 'three';
import { booksInSlot } from '../../domain/placement';
import { canDoubleStack, columnCount, riserOf, slotRect } from '../../domain/shelves';
import type { Book, Layer, Shelf } from '../../domain/types';
import { bookLabel } from '../common/labels';
import { bandColor, heightFactor, leanBook, spineBands } from './bookLook';
import { backBookDepth, backBookZ, backSpace, riserBox } from './layers';
import { layoutBooksInSlot, type SlotBox } from './layout';

const BOOK_DEPTH = { komik: 13, buku: 15 } as const;
const LABEL_DISTANCE_M = 2.5;

export interface PlacedBook {
  book: Book;
  shelf: Shelf;
  /** Book center in shelf-local cm. */
  local: [number, number, number];
  size: [number, number, number];
  /** Lean around the shelf's z axis (radians, counter-clockwise seen from the front). */
  tilt: number;
  layer: Layer;
}

export interface Riser {
  shelf: Shelf;
  position: [number, number, number];
  size: [number, number, number];
}

/** Lay out one layer of a slot: books stand left to right, the last one leans when there is room. */
function placeLayer(
  out: PlacedBook[],
  byId: Map<string, Book>,
  shelf: Shelf,
  rect: SlotBox,
  inSlot: Book[],
  layer: Layer,
  depthAndZ: (bookDepth: number) => { depth: number; z: number },
) {
  if (!inSlot.length || rect.height <= 0) return;
  const boxes = layoutBooksInSlot(inSlot, rect);
  const shown = boxes.filter((b) => b.visible);
  // A layer with overflow is full: nothing can lean.
  const leanLast = shown.length === boxes.length;
  shown.forEach((box, i) => {
    const book = byId.get(box.id)!;
    const { depth, z } = depthAndZ(Math.max(2, Math.min(BOOK_DEPTH[book.type], shelf.depthCm - 2)));
    const height = box.height * heightFactor(book.id);
    const width = box.width * 0.96;
    const upright = { left: box.x - width / 2, bottom: box.y, width, height };
    const pose =
      leanLast && i === shown.length - 1
        ? leanBook(upright, rect.x + rect.width, rect.y + rect.height)
        : { cx: box.x, cy: box.y + height / 2, tilt: 0 };
    out.push({ book, shelf, local: [pose.cx, pose.cy, z], size: [width, height, depth], tilt: pose.tilt, layer });
  });
}

/** Every visible placed book with its shelf-local box, plus the risers under back layers that hold books. */
export function placedLayout(books: Book[], shelves: Shelf[]): { placed: PlacedBook[]; risers: Riser[] } {
  const placed: PlacedBook[] = [];
  const risers: Riser[] = [];
  const byId = new Map(books.map((b) => [b.id, b]));
  for (const shelf of shelves) {
    const double = canDoubleStack(shelf);
    for (let r = 0; r < shelf.rowHeightsCm.length; r++) {
      for (let c = 0; c < columnCount(shelf, r); c++) {
        const slot = { shelfId: shelf.id, row: r, col: c };
        const rect = slotRect(shelf, r, c);
        const start = placed.length;
        // Front layer: flush with the front edge, as before.
        placeLayer(placed, byId, shelf, rect, booksInSlot(books, slot, 'depan'), 'depan', (d) => ({
          depth: d,
          z: shelf.depthCm / 2 - d / 2 - 1,
        }));
        const back = double ? booksInSlot(books, slot, 'belakang') : [];
        if (!back.length) continue;
        const frontDeepest = Math.max(0, ...placed.slice(start).map((p) => p.size[2]));
        const space = backSpace(shelf, frontDeepest);
        const riser = riserOf(shelf);
        const backRect = { ...rect, y: rect.y + riser, height: Math.max(0, rect.height - riser) };
        placeLayer(placed, byId, shelf, backRect, back, 'belakang', (d) => {
          const depth = backBookDepth(d, space);
          return { depth, z: backBookZ(depth, space) };
        });
        const box = riserBox(rect, space, riser);
        if (box) risers.push({ shelf, ...box });
      }
    }
  }
  return { placed, risers };
}

/** Every visible placed book with its shelf-local box. */
export function placedBookBoxes(books: Book[], shelves: Shelf[]): PlacedBook[] {
  return placedLayout(books, shelves).placed;
}

const dummy = new Object3D();
const shelfMatrix = new Matrix4();
const bookMatrix = new Matrix4();
const partMatrix = new Matrix4();
const tmp = new Color();

function shelfWorld(s: Shelf, m: Matrix4) {
  dummy.position.set(s.position.x, s.elevationCm, s.position.z);
  dummy.rotation.set(0, (s.rotationY * Math.PI) / 180, 0);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  return m.copy(dummy.matrix);
}

export function BooksMesh({ books, shelves, highlightId }: { books: Book[]; shelves: Shelf[]; highlightId?: string | null }) {
  const { placed, risers } = useMemo(() => placedLayout(books, shelves), [books, shelves]);
  const ref = useRef<InstancedMesh>(null);
  const bandsRef = useRef<InstancedMesh>(null);
  const capacity = Math.max(1, placed.length);

  useLayoutEffect(() => {
    const mesh = ref.current;
    const bands = bandsRef.current;
    if (!mesh || !bands) return;
    placed.forEach((p, i) => {
      // Book frame: shelf → book centre → lean.
      shelfWorld(p.shelf, shelfMatrix);
      dummy.position.set(...p.local);
      dummy.rotation.set(0, 0, p.tilt);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bookMatrix.multiplyMatrices(shelfMatrix, dummy.matrix);

      const color = p.book.id === highlightId ? '#ffd54a' : p.book.color;
      mesh.setMatrixAt(i, partMatrix.multiplyMatrices(bookMatrix, partMatrix.makeScale(...p.size)));
      mesh.setColorAt(i, tmp.set(color));

      spineBands(p.size).forEach((band, k) => {
        dummy.position.set(...band.position);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(...band.size);
        dummy.updateMatrix();
        bands.setMatrixAt(i * 2 + k, partMatrix.multiplyMatrices(bookMatrix, dummy.matrix));
        bands.setColorAt(i * 2 + k, tmp.set(bandColor(color)));
      });
    });
    mesh.count = placed.length;
    bands.count = placed.length * 2;
    for (const m of [mesh, bands]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [placed, highlightId]);

  return (
    <>
      <instancedMesh key={capacity} ref={ref} args={[undefined, undefined, capacity]} castShadow raycast={() => null}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh key={`bands-${capacity}`} ref={bandsRef} args={[undefined, undefined, capacity * 2]} raycast={() => null}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <SpineLabels placed={placed} shelves={shelves} />
      {risers.map((r, i) => (
        <group key={`riser-${r.shelf.id}-${i}`} position={[r.shelf.position.x, r.shelf.elevationCm, r.shelf.position.z]} rotation-y={(r.shelf.rotationY * Math.PI) / 180}>
          <mesh position={r.position} castShadow receiveShadow raycast={() => null}>
            <boxGeometry args={r.size} />
            <meshStandardMaterial color={bandColor(r.shelf.color)} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Spine text only for shelves close to the camera (text is expensive). */
function SpineLabels({ placed, shelves }: { placed: PlacedBook[]; shelves: Shelf[] }) {
  const [near, setNear] = useState<Set<string>>(new Set());
  const acc = useRef(0);
  const v = useMemo(() => new Vector3(), []);

  useFrame(({ camera }, delta) => {
    acc.current += delta;
    if (acc.current < 0.4) return;
    acc.current = 0;
    const next = new Set<string>();
    for (const s of shelves) {
      v.set(s.position.x / 100, s.elevationCm / 100 + 0.8, s.position.z / 100);
      if (v.distanceTo(camera.position) < LABEL_DISTANCE_M) next.add(s.id);
    }
    const same = next.size === near.size && [...next].every((id) => near.has(id));
    if (!same) setNear(next);
  });

  return (
    <>
      {placed
        .filter((p) => near.has(p.shelf.id) && p.size[0] >= 1)
        .map((p) => (
          <group
            key={p.book.id}
            position={[p.shelf.position.x, p.shelf.elevationCm, p.shelf.position.z]}
            rotation-y={(p.shelf.rotationY * Math.PI) / 180}
          >
            <Text
              position={[p.local[0], p.local[1], p.local[2] + p.size[2] / 2 + 0.05]}
              rotation-z={p.tilt - Math.PI / 2}
              fontSize={Math.min(p.size[0] * 0.55, 1.4)}
              maxWidth={p.size[1] - 2.6}
              color={readableOn(p.book.color)}
              anchorX="center"
              anchorY="middle"
              overflowWrap="break-word"
              whiteSpace="nowrap"
              clipRect={[-(p.size[1] - 2.6) / 2, -p.size[0], (p.size[1] - 2.6) / 2, p.size[0]]}
            >
              {bookLabel(p.book)}
            </Text>
          </group>
        ))}
    </>
  );
}

function readableOn(hex: string): string {
  tmp.set(hex);
  const l = 0.2126 * tmp.r + 0.7152 * tmp.g + 0.0722 * tmp.b;
  return l > 0.5 ? '#1d1a16' : '#f6f1e7';
}
