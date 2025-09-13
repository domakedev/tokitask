import React, { useCallback } from "react";
import { GeneralTask, UserData, BaseTask } from "../types";
import TaskList from "./TaskList";

interface GeneralViewProps {
  userData: UserData;
  onSaveTask: (task: BaseTask | Omit<BaseTask, "id">) => void;
  onDelete: (id: number) => void;
  onReorder: (tasks: (GeneralTask)[]) => void;
  onEdit: (id: number) => void;
  onToggleComplete: (id: number) => void;
  onSetEndOfDay: (endOfDay: string) => void;
  tempEndOfDay: string;
  setTempEndOfDay: (value: string) => void;
}

const GeneralView: React.FC<GeneralViewProps> = ({
  userData,
  onDelete,
  onReorder,
  onEdit,
  onToggleComplete,
  onSetEndOfDay,
  tempEndOfDay,
  setTempEndOfDay,
}) => {
  const handleSetEndOfDay = useCallback(() => {
    if (tempEndOfDay) {
      onSetEndOfDay(tempEndOfDay);
    }
  }, [tempEndOfDay, onSetEndOfDay]);

  return (
    <div>
      <header className="p-4 sm:p-6 space-y-4 sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
        <div>
          <h1 className="text-2xl font-bold text-white">Horario General</h1>
          <p className="text-sm text-slate-400">
            Plantilla de tareas y configuración
          </p>
        </div>
      </header>
      <main className="px-4 sm:px-6 mt-4">
        <div className="mb-6 p-4 bg-slate-800 rounded-lg">
          <label
            htmlFor="end-of-day"
            className="block text-base font-semibold text-white mb-2"
          >
            Hora de finalización del día
          </label>
          <p className="text-sm text-slate-400 mb-3">
            La IA usará esta hora como límite para organizar tus tareas
            diarias.
          </p>
          <p className="text-xs text-slate-500 mb-3">
            Máximo se puede poner las 23:59.
          </p>
          <div className="flex items-center space-x-3">
            <input
              type="time"
              id="end-of-day"
              value={tempEndOfDay}
              onChange={(e) => setTempEndOfDay(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleSetEndOfDay}
              className="bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-emerald-700"
            >
              Actualizar
            </button>
          </div>
        </div>
        <TaskList
          tasks={userData.generalTasks}
          isDaily={false}
          onDelete={onDelete}
          onReorder={onReorder}
          onEdit={onEdit}
          onToggleComplete={onToggleComplete}
        />
      </main>
    </div>
  );
};

export default GeneralView;