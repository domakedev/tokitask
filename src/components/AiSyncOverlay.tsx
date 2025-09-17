"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AiThinkingSection from "./AiThinkingSection";
import Icon from "./Icon";

interface AiSyncOverlayProps {
  isVisible: boolean;
  messages?: string[];
  showLoader?: boolean;
  loaderText?: string;
  showJarvis?: boolean;
}

const AiSyncOverlay: React.FC<AiSyncOverlayProps> = ({
  isVisible,
  messages = [
    "Analizando tus tareas...",
    "Calculando tiempos óptimos...",
    "Buscando consejos personalizados...",
    "Organizando tu día...",
    "Preparando tu horario ideal...",
  ],
  showLoader = true,
  loaderText = "Esto puede tardar hasta un minuto.",
  showJarvis = true,
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setCurrentMessageIndex(0);
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) =>
          prev < messages.length - 1 ? prev + 1 : 0
        );
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isVisible, messages.length]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      {showJarvis && (
        <AiThinkingSection messages={messages} isActive={isVisible} height="h-64" />
      )}

      {showLoader && (
        <>
          <Icon
            name="loader"
            className="h-16 w-16 animate-spin text-emerald-400 mb-6"
          />
          <p className="text-sm text-slate-300 mt-6 text-center">
            {loaderText}
          </p>
        </>
      )}

      {!showJarvis && (
        <div className="relative h-8 w-full flex items-center justify-center overflow-hidden mt-2">
          <span
            key={currentMessageIndex}
            className="absolute w-full text-lg text-white font-semibold transition-all duration-500 ease-in-out animate-slide-up text-center"
            style={{
              animation: "slideUp 0.5s",
            }}
          >
            {messages[currentMessageIndex]}
          </span>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AiSyncOverlay;