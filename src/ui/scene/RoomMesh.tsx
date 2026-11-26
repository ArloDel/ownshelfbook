import type { ThreeEvent } from '@react-three/fiber';
import type { Room } from '../../domain/types';
import { hitFirst, isClick } from './clicks';

const WALL = 4;
const BASEBOARD = { height: 8, thickness: 1.5, color: '#f7f2ea' };

export interface WallBox {
  key: 'back' | 'left' | 'front' | 'right' | 'ceiling';
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

/**
 * Walls in cm (origin = floor centre). The orbit view leaves the front and right open so the
 * camera can look in; while exploring the room is closed all round, with a ceiling.
 */
export function roomWalls(room: Room, closed: boolean): WallBox[] {
  const { widthCm: w, depthCm: d, heightCm: h } = room;
  const walls: WallBox[] = [
    { key: 'back', position: [0, h / 2, -d / 2 - WALL / 2], size: [w + WALL * 2, h, WALL], color: '#efe7da' },
    { key: 'left', position: [-w / 2 - WALL / 2, h / 2, 0], size: [WALL, h, d], color: '#e8dfd0' },
  ];
  if (!closed) return walls;
  return [
    ...walls,
    { key: 'front', position: [0, h / 2, d / 2 + WALL / 2], size: [w + WALL * 2, h, WALL], color: '#efe7da' },
    { key: 'right', position: [w / 2 + WALL / 2, h / 2, 0], size: [WALL, h, d], color: '#e8dfd0' },
    { key: 'ceiling', position: [0, h + WALL / 2, 0], size: [w + WALL * 2, WALL, d + WALL * 2], color: '#f6f2ec' },
  ];
}

/** A baseboard runs along the foot of each side wall, just inside the room. */
function baseboard(room: Room, wall: WallBox['key']): { position: [number, number, number]; size: [number, number, number] } | null {
  const { widthCm: w, depthCm: d } = room;
  const y = BASEBOARD.height / 2;
  const t = BASEBOARD.thickness;
  switch (wall) {
    case 'back':
      return { position: [0, y, -d / 2 + t / 2], size: [w, BASEBOARD.height, t] };
    case 'front':
      return { position: [0, y, d / 2 - t / 2], size: [w, BASEBOARD.height, t] };
    case 'left':
      return { position: [-w / 2 + t / 2, y, 0], size: [t, BASEBOARD.height, d] };
    case 'right':
      return { position: [w / 2 - t / 2, y, 0], size: [t, BASEBOARD.height, d] };
    default:
      return null;
  }
}

/** Floor plus walls, in cm. Origin = floor center. `onFloorClick` gets the clicked floor point in cm. */
export function RoomMesh({
  room,
  showGrid = true,
  closed = false,
  onFloorClick,
}: {
  room: Room;
  showGrid?: boolean;
  closed?: boolean;
  onFloorClick?(point: { x: number; z: number }): void;
}) {
  const { widthCm: w, depthCm: d } = room;
  const walls = roomWalls(room, closed);
  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        receiveShadow
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          // A click on a shelf also reaches the floor behind it; only a click on the floor itself counts.
          if (!hitFirst(e)) return;
          // World metres → room cm (the scene is drawn at 1 unit = 1 cm, scaled by 0.01).
          if (isClick(e)) onFloorClick?.({ x: e.point.x * 100, z: e.point.z * 100 });
        }}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#cdb594" roughness={0.75} />
      </mesh>
      {showGrid && <gridHelper args={[Math.max(w, d), Math.round(Math.max(w, d) / 50), '#c7b79c', '#cfc1a8']} position-y={0.05} />}
      {walls.map((wall) => (
        <mesh key={wall.key} position={wall.position} receiveShadow>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color={wall.color} />
        </mesh>
      ))}
      {walls.map((wall) => {
        const b = baseboard(room, wall.key);
        return (
          b && (
            <mesh key={`base-${wall.key}`} position={b.position} receiveShadow>
              <boxGeometry args={b.size} />
              <meshStandardMaterial color={BASEBOARD.color} />
            </mesh>
          )
        );
      })}
    </group>
  );
}
