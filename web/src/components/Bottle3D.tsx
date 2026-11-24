import { Environment, Float, Lightformer, RoundedBox, Sparkles } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../scent';

interface Props {
  /** Liquid colour — changes ease in smoothly */
  color: string;
  /** Mist variant: taller, slimmer bottle */
  mist?: boolean;
}

/**
 * A glass perfume bottle in real-time 3D (three.js via react-three-fiber).
 * Loaded lazily, so the 3D library never blocks the first paint.
 */
export default function Bottle3D({ color, mist = false }: Props) {
  return (
    <Canvas
      className="bottle3d"
      dpr={[1, 2]}
      camera={{ position: [0, 0.15, 6.8], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.6}>
        <BottleModel color={color} mist={mist} />
      </Float>
      <Sparkles count={70} scale={[5, 4, 3]} size={2.4} speed={0.35} opacity={0.7} color={color} />

      {/* Studio lighting built from light panels — no HDR file to download */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 4, -3]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#7de2ff" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#c3a6ff" position={[5, 0, 1]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[0, 0, 6]} scale={2} />
      </Environment>
    </Canvas>
  );
}

function BottleModel({ color, mist }: { color: string; mist: boolean }) {
  const group = useRef<THREE.Group>(null);
  const liquid = useRef<THREE.MeshPhysicalMaterial>(null);
  const target = useMemo(() => new THREE.Color(color), [color]);
  const spin = useRef(0);
  const still = useMemo(prefersReducedMotion, []);

  // Body proportions per format
  const body = mist ? { w: 1.05, h: 2.6, d: 0.75 } : { w: 1.7, h: 1.95, d: 0.95 };
  const top = body.h / 2;

  useFrame((state, dt) => {
    if (liquid.current) {
      liquid.current.color.lerp(target, 1 - Math.exp(-dt * 3));
      liquid.current.emissive.copy(liquid.current.color).multiplyScalar(0.4);
    }
    if (group.current) {
      if (!still) spin.current += dt * 0.25;
      // Follow the pointer with damping on top of a slow turntable spin
      const p = state.pointer;
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, Math.sin(spin.current) * 0.5 + p.x * 0.7, 3, dt);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -p.y * 0.25, 3, dt);
    }
  });

  return (
    <group ref={group} position={[0, -0.25, 0]}>
      {/* Liquid (drawn first so the glass layers over it) */}
      <RoundedBox args={[body.w - 0.26, body.h * 0.66, body.d - 0.24]} radius={0.1} smoothness={4} position={[0, -body.h * 0.15, 0]} renderOrder={1}>
        <meshPhysicalMaterial ref={liquid} color={color} roughness={0.12} metalness={0} clearcoat={0.6} transparent opacity={0.92} envMapIntensity={1.2} />
      </RoundedBox>

      {/* Glass: clear shell with strong reflections (no transmission pass needed on a transparent canvas) */}
      <RoundedBox args={[body.w, body.h, body.d]} radius={0.16} smoothness={6} renderOrder={2}>
        <meshPhysicalMaterial
          color="#eef3ff"
          transparent
          opacity={0.2}
          roughness={0.04}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.03}
          envMapIntensity={2.6}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </RoundedBox>

      {/* Label */}
      <mesh position={[0, -0.05, body.d / 2 + 0.005]}>
        <planeGeometry args={[body.w * 0.48, 0.42]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.6} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -0.05, body.d / 2 + 0.008]}>
        <planeGeometry args={[body.w * 0.3, 0.012]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Collar */}
      <mesh position={[0, top + 0.11, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.22, 32]} />
        <meshStandardMaterial color="#d9c7a4" metalness={1} roughness={0.2} />
      </mesh>

      {/* Cap */}
      {mist ? (
        <group position={[0, top + 0.45, 0]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.5, 40]} />
            <meshPhysicalMaterial color="#0c0c10" metalness={0.6} roughness={0.18} clearcoat={1} />
          </mesh>
        </group>
      ) : (
        <RoundedBox args={[0.78, 0.78, 0.78]} radius={0.06} smoothness={4} position={[0, top + 0.61, 0]}>
          <meshPhysicalMaterial color="#0c0c10" metalness={0.6} roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} />
        </RoundedBox>
      )}
    </group>
  );
}
