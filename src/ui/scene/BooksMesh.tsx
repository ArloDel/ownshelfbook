import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, InstancedMesh, Matrix4, Object3D, Vector3 } from 'three';
import { booksInSlot } from '../../domain/placement';
import { columnCount, slotRect } from '../../domain/shelves';
import type { Book, Shelf } from '../../domain/types';
import { bookLabel } from '../common/labels';
import { heightFactor, leanBook } from './bookLook';
import { layoutBooksInSlot } from './layout';

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
}

/** Every visible placed book with its shelf-local box. */
export function placedBookBoxes(books: Book[], shelves: Shelf[]): PlacedBook[] {
  const out: PlacedBook[] = [];
  const byId = new Map(books.map((b) => [b.id, b]));
  for (const shelf of shelves) {
    for (let r = 0; r < shelf.rowHeightsCm.length; r++) {
      for (let c = 0; c < columnCount(shelf, r); c++) {
        const inSlot = booksInSlot(books, { shelfId: shelf.id, row: r, col: c });
        if (!inSlot.length) continue;
        const rect = slotRect(shelf, r, c);
        const boxes = layoutBooksInSlot(inSlot, rect);
        const shown = boxes.filter((b) => b.visible);
        // A slot with overflow is full: nothing can lean.
        const leanLast = shown.length === boxes.length;
        shown.forEach((box, i) => {
          const book = byId.get(box.id)!;
          const depth = Math.max(2, Math.min(BOOK_DEPTH[book.type], shelf.depthCm - 2));
          const height = box.height * heightFactor(book.id);
          const width = box.width * 0.96;
          const upright = { left: box.x - width / 2, bottom: box.y, width, height };
          const pose =
            leanLast && i === shown.length - 1
              ? leanBook(upright, rect.x + rect.width, rect.y + rect.height)
              : { cx: box.x, cy: box.y + height / 2, tilt: 0 };
          out.push({
            book,
            shelf,
            local: [pose.cx, pose.cy, shelf.depthCm / 2 - depth / 2 - 1],
            size: [width, height, depth],
            tilt: pose.tilt,
          });
        });
      }
    }
  }
  return out;
}

const dummy = new Object3D();
const shelfMatrix = new Matrix4();
const tmp = new Color();

function shelfWorld(s: Shelf, m: Matrix4) {
  dummy.position.set(s.position.x, s.elevationCm, s.position.z);
  dummy.rotation.set(0, (s.rotationY * Math.PI) / 180, 0);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  return m.copy(dummy.matrix);
}

export function BooksMesh({ books, shelves, highlightId }: { books: Book[]; shelves: Shelf[]; highlightId?: string | null }) {
  const placed = useMemo(() => placedBookBoxes(books, shelves), [books, shelves]);
  const ref = useRef<InstancedMesh>(null);
  const capacity = Math.max(1, placed.length);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placed.forEach((p, i) => {
      shelfWorld(p.shelf, shelfMatrix);
      dummy.position.set(...p.local);
      dummy.rotation.set(0, 0, p.tilt);
      dummy.scale.set(...p.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix.premultiply(shelfMatrix));
      tmp.set(p.book.id === highlightId ? '#ffd54a' : p.book.color);
      mesh.setColorAt(i, tmp);
    });
    mesh.count = placed.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placed, highlightId]);

  return (
    <>
      <instancedMesh key={capacity} ref={ref} args={[undefined, undefined, capacity]} castShadow raycast={() => null}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <SpineLabels placed={placed} shelves={shelves} />
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
              maxWidth={p.size[1] - 2}
              color={readableOn(p.book.color)}
              anchorX="center"
              anchorY="middle"
              overflowWrap="break-word"
              whiteSpace="nowrap"
              clipRect={[-(p.size[1] - 2) / 2, -p.size[0], (p.size[1] - 2) / 2, p.size[0]]}
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
