"use client";
import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import AiThinkingSection from "../AiThinkingSection";

// Componente principal del Hero
const Hero = () => {
  const router = useRouter();
  const { user } = useAuth();
  console.log("🚀 ~ Hero ~ user:", user)

  // Mensajes de carga de IA con animación secuencial
  const aiLoadingMessages = [
    "Analizando tus tareas...",
    "Calculando tiempos óptimos...",
    "Buscando consejos personalizados...",
    "Organizando tu día...",
    "Preparando tu horario ideal...",
  ];

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
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 mt-24 md:mt-28 sm:mt-20 md:mt-0">
              Gestiona tu tiempo con IA y
              <span className="block text-cyan-400">construye Hábitos</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto lg:mx-0"
            >
              Organiza tus tareas diarias con IA que optimiza el tiempo de tus actividades, maximiza tu tiempo disponible y construye hábitos duraderos rastreando tu progreso con sincronización automática.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex justify-center lg:justify-start"
            >
              <button
                onClick={() => router.push(user ? "/dashboard" : "/login")}
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
          >
            <AiThinkingSection messages={aiLoadingMessages} isActive={true} />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;