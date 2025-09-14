"use client";
import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Float, Text } from "@react-three/drei";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Jarvis from "./Jarvis";
// @ts-expect-error THREE.js types not properly configured
import * as THREE from "three";

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

// Componente principal del Hero
const Hero = () => {
  const router = useRouter();

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
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black pt-12 sm:pt-6 md:pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Contenido de texto - Izquierda */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 mt-24 sm:mt-20 md:mt-0">
              Gestiona tu tiempo
              <span className="block text-cyan-400">con IA</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto lg:mx-0"
            >
              Organiza tus tareas diarias con IA que optimiza el orden de tus actividades
              y maximiza tu tiempo libre con sincronización automática.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex justify-center lg:justify-start"
            >
              <button
                onClick={() => router.push("/dashboard")}
                className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25"
              >
                Comenzar Ahora
              </button>
            </motion.div>
          </motion.div>

          {/* Animación Three.js - Derecha */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative h-96 lg:h-[500px] flex items-center justify-center"
          >
            {/* Modal de mensajes de IA */}
            <motion.div
              key={currentMessageIndex}
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="bg-black/80 backdrop-blur-md border border-cyan-400/50 rounded-lg px-6 py-4 shadow-2xl shadow-cyan-400/20">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-cyan-400 font-semibold text-lg text-center whitespace-nowrap"
                >
                  {aiLoadingMessages[currentMessageIndex]}
                </motion.p>
              </div>
            </motion.div>
            <Canvas
              camera={{ position: [0, 0, 6], fov: 60 }}
              gl={{ antialias: true, alpha: true }}
            >
              <Suspense fallback={null}>
                {/* Iluminación */}
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#00FFFF" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ffffff" />

                {/* Elementos 3D */}
                <Jarvis />
                <AIParticles />

                {/* Controles orbitales sutiles */}
                <OrbitControls
                  enableZoom={false}
                  enablePan={false}
                  autoRotate
                  autoRotateSpeed={0.3}
                  maxPolarAngle={Math.PI / 2}
                  minPolarAngle={Math.PI / 2}
                />
              </Suspense>
            </Canvas>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;