import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { Vector3 } from 'three';
import { useDataStore } from '../../store/dataStore';
import {
  eyeHeightCm,
  isTypingTarget,
  look,
  moveWithCollision,
  RUN_SPEED_CM,
  startPoint,
  stepToward,
  WALK_SPEED_CM,
  walkKey,
  walkStraight,
  type Floor,
} from './walk';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Orbit {
  target: Vector3;
  update(): void;
}

/**
 * First-person walking while exploring: keys walk, dragging looks, a clicked floor spot is walked to.
 * The orbit controls stay mounted but disabled; on leaving, the orbit camera comes back as it was.
 */
export function ExploreControls({ walkTarget }: { walkTarget: MutableRefObject<Floor | null> }) {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const orbit = useThree((s) => s.controls) as unknown as Orbit | null;
  const pos = useRef<Floor>({ x: 0, z: 0 });
  const view = useRef({ yaw: 0, pitch: 0 });
  const held = useRef(new Set<string>());
  const run = useRef(false);
  const reduced = useRef(prefersReducedMotion());

  // Enter: remember the orbit camera, stand at the start point. Leave: put the orbit camera back.
  useEffect(() => {
    const saved = { position: camera.position.clone(), rotation: camera.rotation.clone() };
    const { room, shelves } = useDataStore.getState();
    const start = startPoint(room, shelves);
    pos.current = { x: start.x, z: start.z };
    view.current = { yaw: start.yaw, pitch: 0 };
    walkTarget.current = null;
    camera.rotation.order = 'YXZ';
    return () => {
      camera.position.copy(saved.position);
      camera.rotation.copy(saved.rotation);
      orbit?.update();
      walkTarget.current = null;
    };
  }, [camera, orbit, walkTarget]);

  // Keys walk; a walking key cancels a walk to a clicked spot. Typing in a field never walks.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'Shift') run.current = true;
      const dir = walkKey(e);
      if (!dir) return;
      e.preventDefault();
      held.current.add(dir);
      walkTarget.current = null;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') run.current = false;
      const dir = walkKey({ code: e.code, ctrlKey: false, metaKey: false, altKey: false });
      if (dir) held.current.delete(dir);
    };
    const blur = () => {
      held.current.clear();
      run.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [walkTarget]);

  // Dragging on the canvas turns the view (mouse and touch alike).
  useEffect(() => {
    let last: { x: number; y: number } | null = null;
    const downP = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
    };
    const moveP = (e: PointerEvent) => {
      if (!last) return;
      view.current = look(view.current.yaw, view.current.pitch, e.clientX - last.x, e.clientY - last.y);
      last = { x: e.clientX, y: e.clientY };
    };
    const upP = () => {
      last = null;
    };
    dom.addEventListener('pointerdown', downP);
    window.addEventListener('pointermove', moveP);
    window.addEventListener('pointerup', upP);
    window.addEventListener('pointercancel', upP);
    // OrbitControls set touch-action on this canvas; give it back exactly as it was.
    const touchBefore = dom.style.touchAction;
    dom.style.touchAction = 'none';
    return () => {
      dom.removeEventListener('pointerdown', downP);
      window.removeEventListener('pointermove', moveP);
      window.removeEventListener('pointerup', upP);
      window.removeEventListener('pointercancel', upP);
      dom.style.touchAction = touchBefore;
    };
  }, [dom]);

  useFrame((_, delta) => {
    const { room, shelves } = useDataStore.getState();
    const dt = Math.min(delta, 0.1);
    const speed = (run.current ? RUN_SPEED_CM : WALK_SPEED_CM) * dt;
    const { yaw, pitch } = view.current;
    const h = held.current;
    const f = (h.has('fwd') ? 1 : 0) - (h.has('back') ? 1 : 0);
    const r = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0);
    if (f || r) {
      // Forward is where the camera faces on the floor; yaw 0 faces −z.
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const len = Math.hypot(f, r);
      const dx = ((fx * f + Math.cos(yaw) * r) / len) * speed;
      const dz = ((fz * f - Math.sin(yaw) * r) / len) * speed;
      pos.current = moveWithCollision(pos.current, dx, dz, room, shelves);
    } else if (walkTarget.current && reduced.current) {
      // No animation: arrive at once, but still stopped by whatever is in the way.
      pos.current = walkStraight(pos.current, walkTarget.current, room, shelves);
      walkTarget.current = null;
    } else if (walkTarget.current) {
      const target = walkTarget.current;
      const step = stepToward(pos.current, target, speed);
      const next = moveWithCollision(pos.current, step.pos.x - pos.current.x, step.pos.z - pos.current.z, room, shelves);
      const stuck = next.x === pos.current.x && next.z === pos.current.z;
      pos.current = next;
      if (step.done || stuck) walkTarget.current = null;
    }
    camera.position.set(pos.current.x / 100, eyeHeightCm(room) / 100, pos.current.z / 100);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  });

  return null;
}
