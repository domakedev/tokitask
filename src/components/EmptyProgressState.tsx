import React from "react";
import { Page } from "../types";
import Icon from "./Icon";

interface EmptyProgressStateProps {
  onNavigate: (page: Page) => void;
}

const EmptyProgressState: React.FC<EmptyProgressStateProps> = ({ onNavigate }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="text-center py-8 md:py-16 px-4 md:px-6 bg-slate-800/50 rounded-lg border border-slate-700 mx-auto">
        <Icon
          name="trendingUp"
          className="h-12 w-12 md:h-16 md:w-16 text-emerald-500 mx-auto mb-4"
        />
        <h2 className="text-lg md:text-xl font-bold text-white mb-2">
          ¡Comienza tu viaje de hábitos!
        </h2>
        <div className="mb-6">
          <p className="text-sm md:text-base text-slate-400 mb-3">
            Para ver tu progreso, necesitas crear tareas y marcarlas como <span className="text-purple-400 font-semibold bg-purple-900/20 px-2 py-1 rounded-full border border-purple-500/30">Hábito</span> al editarlas.
          </p>
          <p className="text-sm text-slate-500">
            Esto te ayudará a construir hábitos saludables y rastrear tu crecimiento a lo largo del tiempo.
          </p>
        </div>
        <button
          onClick={() => onNavigate(Page.General)}
          className="bg-emerald-500 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-emerald-600 transition-colors duration-150 ease-in-out"
        >
          Ir a Horario para crear tareas
        </button>
      </div>
    </div>
  );
};

export default EmptyProgressState;