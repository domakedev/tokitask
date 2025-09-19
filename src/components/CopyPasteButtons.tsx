import React from "react";
import { WeekDay } from "../types";
import { useTaskStore } from "../stores/taskStore";
import { toast } from "react-toastify";
import Icon from "./Icon";

interface CopyPasteButtonsProps {
  activeTab?: WeekDay;
}

const CopyPasteButtons: React.FC<CopyPasteButtonsProps> = ({ activeTab }) => {
  const { copiedTask, handlePasteTask, clearCopiedTask } = useTaskStore();

  return (
    <div className="flex justify-end space-x-1 sm:space-x-2 mb-2">
      {copiedTask && (
        <button
          onClick={() => {
            clearCopiedTask();
            toast.success("Tarea copiada limpiada.");
          }}
          disabled={!copiedTask}
          className="flex items-center space-x-1 sm:space-x-2 bg-red-600 text-white text-xs sm:text-sm font-medium py-1 px-2 sm:py-2 sm:px-4 rounded-md sm:rounded-lg shadow-sm sm:shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:opacity-50"
        >
          <Icon name="trash2" className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Limpiar Copia</span>
        </button>
      )}
      <button
        onClick={() => handlePasteTask(activeTab)}
        disabled={!copiedTask}
        className={`flex items-center space-x-1 sm:space-x-2 bg-slate-600 text-white text-xs sm:text-sm font-medium py-1 px-2 sm:py-2 sm:px-4 rounded-md sm:rounded-lg shadow-sm sm:shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:opacity-50`}
      >
        <Icon name="clipboard" className="h-3 w-3 sm:h-4 sm:w-4" />
        <span>Pegar</span>
      </button>
    </div>
  );
};

export default CopyPasteButtons;
