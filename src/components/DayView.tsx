import React, { useState, useMemo, useEffect } from "react";
import { DayTask, GeneralTask, UserData, Page } from "../types";
import CurrentDate from "./CurrentDate";
import RemainingTime from "./RemainingTime";
import TaskList from "./TaskList";
import CalendarView from "./CalendarView";
import AiTipCard from "./AiTipCard";
import CongratulationsCard from "./CongratulationsCard";
import FreeTimeCard from "./FreeTimeCard";
import NowFocusCard from "./NowFocusCard";
import TimeBudgetBar from "./TimeBudgetBar";
import Icon from "./Icon";
import ConfirmationModal from "./ConfirmationModal";
import {
  getCurrentWeekDayName,
  getCurrentWeekDay,
  parseDurationToMinutes,
} from "../utils/dateUtils";
import CopyPasteButtons from "./CopyPasteButtons";

interface DayViewProps {
  userData: UserData;
  isSyncing: boolean;
  aiTip: { message: string; type: 'tip' | 'warning' } | null;
  freeTime: string | null;
  onStartDay: () => void;
  onSyncWithAI: () => void;
  onSyncWithPseudoAI: () => void;
  onGetAiAdvice: () => Promise<void>;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (tasks: (DayTask | GeneralTask)[]) => Promise<void>;
  onEdit: (id: string) => void;
  onUpdateAiDuration: (id: string, duration: string) => void;
  tempEndOfDay: string;
  setTempEndOfDay: (value: string) => void;
  onDismissAiTip: () => void;
  onNavigate: (page: Page) => void;
  onNavigateToGeneralCalendar: () => void;
  onRequestClearDay?: () => void;
}

const DayView: React.FC<DayViewProps> = ({
  userData,
  isSyncing,
  aiTip,
  freeTime,
  onStartDay,
  onSyncWithAI,
  onSyncWithPseudoAI,
  onGetAiAdvice,
  onToggleComplete,
  onDelete,
  onReorder,
  onEdit,
  onUpdateAiDuration,
  onDismissAiTip,
  onNavigate,
  onNavigateToGeneralCalendar,
  onRequestClearDay,
}) => {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [showAiModal, setShowAiModal] = useState(false);
  const [showPseudoAiModal, setShowPseudoAiModal] = useState(false);
  const [areOrganizedTasks, setAreOrganizedTasks] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDiscarded, setShowDiscarded] = useState(false);

  // Validación para desactivar botones si ya pasó la hora de fin del día
  const currentTime = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const isPastEndOfDay = currentTime > userData.endOfDay;

  // Verificar si las tareas ya están organizadas (tienen aiDuration)
  useEffect(() => {
    const pending = userData.dayTasks.filter((t) => !t.completed);
    const areTasksOrganized =
      pending.length > 0 &&
      pending.every((task) => task.aiDuration && task.aiDuration.trim() !== "");
    setAreOrganizedTasks(areTasksOrganized);
  }, [userData.dayTasks]);

  // Calcular estadísticas de tiempo
  const totalBaseMinutes = userData.dayTasks
    .filter((task) => !task.completed)
    .reduce((sum, task) => sum + parseDurationToMinutes(task.baseDuration), 0);

  const totalAiMinutes = userData.dayTasks
    .filter((task) => !task.completed)
    .reduce((sum, task) => sum + parseDurationToMinutes(task.aiDuration), 0);

  const availableMinutes =
    parseDurationToMinutes(userData.endOfDay) -
    parseDurationToMinutes(currentTime);

  const requiredMinutes = areOrganizedTasks ? totalAiMinutes : totalBaseMinutes;

  // Estadísticas de completadas
  const completedCount = userData.dayTasks.filter((task) => task.completed).length;

  // Total de tareas programadas para hoy (referencia para el progreso)
  const today = new Date().toLocaleDateString("en-CA");
  const currentWeekDay = getCurrentWeekDay();
  const scheduledTasks =
    userData.calendarTasks?.filter((task) => task.scheduledDate === today) || [];
  const totalTasks =
    userData.generalTasks.length +
    (userData.weeklyTasks?.[currentWeekDay]?.length || 0) +
    scheduledTasks.length;

  const sortedTasks = useMemo(() => {
    const tasks = [...userData.dayTasks];

    // Ordenar por startTime ascendente
    tasks.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });

    // Recalcular isCurrent: la primera no completada y realizable (no descartada)
    const firstPendingIndex = tasks.findIndex(
      (task) => !task.completed && task.aiDuration !== "00:00"
    );
    return tasks.map((task, index) => ({
      ...task,
      isCurrent: index === firstPendingIndex,
    }));
  }, [userData.dayTasks]);

  const pendingTasks = useMemo(
    () => sortedTasks.filter((t) => !t.completed && t.aiDuration !== "00:00"),
    [sortedTasks]
  );
  // Tareas que el planificador dejó "fuera del día" (aiDuration 00:00)
  const discardedTasks = useMemo(
    () => sortedTasks.filter((t) => !t.completed && t.aiDuration === "00:00"),
    [sortedTasks]
  );
  const completedTasks = useMemo(
    () => sortedTasks.filter((t) => t.completed),
    [sortedTasks]
  );
  const currentTask = pendingTasks[0];

  const hasTemplate =
    !!userData.generalTasks?.length ||
    !!userData.weeklyTasks?.[getCurrentWeekDay()]?.length;

  // Reorden seguro: reconstruye el array completo para no perder los otros grupos
  const handleReorderPending = async (reordered: (DayTask | GeneralTask)[]) => {
    await onReorder([...reordered, ...discardedTasks, ...completedTasks]);
  };
  const handleReorderDiscarded = async (reordered: (DayTask | GeneralTask)[]) => {
    await onReorder([...pendingTasks, ...reordered, ...completedTasks]);
  };
  const handleReorderCompleted = async (reordered: (DayTask | GeneralTask)[]) => {
    await onReorder([...pendingTasks, ...discardedTasks, ...reordered]);
  };

  const headerBlock = (
    <header className="p-3 md:p-4 lg:p-0 space-y-3 md:space-y-4 bg-slate-900/80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none z-10">
      {/* Título + tiempo restante (lo más importante, destacado) */}
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-white truncate">
            Mi día · {getCurrentWeekDayName()}
          </h1>
          <CurrentDate />
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400">Te queda</p>
          <RemainingTime
            endOfDay={userData.endOfDay}
            className="text-lg md:text-xl font-bold text-emerald-400"
          />
          <p className="text-[11px] text-slate-500">
            Fin del día {userData.endOfDay}
          </p>
        </div>
      </div>

      {/* Aviso cuando ya pasó el fin del día */}
      {isPastEndOfDay && userData.dayTasks.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-sm text-amber-300 flex items-start gap-2">
          <Icon name="alerttriangle" className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Ya pasó tu hora de fin del día. Ajusta tu hora de fin en tu perfil
            o pasa las tareas pendientes a mañana.
          </span>
        </div>
      )}

      {/* Acciones con jerarquía */}
      {userData.dayTasks.length === 0 ? (
          <button
            onClick={onStartDay}
            disabled={isSyncing || isPastEndOfDay || !hasTemplate}
            className="w-full bg-emerald-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Armar mi día
          </button>
        ) : (
          <div className="space-y-2">
            {/* Acción principal: organizar con IA */}
            <button
              onClick={() => setShowAiModal(true)}
              disabled={isSyncing || isPastEndOfDay}
              className="relative w-full overflow-hidden text-white font-semibold py-3 px-4 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="absolute inset-0 z-0 animate-gradient"
                style={{
                  background:
                    "linear-gradient(270deg, #22d3ee, #34d399, #2563eb, #22d3ee)",
                  backgroundSize: "600% 600%",
                  opacity: 0.95,
                }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Icon name="sparkles" className="h-5 w-5" />
                {isSyncing ? "Calculando..." : "Organizarme con IA"}
              </span>
            </button>

            {/* Acciones secundarias */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowPseudoAiModal(true)}
                disabled={isSyncing || isPastEndOfDay}
                className="flex items-center justify-center gap-1 bg-slate-800 border border-slate-600 text-slate-200 text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Organiza al instante respetando horarios fijos"
              >
                <Icon name="flame" className="h-4 w-4 text-purple-400" />
                Express
              </button>
              <button
                onClick={onGetAiAdvice}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1 bg-slate-800 border border-slate-600 text-slate-200 text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Pide un consejo contextual a la IA"
              >
                <Icon name="lightbulb" className="h-4 w-4 text-orange-400" />
                Consejo
              </button>
              <button
                onClick={onStartDay}
                disabled={isSyncing || isPastEndOfDay || !hasTemplate}
                className="flex items-center justify-center gap-1 bg-slate-800 border border-slate-600 text-slate-200 text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Vuelve a clonar tu horario para hoy"
              >
                <Icon name="repeat" className="h-4 w-4 text-emerald-400" />
                Rehacer
              </button>
            </div>
          </div>
        )}

        <style jsx global>{`
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
    </header>
  );

  return (
    <div>
      {userData.dayTasks.length > 0 ? (
        <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6 lg:items-start lg:px-6 lg:mt-4">
          {/* Panel de control (izquierda en desktop) */}
          <div className="space-y-3 md:space-y-4 lg:sticky lg:top-4">
            {headerBlock}
            <div className="px-2 md:px-6 lg:px-0 space-y-3 md:space-y-4">
              {aiTip && (
                <AiTipCard
                  tip={aiTip.message}
                  type={aiTip.type}
                  onDismiss={onDismissAiTip}
                />
              )}

              {/* Bloque AHORA: la respuesta a "¿qué hago ahora?" */}
              {currentTask && !isPastEndOfDay && (
                <NowFocusCard
                  task={currentTask}
                  endOfDay={userData.endOfDay}
                  onComplete={onToggleComplete}
                  onEdit={onEdit}
                />
              )}

              {/* Medidor de carga del día */}
              <TimeBudgetBar
                availableMinutes={availableMinutes}
                requiredMinutes={requiredMinutes}
                isOrganized={areOrganizedTasks}
                isPastEndOfDay={isPastEndOfDay}
              />

              {completedCount > 0 && (
                <CongratulationsCard
                  completedCount={completedCount}
                  totalTasks={totalTasks}
                />
              )}
            </div>
          </div>

          {/* Listas (derecha en desktop) */}
          <div className="px-2 md:px-6 lg:px-0 mt-2 md:mt-4 lg:mt-0 space-y-3 md:space-y-4 min-w-0">
            {/* Selector de vista + pegar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="bg-slate-800 rounded-lg p-1 flex">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Icon name="list" className="inline mr-1.5 h-4 w-4" />
                  Lista
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "calendar"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Icon name="calendar" className="inline mr-1.5 h-4 w-4" />
                  Calendario
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onNavigateToGeneralCalendar}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Icon name="calendar" className="h-4 w-4" />
                  Calendario general
                </button>
                {onRequestClearDay && (
                  <button
                    onClick={onRequestClearDay}
                    className="text-xs text-red-400/80 hover:text-red-300 flex items-center gap-1 transition-colors"
                    title="Eliminar todas las tareas de hoy"
                  >
                    <Icon name="trash2" className="h-4 w-4" />
                    Limpiar día
                  </button>
                )}
                <CopyPasteButtons />
              </div>
            </div>

            {viewMode === "list" ? (
              pendingTasks.length > 0 ? (
                <TaskList
                  tasks={pendingTasks}
                  isDaily={true}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                  onReorder={handleReorderPending}
                  onEdit={onEdit}
                  onUpdateAiDuration={onUpdateAiDuration}
                />
              ) : (
                <div className="text-center py-8 px-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <Icon
                    name="checkcircle"
                    className="h-10 w-10 text-emerald-500 mx-auto"
                  />
                  <p className="mt-2 font-semibold text-white">
                    ¡No te queda nada pendiente!
                  </p>
                </div>
              )
            ) : (
              <CalendarView
                tasks={sortedTasks}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onEdit={onEdit}
                onReorder={onReorder}
              />
            )}

            {/* Tareas fuera del día: el planificador no les encontró tiempo */}
            {viewMode === "list" && discardedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowDiscarded((v) => !v)}
                  className="w-full flex items-center justify-between text-sm text-amber-300/90 hover:text-amber-200 py-2 px-1 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      name={showDiscarded ? "chevrondown" : "chevronright"}
                      className="h-4 w-4"
                    />
                    Fuera del día ({discardedTasks.length})
                  </span>
                </button>
                {showDiscarded && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 px-1">
                      No alcanzó el tiempo de hoy. Puedes pasarlas a mañana,
                      acortarlas o completarlas igual.
                    </p>
                    <TaskList
                      tasks={discardedTasks}
                      isDaily={true}
                      onToggleComplete={onToggleComplete}
                      onDelete={onDelete}
                      onReorder={handleReorderDiscarded}
                      onEdit={onEdit}
                      onUpdateAiDuration={onUpdateAiDuration}
                      showTimer={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tareas completadas, agrupadas y colapsadas */}
            {viewMode === "list" && completedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="w-full flex items-center justify-between text-sm text-slate-300 hover:text-white py-2 px-1 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      name={showCompleted ? "chevrondown" : "chevronright"}
                      className="h-4 w-4"
                    />
                    Completadas ({completedTasks.length})
                  </span>
                </button>
                {showCompleted && (
                  <TaskList
                    tasks={completedTasks}
                    isDaily={true}
                    onToggleComplete={onToggleComplete}
                    onDelete={onDelete}
                    onReorder={handleReorderCompleted}
                    onEdit={onEdit}
                    onUpdateAiDuration={onUpdateAiDuration}
                    showTimer={false}
                  />
                )}
              </div>
            )}

            {freeTime ? (
              <FreeTimeCard duration={freeTime} />
            ) : (
              <div className="p-3 md:p-4 rounded-lg border border-dashed border-slate-500/30 bg-slate-800/20 flex items-center space-x-3">
                <Icon
                  name="clock"
                  className="h-5 w-5 md:h-6 md:w-6 text-slate-400 flex-shrink-0"
                />
                <div>
                  <p className="font-semibold text-white">Sin tiempo libre</p>
                  <p className="text-xs md:text-sm text-slate-300">
                    No hay tiempo libre disponible para hoy
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {headerBlock}
          <main className="px-2 md:px-6 mt-2 md:mt-4">
            {hasTemplate ? (
              <div className="text-center py-8 md:py-16 px-4 md:px-6 bg-slate-800/50 rounded-lg border border-slate-700">
                <Icon
                  name="sunrise"
                  className="h-8 w-8 md:h-12 md:w-12 text-slate-500 mx-auto"
                />
                <h2 className="mt-2 md:mt-4 text-lg md:text-xl font-bold text-white">
                  ¿Listo para empezar?
                </h2>
                <p className="mt-1 md:mt-2 text-xs md:text-sm text-slate-400">
                  Pulsa{" "}
                  <span className="font-semibold text-emerald-400">
                    Armar mi día
                  </span>{" "}
                  para traer tus tareas de hoy desde tu horario, o crea una tarea
                  suelta con el botón
                  <span className="inline-flex items-center justify-center rounded-full bg-emerald-500 w-5 h-5 ml-1 align-middle">
                    <Icon name="plus" className="text-slate-100 w-3 h-3" />
                  </span>
                </p>
              </div>
            ) : (
              <div className="text-center py-8 md:py-16 px-4 md:px-6 bg-slate-800/50 rounded-lg border border-slate-700">
                <Icon
                  name="clipboardList"
                  className="h-8 w-8 md:h-12 md:w-12 text-slate-500 mx-auto"
                />
                <h2 className="mt-2 md:mt-4 text-lg md:text-xl font-bold text-white">
                  Crea tu plantilla primero
                </h2>
                <p className="mt-1 md:mt-2 text-xs md:text-sm text-slate-400">
                  Para poder armar tu día, primero crea un horario con tus tareas
                  en la sección &quot;Horario&quot;.
                </p>
                <button
                  onClick={() => onNavigate(Page.General)}
                  className="mt-4 md:mt-6 bg-emerald-500 text-white font-semibold py-2 px-4 md:py-3 md:px-6 rounded-lg shadow-lg hover:bg-emerald-600 transition-colors"
                >
                  Ir a Horario para crear uno
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Modal de confirmación para Organizar tiempos con IA */}
      <ConfirmationModal
        isOpen={showAiModal}
        title="Organizar tiempos con IA"
        message="Esta opción respeta los horarios fijos y piensa mejor tu plan, pero puede tardar hasta 1 minuto en responder."
        onConfirm={() => {
          setShowAiModal(false);
          onSyncWithAI();
        }}
        onCancel={() => setShowAiModal(false)}
      />

      {/* Modal de confirmación para Organización Express */}
      <ConfirmationModal
        isOpen={showPseudoAiModal}
        title="Organización Express"
        message="Esta opción responde al instante y respeta los horarios fijos de tus tareas."
        onConfirm={() => {
          setShowPseudoAiModal(false);
          onSyncWithPseudoAI();
        }}
        onCancel={() => setShowPseudoAiModal(false)}
      />
    </div>
  );
};

export default DayView;
