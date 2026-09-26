'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Center, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSessionStore } from '@/stores/sessionStore';

interface ThreeDViewerProps {
  modelUrl?: string;
  isTeacher?: boolean;
  onManualRotate?: (dx: number, dy: number) => void;
  onManualZoom?: (delta: number) => void;
}

// Interactive Educational 3D Anatomy Model (Heart / Cellular Organ)
function ProceduralAnatomyModel({ highlighted }: { highlighted?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (coreRef.current) {
      // Subtle organic heartbeat pulsation
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      coreRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group>
      {/* Outer Organ Shell */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <torusKnotGeometry args={[1.2, 0.4, 128, 32, 2, 3]} />
        <meshStandardMaterial
          color={highlighted ? '#ec4899' : '#e11d48'}
          emissive={highlighted ? '#f43f5e' : '#881337'}
          emissiveIntensity={highlighted ? 0.6 : 0.25}
          roughness={0.2}
          metalness={0.4}
          wireframe={false}
        />
      </mesh>

      {/* Internal Glowing Core (Heart Chamber) */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Circulatory Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.0, 0.04, 16, 100]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <torusGeometry args={[2.2, 0.03, 16, 100]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function SceneContainer() {
  const transform = useSessionStore((s) => s.transform);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      // Smooth interpolation to target rotation & zoom
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, transform.rotationY, 0.15);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, transform.rotationX, 0.15);
      const targetScale = transform.zoom;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <Center>
          <ProceduralAnatomyModel highlighted={Boolean(transform.highlightedMeshName)} />
        </Center>
      </Float>
    </group>
  );
}

export default function ThreeDViewer({ isTeacher }: ThreeDViewerProps) {
  const transform = useSessionStore((s) => s.transform);
  const resetTransform = useSessionStore((s) => s.resetTransform);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full"
      >
        <color attach="background" args={['#070a13']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
        <pointLight position={[-5, -5, -5]} color="#6366f1" intensity={1.0} />
        <pointLight position={[5, -2, 2]} color="#06b6d4" intensity={1.2} />

        <Stars radius={50} depth={30} count={1200} factor={3} saturation={0.5} fade speed={1} />

        <Suspense fallback={null}>
          <SceneContainer />
        </Suspense>

        <OrbitControls
          enableRotate={!isTeacher} // Students can view, teacher gesture authoritative
          enableZoom={true}
          enablePan={false}
          maxDistance={8}
          minDistance={1.5}
        />
      </Canvas>

      {/* Floating 3D HUD / Gestures Indicator */}
      <div className="absolute top-4 left-4 glass-panel px-4 py-2.5 rounded-xl flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <div className="text-xs font-mono">
          <span className="text-slate-400">RotX: </span>
          <span className="text-cyan-400">{(transform.rotationX * (180 / Math.PI)).toFixed(1)}°</span>
          <span className="text-slate-400 ml-2">RotY: </span>
          <span className="text-cyan-400">{(transform.rotationY * (180 / Math.PI)).toFixed(1)}°</span>
          <span className="text-slate-400 ml-2">Zoom: </span>
          <span className="text-indigo-400">{transform.zoom.toFixed(2)}x</span>
        </div>
      </div>

      {/* Quick Controls */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={resetTransform}
          className="glass-panel hover:bg-slate-800/80 px-3 py-1.5 rounded-lg text-xs text-slate-300 transition-all font-medium"
        >
          ↺ Reset View
        </button>
      </div>
    </div>
  );
}
