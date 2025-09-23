import React, { useState } from "react";
import { DayTask, GeneralTask, UserData, Page } from "../types";
import CurrentDate from "./CurrentDate";
import RemainingTime from "./RemainingTime";
import TaskList from "./TaskList";
import CalendarView from "./CalendarView";
import AiTipCard from "./AiTipCard";
import FreeTimeCard from "./FreeTimeCard";
import Icon from "./Icon";
import {
  getCurrentWeekDayName,
  getCurrentWeekDay,
  parseDurationToMinutes,
} from "../utils/dateUtils";
import CopyPasteButtons from "./CopyPasteButtons";

interface DayViewProps {
  userData: UserData;
  isSyncing: boolean;
  aiTip: string | null;
  freeTime: string | null;
  onStartDay: () => void;
  onSyncWithAI: () => void;
  onSyncWithPseudoAI: () => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (tasks: (DayTask | GeneralTask)[]) => void;
  onEdit: (id: string) => void;
  onUpdateAiDuration: (id: string, duration: string) => void;
  tempEndOfDay: string;
  setTempEndOfDay: (value: string) => void;
  onDismissAiTip: () => void;
  onNavigate: (page: Page) => void;
  onNavigateToGeneralCalendar: () => void;
}

const DayView: React.FC<DayViewProps> = ({
  userData,
  isSyncing,
  aiTip,
  freeTime,
  onStartDay,
  onSyncWithAI,
  onSyncWithPseudoAI,
  onToggleComplete,
  onDelete,
  onReorder,
  onEdit,
  onUpdateAiDuration,
  tempEndOfDay,
  setTempEndOfDay,
  onDismissAiTip,
  onNavigate,
  onNavigateToGeneralCalendar,
}) => {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Validación para desactivar botones si ya pasó la hora de fin del día
  const currentTime = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const isPastEndOfDay = currentTime > userData.endOfDay;

  // Calcular estadísticas de sobrecarga
  const totalBaseMinutes = userData.dayTasks.reduce(
    (sum, task) => sum + parseDurationToMinutes(task.baseDuration),
    0
  );
  const availableMinutes =
    parseDurationToMinutes(userData.endOfDay) -
    parseDurationToMinutes(currentTime);
  const overloadMinutes = totalBaseMinutes - availableMinutes;
  let overloadMessage = "";
  let overloadClass = "";
  if (overloadMinutes > 0) {
    const overloadHours = Math.floor(overloadMinutes / 60);
    if (overloadHours >= 3) {
      overloadMessage = `🚨 Sobrecarga crítica: Tus tareas suman ${overloadHours}h ${
        overloadMinutes % 60
      }min más que el tiempo disponible.`;
      overloadClass = "bg-red-900/50 border-red-500/50 text-red-200";
    } else if (overloadHours >= 2) {
      overloadMessage = `⚠️ Sobrecarga alta: Tus tareas exceden en ${overloadHours}h ${
        overloadMinutes % 60
      }min.`;
      overloadClass = "bg-yellow-900/50 border-yellow-500/50 text-yellow-200";
    } else if (overloadHours >= 1) {
      overloadMessage = `🟡 Sobrecarga moderada: Tus tareas superan en ${overloadHours}h ${
        overloadMinutes % 60
      }min.`;
      overloadClass = "bg-orange-900/50 border-orange-500/50 text-orange-200";
    } else if (overloadMinutes >= 0) {
      overloadMessage = `🔴 Sobrecarga leve: Tus tareas exceden en ${overloadMinutes}min.`;
      overloadClass = "bg-purple-900/50 border-purple-500/50 text-purple-200";
    }
  } else if (overloadMinutes <= 0) {
    overloadMessage = "Estas dentro del tiempo disponible. ¡Bien hecho!";
    overloadClass = "bg-emerald-900/50 border-emerald-500/50 text-emerald-200";
  }

  return (
    <div>
      <header className="p-2 md:p-4 space-y-2 md:space-y-4 bg-slate-900/80 backdrop-blur-sm z-10">
        <div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-white">
                Mi día {getCurrentWeekDayName()}
              </h1>
              <CurrentDate />
            </div>
            <div className="text-right">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 md:space-x-6 space-y-1 sm:space-y-0">
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
          {/* Toggle de vista */}
          {userData.dayTasks.length > 0 && (
            <div className="flex justify-center mt-4">
              <div className="bg-slate-800 rounded-lg p-1 flex">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Icon name="list" className="inline mr-2 h-4 w-4" />
                  Hoy modo Lista
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "calendar"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Icon name="calendar" className="inline mr-2 h-4 w-4" />
                  Hoy modo Calendario
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botón para ir al calendario de General */}
        <div className="flex justify-center mt-2">
          <button
            onClick={onNavigateToGeneralCalendar}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm font-medium"
          >
            <Icon name="calendar" className="h-4 w-4" />
            Ver Calendario General
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center sm:space-x-2 md:space-x-3 gap-2">
          <button
            onClick={onStartDay}
            disabled={
              isSyncing ||
              isPastEndOfDay ||
              (!userData.generalTasks?.length &&
                !userData.weeklyTasks?.[getCurrentWeekDay()]?.length)
            }
            className="flex-1 w-full bg-emerald-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clonar horario del día
          </button>
          <button
            onClick={onSyncWithAI}
            disabled={
              isSyncing || isPastEndOfDay || userData.dayTasks.length === 0
            }
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

          <button
            onClick={onSyncWithPseudoAI}
            disabled={
              isSyncing || isPastEndOfDay || userData.dayTasks.length === 0
            }
            className="flex-1 w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? "Calculando..." : "Calcular con Pseudo IA"}
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
              animation: gradientMove 10s ease-in-out infinite;
            }
          `}</style>
        </div>

        <div className="text-center text-xs text-slate-400 mt-2 space-y-1">
          <p><strong>Organizar tiempos con IA:</strong> Respeta horarios fijos, demora hasta 1 minuto.</p>
          <p><strong>Calcular con Pseudo IA:</strong> Responde en segundos, no respeta horarios fijos.</p>
        </div>

        {/* Mensaje informativo para Día */}
        <div className="text-center mb-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              <Icon name="info" className="inline mr-2 h-4 w-4" />
              Esta es tu día de hoy. Aquí se mostraran tus tareas programadas:{" "}
              <br /> <strong>semanales repetitivas</strong> +{" "}
              <strong>las de calendario de día específico.</strong>
            </p>
            <p className="text-xs text-blue-400 mt-2">
              <Icon name="bell" className="inline mr-1 h-3 w-3" />
              Las tareas de calendario te avisarán automáticamente a las 6:00 AM
            </p>
          </div>
        </div>
      </header>
      <main className="px-2 md:px-6 mt-2 md:mt-4">
        {/* Botones de copiar/pegar */}
        <CopyPasteButtons />
        {userData.dayTasks.length > 0 ? (
          <>
            {aiTip && (
              <div className="mb-2 md:mb-4">
                <AiTipCard tip={aiTip} onDismiss={onDismissAiTip} />
              </div>
            )}
            {overloadMessage && (
              <div
                className={`mb-2 md:mb-4 p-3 md:p-4 rounded-lg border ${overloadClass}`}
              >
                <p className="text-sm font-medium">{overloadMessage}</p>
                <p className="text-xs mt-1 opacity-80">
                  Tiempo disponible: {Math.floor(availableMinutes / 60)}h{" "}
                  {availableMinutes % 60}min | Tiempo requerido idealmente:{" "}
                  {Math.floor(totalBaseMinutes / 60)}h {totalBaseMinutes % 60}
                  min
                </p>
                {/* mensaje de consejo elimina algunas tareas o reduce su tiempo */}
                <p className="mt-2 text-xs italic opacity-80">
                  👨‍🏫 La IA te ayudara a organizar tus tiempos pero considera
                  eliminar algunas tareas para ajustar tu día al tiempo
                  disponible.
                </p>
              </div>
            )}
            {viewMode === "list" ? (
              <TaskList
                tasks={userData.dayTasks}
                isDaily={true}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onReorder={onReorder}
                onEdit={onEdit}
                onUpdateAiDuration={onUpdateAiDuration}
              />
            ) : (
              <CalendarView
                tasks={userData.dayTasks}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            )}
            {freeTime ? (
              <FreeTimeCard duration={freeTime} />
            ) : (
              <div className="mt-2 md:mt-4 p-2 md:p-4 rounded-lg border border-dashed border-slate-500/30 bg-slate-800/20 flex items-center space-x-2 md:space-x-4">
                <div className="flex-shrink-0">
                  <Icon
                    name="clock"
                    className="h-4 w-4 md:h-6 md:w-6 text-slate-400"
                  />
                </div>
                <div className="flex-grow">
                  <p className="font-semibold text-white">Sin tiempo libre</p>
                  <p className="text-xs md:text-sm text-slate-300">
                    No hay tiempo libre disponible para hoy
                  </p>
                </div>
              </div>
            )}
          </>
        ) : userData.generalTasks.length > 0 ? (
          <div className="text-center py-8 md:py-16 px-4 md:px-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <Icon
              name="sunrise"
              className="h-8 w-8 md:h-12 md:w-12 text-slate-500 mx-auto"
            />
            <h2 className="mt-2 md:mt-4 text-lg md:text-xl font-bold text-white">
              ¿Listo para empezar?
            </h2>
            <p className="mt-1 md:mt-2 text-xs md:text-sm text-slate-400">
              Haz clic en{" "}
              <span className="font-semibold text-emerald-400">
                Clonar horario del día
              </span>{" "}
              para usar tu plantilla de &quot;Horario General&quot; y generar tu
              plan de hoy con IA. <br /> <br /> O crea tareas independientes.
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-500 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 ml-1 md:ml-2">
                <Icon
                  name="plus"
                  className="text-slate-100 w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5"
                />
              </span>
            </p>
          </div>
        ) : (
          <div className="text-center py-8 md:py-16 px-4 md:px-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <Icon
              name="clipboard-list"
              className="h-8 w-8 md:h-12 md:w-12 text-slate-500 mx-auto"
            />
            <h2 className="mt-2 md:mt-4 text-lg md:text-xl font-bold text-white">
              Crea tu plantilla primero
            </h2>
            <p className="mt-1 md:mt-2 text-xs md:text-sm text-slate-400">
              Para poder clonar un horario, primero necesitas crear uno con sus
              tareas en la sección &quot;Horario&quot;.
            </p>
            <button
              onClick={() => onNavigate(Page.General)}
              className="mt-4 md:mt-6 bg-emerald-500 text-white font-semibold py-2 px-4 md:py-3 md:px-6 rounded-lg shadow-lg hover:bg-emerald-600 transition-colors duration-150 ease-in-out"
            >
              Ir a Horario para crear uno
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DayView;
