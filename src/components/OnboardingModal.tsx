"use client";
import React, { useState } from "react";
import Icon from "./Icon";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const steps = [
  {
    title: "¡Bienvenido a TokiTask!",
    description: "Tu planificador y Habit Tracker diario con IA. Vamos a configurarlo juntos en pocos pasos.",
    icon: "Sparkles",
  },
  {
    title: "Crea tu primera tarea",
    description: "Mas adelante toca el botón verde '+' para agregar una tarea que harás hoy o crea tu horario general/diario.",
    icon: "Plus",
  },
  {
    title: "Configura tu horario diario",
    description: "En 'Horario General', establece a qué hora terminas el día para que la IA optimice tu tiempo y crea tareas para cada dia de la semana.",
    icon: "Clock",
  },
  {
    title: "¡Listo para empezar!",
    description: "La IA organizará tus tareas automáticamente. ¡Disfruta de días más productivos!",
    icon: "CheckCircle",
  },
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md text-center">
        <div className="mb-6">
          <Icon name={step.icon} className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
          <p className="text-slate-300">{step.description}</p>
        </div>

        {/* Indicadores de pasos */}
        <div className="flex justify-center mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full mx-1 ${
                index === currentStep ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-4 py-2 bg-slate-600 rounded-md hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-emerald-600 rounded-md hover:bg-emerald-500"
          >
            {currentStep === steps.length - 1 ? "¡Comenzar!" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;