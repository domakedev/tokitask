"use client";
import React from "react";

// Sistema de partículas IA simplificado
function AIParticles() {
  const particlesCount = 50;
  const positions = React.useMemo(() => {
    const pos = [];
    for (let i = 0; i < particlesCount; i++) {
      pos.push((Math.random() - 0.5) * 20); // x
      pos.push((Math.random() - 0.5) * 20); // y
      pos.push((Math.random() - 0.5) * 20); // z
    }
    return new Float32Array(pos);
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00FFFF"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export default AIParticles;