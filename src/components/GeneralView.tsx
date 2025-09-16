import React, { useCallback, useState, useMemo } from "react";
import { GeneralTask, UserData, BaseTask, WeekDay } from "../types";
import TaskList from "./TaskList";
import WeekDayTabs from "./WeekDayTabs";
import DayTaskNotice from "./DayTaskNotice";

interface GeneralViewProps {
  userData: UserData;
  onSaveTask: (task: BaseTask | Omit<BaseTask, "id">) => void;
  onSaveTaskForDay?: (task: BaseTask | Omit<BaseTask, "id">, day: WeekDay) => void;
  onDelete: (id: string) => void;
  onDeleteWeekly?: (id: string) => void;
  onReorder: (tasks: (GeneralTask)[]) => void;
  onReorderWeekly?: (tasks: GeneralTask[]) => void;
  onEdit: (id: string) => void;
  onEditWeekly?: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onToggleWeekly?: (id: string) => void;
  onSetEndOfDay: () => void;
  tempEndOfDay: string;
  setTempEndOfDay: (value: string) => void;
  onTabChange?: (tab: WeekDay) => void;
}

const GeneralView: React.FC<GeneralViewProps> = ({
  userData,
  onSaveTask,
  onSaveTaskForDay,
  onDelete,
  onDeleteWeekly,
  onReorder,
  onReorderWeekly,
  onEdit,
  onEditWeekly,
  onToggleComplete,
  onToggleWeekly,
  onSetEndOfDay,
  tempEndOfDay,
  setTempEndOfDay,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<WeekDay>(WeekDay.All);

  const handleTabChange = useCallback((tab: WeekDay) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  const handleSetEndOfDay = useCallback(() => {
    onSetEndOfDay();
  }, [onSetEndOfDay]);

  // Obtener las tareas para la pestaña activa
  const currentTasks = useMemo(() => {
    if (activeTab === WeekDay.All) {
      return userData.generalTasks;
    }
    return userData.weeklyTasks?.[activeTab] || [];
  }, [userData, activeTab]);

  // Funciones específicas para tareas de días
  const handleDeleteWeeklyTask = useCallback((taskId: string) => {
    if (activeTab !== WeekDay.All && onDeleteWeekly) {
      onDeleteWeekly(taskId);
    } else {
      onDelete(taskId);
    }
  }, [activeTab, onDelete, onDeleteWeekly]);

  const handleEditWeeklyTask = useCallback((taskId: string) => {
    if (activeTab !== WeekDay.All && onEditWeekly) {
      onEditWeekly(taskId);
    } else {
      onEdit(taskId);
    }
  }, [activeTab, onEdit, onEditWeekly]);

  const handleToggleWeeklyTask = useCallback((taskId: string) => {
    if (activeTab !== WeekDay.All && onToggleWeekly) {
      onToggleWeekly(taskId);
    } else {
      onToggleComplete(taskId);
    }
  }, [activeTab, onToggleComplete, onToggleWeekly]);

  const handleReorderWeeklyTasks = useCallback((tasks: GeneralTask[]) => {
    if (activeTab !== WeekDay.All && onReorderWeekly) {
      onReorderWeekly(tasks);
    } else {
      onReorder(tasks);
    }
  }, [activeTab, onReorder, onReorderWeekly]);

  return (
    <div>
      <header className="p-2 md:p-4 space-y-2 md:space-y-4 sticky top-0 bg-slate-800/80 backdrop-blur-sm z-10">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-white">Horario General</h1>
          <p className="text-xs md:text-sm text-slate-400">
            Plantilla de tareas y configuración por día
          </p>
        </div>
        <div className="p-2 md:p-4 bg-slate-800 rounded-lg">
          <label
            htmlFor="end-of-day"
            className="block text-sm md:text-base font-semibold text-white mb-2"
          >
            Hora de finalización para todos los días
          </label>
          <div className="flex items-center space-x-2 md:space-x-3">
            <input
              type="time"
              id="end-of-day"
              value={tempEndOfDay}
              onChange={(e) => setTempEndOfDay(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-1 px-2 md:py-2 md:px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={handleSetEndOfDay}
              className="bg-emerald-500 text-white font-semibold py-1 px-3 md:py-2 md:px-4 rounded-lg shadow-lg hover:bg-emerald-600 transition-colors duration-150 ease-in-out"
            >
              Actualizar
            </button>
          </div>
        </div>
        <WeekDayTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </header>
      <main className="px-2 md:px-6 mt-2 md:mt-4">
        {activeTab !== WeekDay.All && <DayTaskNotice />}
        <TaskList
          tasks={currentTasks}
          isDaily={false}
          onDelete={activeTab === WeekDay.All ? onDelete : handleDeleteWeeklyTask}
          onReorder={activeTab === WeekDay.All ? onReorder : handleReorderWeeklyTasks}
          onEdit={activeTab === WeekDay.All ? onEdit : handleEditWeeklyTask}
          onToggleComplete={activeTab === WeekDay.All ? onToggleComplete : handleToggleWeeklyTask}
        />

        {/* Espacio para el botón flotante de nueva tarea */}
        <div className="h-20"></div>
      </main>
    </div>
  );
};

export default GeneralView;