import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plane, Vector3 } from 'three';
import { clampShelfToRoom, overlappingIds, snapPosition } from '../../domain/shelves';
import type { Shelf } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { BooksMesh } from './BooksMesh';
import { RoomMesh } from './RoomMesh';
import { ShelfMesh } from './ShelfMesh';
import { SlotHits } from './SlotHits';

const FLOOR = new Plane(new Vector3(0, 1, 0), 0);
const TINT_SELECTED = '#2f8a6d';
const TINT_OVERLAP = '#d0392b';

interface Drag {
  id: string;
  offset: { x: number; z: number };
}

function SceneContent() {
  const room = useDataStore((s) => s.room);
  const shelves = useDataStore((s) => s.shelves);
  const books = useDataStore((s) => s.books);
  const updateShelf = useDataStore((s) => s.updateShelf);
  const mode = useUiStore((s) => s.mode);
  const selectedShelfId = useUiStore((s) => s.selectedShelfId);
  const selectShelf = useUiStore((s) => s.selectShelf);
  const highlightId = useUiStore((s) => s.highlightBookId);
  const selectedSlot = useUiStore((s) => s.selectedSlot);
  const selectSlot = useUiStore((s) => s.selectSlot);

  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const { raycaster, pointer, camera } = useThree();
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<{ id: string; x: number; z: number } | null>(null);
  const hit = useMemo(() => new Vector3(), []);
  const previewRef = useRef(preview);
  previewRef.current = preview;

  const shown: Shelf[] = useMemo(
    () => (preview ? shelves.map((s) => (s.id === preview.id ? { ...s, position: { x: preview.x, z: preview.z } } : s)) : shelves),
    [shelves, preview],
  );
  const overlaps = useMemo(() => overlappingIds(shown), [shown]);

  const floorPointCm = () => {
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(FLOOR, hit) ? { x: hit.x * 100, z: hit.z * 100 } : null;
  };

  useFrame(() => {
    const d = drag.current;
    if (!d) return;
    const p = floorPointCm();
    const shelf = shelves.find((s) => s.id === d.id);
    if (!p || !shelf) return;
    const pos = clampShelfToRoom({ ...shelf, position: snapPosition({ x: p.x + d.offset.x, z: p.z + d.offset.z }) }, room).position;
    if (!preview || preview.x !== pos.x || preview.z !== pos.z) setPreview({ id: d.id, ...pos });
  });

  useEffect(() => {
    const up = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      if (controls) controls.enabled = true;
      document.body.style.cursor = '';
      const p = previewRef.current;
      if (p) void updateShelf(p.id, { position: { x: p.x, z: p.z } }).then(() => setPreview(null));
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [controls, updateShelf]);

  const onShelfDown = (shelf: Shelf) => (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'tata' || e.button !== 0) return;
    e.stopPropagation();
    selectShelf(shelf.id);
    const p = floorPointCm();
    if (!p) return;
    drag.current = { id: shelf.id, offset: { x: shelf.position.x - p.x, z: shelf.position.z - p.z } };
    if (controls) controls.enabled = false;
    document.body.style.cursor = 'grabbing';
  };

  return (
    <>
      <hemisphereLight args={['#fffaf0', '#b9a88f', 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <group scale={0.01}>
        <RoomMesh room={room} onFloorClick={() => mode === 'tata' && selectShelf(null)} />
        {shown.map((s) => (
          <ShelfMesh
            key={s.id}
            shelf={s}
            tint={mode !== 'tata' ? null : overlaps.has(s.id) ? TINT_OVERLAP : s.id === selectedShelfId ? TINT_SELECTED : null}
            onPointerDown={onShelfDown(s)}
          >
            {mode === 'isi' && <SlotHits shelf={s} books={books} selected={selectedSlot} onSelect={selectSlot} />}
          </ShelfMesh>
        ))}
        <BooksMesh books={books} shelves={shown} highlightId={highlightId} />
      </group>
      <OrbitControls makeDefault target={[0, 0.8, 0]} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={0.3} maxDistance={15} />
    </>
  );
}

export function Scene() {
  const room = useDataStore.getState().room;
  return (
    <Canvas
      shadows
      camera={{ position: [room.widthCm / 200, 1.9, room.depthCm / 100], fov: 50, near: 0.05, far: 100 }}
      style={{ background: '#e9e2d6' }}
    >
      <SceneContent />
    </Canvas>
  );
}
