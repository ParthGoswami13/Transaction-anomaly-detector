import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTheme } from '../context/ThemeContext';
import * as THREE from 'three';

function MovingGrid() {
  const gridRef = useRef();
  const { theme } = useTheme();

  // Color mapping based on theme
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#3b82f6' : '#93c5fd'; // Neon blue in dark, soft blue in light
  const fadeColor = isDark ? '#0a0e1a' : '#f8fafc'; // Background color to fade into
  const opacity = isDark ? 0.4 : 0.1; // More visible in dark mode

  useFrame((state, delta) => {
    if (gridRef.current) {
      // Move the grid towards the camera to simulate forward motion
      gridRef.current.position.z += delta * 2;
      // Reset position to loop the animation seamlessly
      if (gridRef.current.position.z > 2) {
        gridRef.current.position.z -= 2;
      }
    }
  });

  return (
    <group>
      {/* A large grid helper for the wireframe look */}
      <gridHelper
        ref={gridRef}
        args={[100, 50, gridColor, gridColor]}
        position={[0, -2, -10]}
        rotation={[0, 0, 0]}
      >
        <lineBasicMaterial attach="material" color={gridColor} transparent opacity={opacity} />
      </gridHelper>
      
      {/* Fog to hide the far edge of the grid and blend it into the background */}
      <fog attach="fog" args={[fadeColor, 5, 25]} />
    </group>
  );
}

function Particles() {
  const particlesRef = useRef();
  const { theme } = useTheme();
  
  const isDark = theme === 'dark';
  
  // Create random points
  const [positions] = React.useState(() => {
    const pos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;     // x
      pos[i * 3 + 1] = Math.random() * 20 - 2;     // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40; // z
    }
    return pos;
  });

  useFrame((state, delta) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.05;
    }
  });

  if (!isDark) return null; // Only show particles in dark mode for performance & aesthetics

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#8b5cf6"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export default function Background3D() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        background: isDark ? '#0a0e1a' : 'transparent',
        transition: 'background-color 0.5s ease',
      }}
    >
      <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <MovingGrid />
        <Particles />
      </Canvas>
    </div>
  );
}
