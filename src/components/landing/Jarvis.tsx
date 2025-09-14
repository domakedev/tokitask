"use client";
import React, { useState, useEffect } from "react";
import { Float, Text } from "@react-three/drei";
// @ts-expect-error THREE.js types not properly configured
import * as THREE from "three";

// Orbe de IA tipo Jarvis - Giroscopio con efectos lineales avanzados
function JarvisThinkingOrb() {
  // Mensajes de carga de IA con animación secuencial
  const aiLoadingMessages = [
    "Analizando tus tareas...",
    "Calculando tiempos óptimos...",
    "Buscando consejos personalizados...",
    "Organizando tu día...",
    "Preparando tu horario ideal...",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) =>
        prev < aiLoadingMessages.length - 1 ? prev + 1 : 0
      );
    }, 2000); // Cambia cada 2 segundos como en el dashboard

    return () => clearInterval(interval);
  }, [aiLoadingMessages.length]);

  return (
    <group>
      {/* Núcleo principal - Cerebro digital */}
      <Float speed={0.4} rotationIntensity={0.3} floatIntensity={0.1}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.9, 32, 32]} />
          <meshStandardMaterial
            color="#00FFFF"
            emissive="#00FFFF"
            emissiveIntensity={0.5}
            transparent
            opacity={0.95}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </Float>

      {/* Sistema giroscópico - Anillos principales */}
      {Array.from({ length: 5 }, (_, i) => (
        <Float key={`gyro-${i}`} speed={0.2 + i * 0.15} rotationIntensity={0.2}>
          <mesh position={[0, 0, 0]} rotation={[i * Math.PI / 5, i * Math.PI / 3, i * Math.PI / 4]}>
            <torusGeometry args={[1.1 + i * 0.2, 0.015, 8, 32]} />
            <meshStandardMaterial
              color="#00FFFF"
              emissive="#00FFFF"
              emissiveIntensity={0.4 - i * 0.05}
              transparent
              opacity={0.5 - i * 0.05}
            />
          </mesh>
        </Float>
      ))}

      {/* Líneas orbitales - Efectos giroscópicos */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 1.5;
        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;
        const x2 = Math.cos(angle + Math.PI) * radius;
        const z2 = Math.sin(angle + Math.PI) * radius;

        return (
          <Float key={`orbit-${i}`} speed={0.4 + i * 0.1} rotationIntensity={0.1}>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([x1, 0, z1, x2, 0, z2]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color="#00FFFF"
                opacity={0.7}
                transparent
                linewidth={2}
              />
            </line>
          </Float>
        );
      })}

      {/* Partículas de datos procesándose - Más dinámicas */}
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const radius = 2.2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(i * 0.4) * 0.5;

        return (
          <Float
            key={`data-${i}`}
            speed={0.5 + i * 0.08}
            rotationIntensity={0.4}
            floatIntensity={0.2}
          >
            <mesh position={[x, y, z]}>
              <boxGeometry args={[0.06, 0.06, 0.06]} />
              <meshStandardMaterial
                color="#00FFFF"
                emissive="#00FFFF"
                emissiveIntensity={0.7}
                transparent
                opacity={0.9}
              />
            </mesh>
          </Float>
        );
      })}

      {/* Efectos de energía múltiples */}
      {Array.from({ length: 3 }, (_, i) => (
        <Float key={`energy-${i}`} speed={0.3 + i * 0.2} rotationIntensity={0.2}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[1.8 + i * 0.3, 16, 16]} />
            <meshBasicMaterial
              color="#00FFFF"
              transparent
              opacity={0.08 - i * 0.02}
            />
          </mesh>
        </Float>
      ))}

      {/* Anillos de estabilización giroscópica */}
      {Array.from({ length: 4 }, (_, i) => (
        <Float key={`stabilizer-${i}`} speed={0.6 + i * 0.1} rotationIntensity={0.5}>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, i * Math.PI / 2]}>
            <torusGeometry args={[2.5 + i * 0.2, 0.01, 4, 16]} />
            <meshStandardMaterial
              color="#00FFFF"
              emissive="#00FFFF"
              emissiveIntensity={0.2}
              transparent
              opacity={0.3}
            />
          </mesh>
        </Float>
      ))}

    </group>
  );
}

export default JarvisThinkingOrb;