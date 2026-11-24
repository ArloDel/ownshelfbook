import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { shelfSize } from '../../domain/shelves';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';

const DURATION = 0.7;

/** Seconds for the camera flight; 0 = jump straight there. */
export const focusDuration = (reducedMotion: boolean) => (reducedMotion ? 0 : DURATION);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Controls {
  target: Vector3;
  update(): void;
}

/** Flies the camera to the shelf named by `focusShelfId`, then clears it. */
export function CameraFocus() {
  const focusShelfId = useUiStore((s) => s.focusShelfId);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const camera = useThree((s) => s.camera);
  const anim = useRef<{ t: number; fromPos: Vector3; toPos: Vector3; fromTarget: Vector3; toTarget: Vector3 } | null>(null);

  useEffect(() => {
    if (!focusShelfId || !controls) return;
    const shelf = useDataStore.getState().shelves.find((s) => s.id === focusShelfId);
    if (!shelf) return;
    const { width, height } = shelfSize(shelf);
    const toTarget = new Vector3(shelf.position.x / 100, (shelf.elevationCm + height / 2) / 100, shelf.position.z / 100);
    const rot = (shelf.rotationY * Math.PI) / 180;
    const distance = Math.max(1.1, (Math.max(width, height) / 100) * 1.4);
    const front = new Vector3(Math.sin(rot), 0.15, Math.cos(rot)).normalize();
    anim.current = {
      t: 0,
      fromPos: camera.position.clone(),
      toPos: toTarget.clone().addScaledVector(front, distance),
      fromTarget: controls.target.clone(),
      toTarget,
    };
  }, [focusShelfId, controls, camera]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a || !controls) return;
    const duration = focusDuration(prefersReducedMotion());
    a.t = duration === 0 ? 1 : Math.min(1, a.t + delta / duration);
    const k = 1 - Math.pow(1 - a.t, 3);
    camera.position.lerpVectors(a.fromPos, a.toPos, k);
    controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
    controls.update();
    if (a.t >= 1) {
      anim.current = null;
      useUiStore.getState().focusShelf(null);
    }
  });

  return null;
}
