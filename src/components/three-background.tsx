import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { THREE_CONFIG } from '../config';

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const particleCount = THREE_CONFIG.PARTICLE_COUNT;

  // Generate random particles
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, [particleCount]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * THREE_CONFIG.ROTATION_SPEED_X;
      ref.current.rotation.y = state.clock.elapsedTime * THREE_CONFIG.ROTATION_SPEED_Y;
    }
  });

  return (
    <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#d4af37"
        size={THREE_CONFIG.PARTICLE_SIZE}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={THREE_CONFIG.PARTICLE_OPACITY}
      />
    </Points>
  );
}

export function ThreeBackground() {
  return (
    <div id="threejs-bg">
      <Canvas
        camera={{
          position: [0, 0, THREE_CONFIG.CAMERA_POSITION_Z],
          fov: THREE_CONFIG.CAMERA_FOV,
          near: THREE_CONFIG.CAMERA_NEAR,
          far: THREE_CONFIG.CAMERA_FAR,
        }}
        gl={{ alpha: true, antialias: false }}
      >
        <Particles />
      </Canvas>
    </div>
  );
}
