"use client";
import React, { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { motion } from "framer-motion";
import Jarvis from "./landing/Jarvis";
import AIParticles from "./AIParticles";

interface AiThinkingSectionProps {
  messages: string[];
  isActive: boolean;
  height?: string;
}

const AiThinkingSection: React.FC<AiThinkingSectionProps> = ({
  messages,
  isActive,
  height = "h-96 lg:h-[500px]",
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (isActive) {
      setCurrentMessageIndex(0);
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) =>
          prev < messages.length - 1 ? prev + 1 : 0
        );
      }, 2000); // Cambia cada 2 segundos

      return () => clearInterval(interval);
    }
  }, [isActive, messages.length]);

  return (
    <div className={`relative ${height} flex items-center justify-center`}>
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
            {messages[currentMessageIndex]}
          </motion.p>
        </div>
      </motion.div>

      {/* Capa overlay para permitir scroll */}
      <div className="absolute inset-0 z-20" />

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
    </div>
  );
};

export default AiThinkingSection;