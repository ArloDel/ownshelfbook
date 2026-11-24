import { Environment, Lightformer } from '@react-three/drei';

/**
 * Warm key light from the window side, a cool soft fill, and a small baked
 * environment (built from light panels, so nothing is downloaded).
 * Units are metres: this sits outside the cm group.
 */
export function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff4e0', '#8a7560', 0.45]} />
      <directionalLight
        position={[3.5, 5, 3]}
        color="#ffe2b8"
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />
      <directionalLight position={[-4, 3, 2]} color="#cfe0ff" intensity={0.35} />
      <Environment resolution={128} environmentIntensity={0.6}>
        <Lightformer form="rect" intensity={2} color="#fff1dc" position={[3, 3, 4]} scale={[4, 3, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#dfe8ff" position={[-4, 2, 2]} scale={[3, 2, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={0.5} color="#c9a982" position={[0, -1, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
    </>
  );
}
