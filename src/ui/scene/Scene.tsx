import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { BooksMesh } from './BooksMesh';
import { RoomMesh } from './RoomMesh';
import { ShelfMesh } from './ShelfMesh';

export function Scene() {
  const room = useDataStore((s) => s.room);
  const shelves = useDataStore((s) => s.shelves);
  const books = useDataStore((s) => s.books);
  const highlightId = useUiStore((s) => s.highlightBookId);

  return (
    <Canvas
      shadows
      camera={{ position: [room.widthCm / 200, 1.9, room.depthCm / 100], fov: 50, near: 0.05, far: 100 }}
      style={{ background: '#e9e2d6' }}
    >
      <hemisphereLight args={['#fffaf0', '#b9a88f', 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <group scale={0.01}>
        <RoomMesh room={room} />
        {shelves.map((s) => (
          <ShelfMesh key={s.id} shelf={s} />
        ))}
        <BooksMesh books={books} shelves={shelves} highlightId={highlightId} />
      </group>
      <OrbitControls makeDefault target={[0, 0.8, 0]} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={0.3} maxDistance={15} />
    </Canvas>
  );
}
