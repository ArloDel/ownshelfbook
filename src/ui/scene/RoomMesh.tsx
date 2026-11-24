import type { Room } from '../../domain/types';
import { isClick } from './clicks';

const WALL = 4;

/** Floor plus the back and left walls, in cm. Origin = floor center. */
export function RoomMesh({ room, showGrid = true, onFloorClick }: { room: Room; showGrid?: boolean; onFloorClick?(): void }) {
  const { widthCm: w, depthCm: d, heightCm: h } = room;
  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          if (isClick(e)) onFloorClick?.();
        }}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#d9cbb4" />
      </mesh>
      {showGrid && <gridHelper args={[Math.max(w, d), Math.round(Math.max(w, d) / 50), '#c7b79c', '#cfc1a8']} position-y={0.05} />}
      <mesh position={[0, h / 2, -d / 2 - WALL / 2]} receiveShadow>
        <boxGeometry args={[w + WALL * 2, h, WALL]} />
        <meshStandardMaterial color="#efe7da" />
      </mesh>
      <mesh position={[-w / 2 - WALL / 2, h / 2, 0]} receiveShadow>
        <boxGeometry args={[WALL, h, d]} />
        <meshStandardMaterial color="#e8dfd0" />
      </mesh>
    </group>
  );
}
