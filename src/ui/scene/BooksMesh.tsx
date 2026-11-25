import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, InstancedMesh, Matrix4, Object3D, SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import { seriesKey } from '../../domain/covers';
import { booksInSlot } from '../../domain/placement';
import { canDoubleStack, columnCount, riserOf, slotRect } from '../../domain/shelves';
import type { Book, Layer, Shelf } from '../../domain/types';
import { bandColor, heightFactor, leanBook, spineBands } from './bookLook';
import { splitByCover, spineLabelText, volumeFontSize } from './covers3d';
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

const NO_COVERS: Record<string, string> = {};
const HIGHLIGHT = '#ffd54a';

/** Book frame in world space: shelf -> book centre -> lean. */
function bookWorld(p: PlacedBook, out: Matrix4) {
  shelfWorld(p.shelf, shelfMatrix);
  dummy.position.set(...p.local);
  dummy.rotation.set(0, 0, p.tilt);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  return out.multiplyMatrices(shelfMatrix, dummy.matrix);
}

export function BooksMesh({
  books,
  shelves,
  highlightId,
  covers = NO_COVERS,
}: {
  books: Book[];
  shelves: Shelf[];
  highlightId?: string | null;
  covers?: Record<string, string>;
}) {
  const { placed, risers } = useMemo(() => placedLayout(books, shelves), [books, shelves]);
  const { plain, covered } = useMemo(() => splitByCover(placed, covers, highlightId), [placed, covers, highlightId]);
  const ref = useRef<InstancedMesh>(null);
  const bandsRef = useRef<InstancedMesh>(null);
  const capacity = Math.max(1, placed.length);
  const bandCapacity = Math.max(1, plain.length);

  useLayoutEffect(() => {
    const mesh = ref.current;
    const bands = bandsRef.current;
    if (!mesh || !bands) return;
    // Every book body; spine images are laid over the front face separately.
    placed.forEach((p, i) => {
      bookWorld(p, bookMatrix);
      mesh.setMatrixAt(i, partMatrix.multiplyMatrices(bookMatrix, partMatrix.makeScale(...p.size)));
      mesh.setColorAt(i, tmp.set(p.book.id === highlightId ? HIGHLIGHT : p.book.color));
    });
    // Spine bands only on books without an image.
    plain.forEach((p, i) => {
      bookWorld(p, bookMatrix);
      const color = p.book.id === highlightId ? HIGHLIGHT : p.book.color;
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
    bands.count = plain.length * 2;
    for (const m of [mesh, bands]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [placed, plain, highlightId]);

  return (
    <>
      <instancedMesh key={capacity} ref={ref} args={[undefined, undefined, capacity]} castShadow raycast={() => null}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh key={`bands-${bandCapacity}`} ref={bandsRef} args={[undefined, undefined, bandCapacity * 2]} raycast={() => null}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      {[...covered].map(([key, items]) => (
        <CoveredSpines key={key} items={items} image={covers[key]} highlightId={highlightId} />
      ))}
      <SpineLabels placed={placed} shelves={shelves} covers={covers} />
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

/** One series' spine image, laid just in front of each of its books' spines. */
function CoveredSpines({ items, image, highlightId }: { items: PlacedBook[]; image: string; highlightId?: string | null }) {
  const ref = useRef<InstancedMesh>(null);
  const capacity = Math.max(1, items.length);
  const texture = useMemo(() => {
    const t = new TextureLoader().load(image);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [image]);
  useEffect(() => () => texture.dispose(), [texture]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((p, i) => {
      bookWorld(p, bookMatrix);
      dummy.position.set(0, 0, p.size[2] / 2 + 0.03);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(p.size[0], p.size[1], 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, partMatrix.multiplyMatrices(bookMatrix, dummy.matrix));
      // A book highlighted from search glows warm; others show the picture as it is.
      mesh.setColorAt(i, tmp.set(p.book.id === highlightId ? '#ffe9a0' : '#ffffff'));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, highlightId]);

  return (
    <instancedMesh key={capacity} ref={ref} args={[undefined, undefined, capacity]} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial map={texture} roughness={0.75} />
    </instancedMesh>
  );
}

/** Spine text only for shelves close to the camera (text is expensive). */
function SpineLabels({ placed, shelves, covers }: { placed: PlacedBook[]; shelves: Shelf[]; covers: Record<string, string> }) {
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
        .map((p) => {
          const hasCover = !!covers[seriesKey(p.book)];
          const text = spineLabelText(p.book, hasCover);
          const at: [number, number, number] = [p.shelf.position.x, p.shelf.elevationCm, p.shelf.position.z];
          const turn = (p.shelf.rotationY * Math.PI) / 180;
          if (hasCover && p.book.volume !== undefined) {
            // Volume number, upright near the foot of the spine, on a dark band so it reads over the picture.
            const size = volumeFontSize(p.size[0], text);
            return (
              <group key={p.book.id} position={at} rotation-y={turn}>
                <group position={[p.local[0], p.local[1], p.local[2] + p.size[2] / 2 + 0.06]} rotation-z={p.tilt}>
                  <mesh position={[0, -p.size[1] * 0.35, 0]}>
                    <planeGeometry args={[p.size[0] * 0.92, size * 1.3]} />
                    <meshBasicMaterial color="#000000" transparent opacity={0.6} />
                  </mesh>
                  <Text position={[0, -p.size[1] * 0.35, 0.02]} fontSize={size} color="#ffffff" anchorX="center" anchorY="middle">
                    {text}
                  </Text>
                </group>
              </group>
            );
          }
          return (
            <group key={p.book.id} position={at} rotation-y={turn}>
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
                {text}
              </Text>
            </group>
          );
        })}
    </>
  );
}

function readableOn(hex: string): string {
  tmp.set(hex);
  const l = 0.2126 * tmp.r + 0.7152 * tmp.g + 0.0722 * tmp.b;
  return l > 0.5 ? '#1d1a16' : '#f6f1e7';
}
