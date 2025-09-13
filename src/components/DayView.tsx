import React, { useState, useCallback } from "react";
import { DayTask, GeneralTask, UserData } from "../types";
import CurrentDate from "./CurrentDate";
import RemainingTime from "./RemainingTime";
import TaskList from "./TaskList";
import AiTipCard from "./AiTipCard";
import FreeTimeCard from "./FreeTimeCard";
import Icon from "./Icon";

interface DayViewProps {
  userData: UserData;
  isSyncing: boolean;
  aiTip: string | null;
  freeTime: string | null;
  onStartDay: () => void;
  onSyncWithAI: () => void;
  onToggleComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onReorder: (tasks: (DayTask | GeneralTask)[]) => void;
  onEdit: (id: number) => void;
  onUpdateAiDuration: (id: number, duration: string) => void;
  onSetEndOfDay: (endOfDay: string) => void;
  tempEndOfDay: string;
  setTempEndOfDay: (value: string) => void;
  onDismissAiTip: () => void;
}

const DayView: React.FC<DayViewProps> = ({
  userData,
  isSyncing,
  aiTip,
  freeTime,
  onStartDay,
  onSyncWithAI,
  onToggleComplete,
  onDelete,
  onReorder,
  onEdit,
  onUpdateAiDuration,
  onSetEndOfDay,
  tempEndOfDay,
  setTempEndOfDay,
  onDismissAiTip,
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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white">Mi Día</h1>
              <CurrentDate />
            </div>
            <div className="text-right">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-1 sm:space-y-0">
                <div>
                  <p className="text-xs text-slate-400">Fin del día</p>
                  <p className="font-semibold text-emerald-400">
                    {userData.endOfDay}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Tiempo restante</p>
                  <RemainingTime endOfDay={userData.endOfDay} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center sm:space-x-3 gap-2">
          <button
            onClick={onStartDay}
            disabled={isSyncing || userData.generalTasks.length === 0}
            className="flex-1 w-full bg-emerald-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clonar Horario General
          </button>
          <button
            onClick={onSyncWithAI}
            disabled={isSyncing || userData.dayTasks.length === 0}
            className="flex-1 w-full text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 transition-transform transform disabled:opacity-50 disabled:cursor-not-allowed border-none animate-float animate-gradient"
            style={{
              position: "relative",
              overflow: "hidden",
              boxShadow:
                "0 4px 16px 0 rgba(0, 212, 255, 0.15), 0 1.5px 6px 0 rgba(16, 185, 129, 0.12)",
            }}
          >
            <span
              className="absolute inset-0 z-0 animate-gradient"
              style={{
                background:
                  "linear-gradient(270deg, #22d3ee, #34d399, #2563eb, #22d3ee)",
                backgroundSize: "600% 600%",
                filter: "blur(0.5px)",
                opacity: 0.95,
              }}
            />
            <span className="relative z-10">
              {isSyncing ? "Calculando..." : "Organizar tiempos con IA"}
            </span>
          </button>
          <style jsx global>{`
            @keyframes float {
              0% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(-6px);
              }
              100% {
                transform: translateY(0);
              }
            }
            .animate-float {
              animation: float 2.2s ease-in-out infinite;
            }
            @keyframes gradientMove {
              0% {
                background-position: 0% 50%;
              }
              50% {
                background-position: 100% 50%;
              }
              100% {
                background-position: 0% 50%;
              }
            }
            .animate-gradient {
              animation: gradientMove 20s ease-in-out infinite;
            }
          `}</style>
        </div>
      </header>
      <main className="px-4 sm:px-6 mt-4">
        {userData.dayTasks.length > 0 ? (
          <>
            {aiTip && (
              <div className="mb-4">
                <AiTipCard tip={aiTip} onDismiss={onDismissAiTip} />
              </div>
            )}
            <TaskList
              tasks={userData.dayTasks}
              isDaily={true}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              onReorder={onReorder}
              onEdit={onEdit}
              onUpdateAiDuration={onUpdateAiDuration}
            />
            {freeTime && <FreeTimeCard duration={freeTime} />}
          </>
        ) : userData.generalTasks.length > 0 ? (
          <div className="text-center py-16 px-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <Icon
              name="sunrise"
              className="h-12 w-12 text-slate-500 mx-auto"
            />
            <h2 className="mt-4 text-xl font-bold text-white">
              ¿Listo para empezar?
            </h2>
            <p className="mt-2 text-slate-400">
              Haz clic en{" "}
              <span className="font-semibold text-emerald-400">
                "Empezar Día"
              </span>{" "}
              para usar tu plantilla de 'Horario General' y
              generar tu plan de hoy con IA.
            </p>
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <Icon
              name="clipboard-list"
              className="h-12 w-12 text-slate-500 mx-auto"
            />
            <h2 className="mt-4 text-xl font-bold text-white">
              Crea tu plantilla primero
            </h2>
            <p className="mt-2 text-slate-400">
              Para poder generar un horario, primero necesitas crear una
              plantilla de tareas en la sección 'General'.
            </p>
            <button
              onClick={() => {}}
              className="mt-6 bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-emerald-700"
            >
              Ir a General para crear plantilla
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DayView;