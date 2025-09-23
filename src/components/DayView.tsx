import React, { useState, useMemo } from "react";
import { DayTask, GeneralTask, UserData, Page } from "../types";
import CurrentDate from "./CurrentDate";
import RemainingTime from "./RemainingTime";
import TaskList from "./TaskList";
import CalendarView from "./CalendarView";
import AiTipCard from "./AiTipCard";
import FreeTimeCard from "./FreeTimeCard";
import Icon from "./Icon";
import ConfirmationModal from "./ConfirmationModal";
import Badge, { BadgeProps } from "./Badge";
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
  const [showAiModal, setShowAiModal] = useState(false);
  const [showPseudoAiModal, setShowPseudoAiModal] = useState(false);

  // Validación para desactivar botones si ya pasó la hora de fin del día
  const currentTime = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const isPastEndOfDay = currentTime > userData.endOfDay;

  // Verificar si las tareas ya están organizadas (tienen aiDuration)
  const isOrganized = userData.dayTasks.some(task => task.aiDuration && task.aiDuration.trim() !== '');
  console.log("🚀 ~ DayView ~ isOrganized:", isOrganized)

  // Calcular estadísticas
  const totalBaseMinutes = userData.dayTasks.reduce(
    (sum, task) => sum + parseDurationToMinutes(task.baseDuration),
    0
  );

  const totalAiMinutes = userData.dayTasks.reduce(
    (sum, task) => sum + parseDurationToMinutes(task.aiDuration),
    0
  );

  const availableMinutes =
    parseDurationToMinutes(userData.endOfDay) -
    parseDurationToMinutes(currentTime);

  const overloadMinutes = (isOrganized ? totalAiMinutes : totalBaseMinutes) - availableMinutes;
  console.log("🚀 ~ DayView ~ overloadMinutes:", overloadMinutes)

  // Determinar badges a mostrar
  const getOverloadBadges = () => {
    const badges = [];

    // Badge de tiempo disponible
    const availableHours = Math.floor(availableMinutes / 60);
    const availableMins = availableMinutes % 60;
    badges.push({
      label: `Disponible: ${availableHours}h ${availableMins}min`,
      variant: 'base' as const,
      icon: 'clock'
    });

    // Badge de tiempo requerido/organizado
    const requiredMinutes = isOrganized ? totalAiMinutes : totalBaseMinutes;
    console.log("🚀 ~ getOverloadBadges ~ requiredMinutes:", requiredMinutes)
    const requiredHours = Math.floor(requiredMinutes / 60);
    const requiredMins = requiredMinutes % 60;
    badges.push({
      label: isOrganized ? `Organizado: ${requiredHours}h ${requiredMins}min` : `Requerido: ${requiredHours}h ${requiredMins}min`,
      variant: isOrganized ? ('ai' as const) : ('flexible' as const),
      icon: 'timer'
    });

    if (overloadMinutes > 0) {
      const overloadHours = Math.floor(overloadMinutes / 60);
      let variant: BadgeProps['variant'];
      let label = '';

      if (overloadHours >= 3) {
        variant = 'danger' as const;
        label = `Necesitas: +${overloadHours}h ${overloadMinutes % 60}min`;
      } else if (overloadHours >= 2) {
        variant = 'danger' as const;
        label = `Necesitas: +${overloadHours}h ${overloadMinutes % 60}min`;
      } else if (overloadHours >= 1) {
        variant = 'alert' as const;
        label = `Necesitas: +${overloadHours}h ${overloadMinutes % 60}min`;
      } else {
        variant = 'success' as const;
        label = `Necesitas: +${overloadMinutes}min`;
      }

      badges.push({
        label,
        variant,
        icon: 'trendingup'
      });

      // Badge de consejo solo si no está organizado
      if (!isOrganized) {
        badges.push({
          label: '¡Organízate ahora!',
          variant: 'ai' as const,
          icon: 'lightbulb'
        });
      }
      if (isOrganized) {
        // Badge positivo
        badges.push({
          label: `¡Bien, ahora solo necesitas: ${overloadHours}h y ${overloadMinutes % 60} min más`,
          variant: 'ai' as const,
          icon: 'checkcircle'
        });
      }
    } else {
      // Badge positivo
      badges.push({
        label: '¡Bien, te sobra tiempo!',
        variant: 'ai' as const,
        icon: 'checkcircle'
      });
    }

    return badges;
  };

  const overloadBadges = getOverloadBadges();

  const sortedTasks = useMemo(() => {
    const tasks = [...userData.dayTasks];

    // Ordenar por startTime ascendente
    tasks.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });

    // Recalcular isCurrent: el primer no completado en el orden ordenado
    const firstPendingIndex = tasks.findIndex(task => !task.completed);
    return tasks.map((task, index) => ({
      ...task,
      isCurrent: index === firstPendingIndex
    }));
  }, [userData.dayTasks]);

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
            onClick={() => setShowAiModal(true)}
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
              {isSyncing ? "Calculando..." : "Organizarme con IA"}
            </span>
          </button>

          <button
            onClick={() => setShowPseudoAiModal(true)}
            disabled={
              isSyncing || isPastEndOfDay || userData.dayTasks.length === 0
            }
            className="flex-1 w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? "Calculando..." : "Organización Express⚡"}
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

        {/* Mensaje informativo para Día */}
        <div className="text-center mb-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              <Icon name="info" className="inline mr-2 h-4 w-4" />
              Aquí verás tus tareas semanales y de calendario para <strong>Hoy</strong>
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
            {overloadBadges.length > 0 && (
              <div className="mb-2 md:mb-4 flex flex-wrap gap-2">
                {overloadBadges.map((badge, index) => (
                  <Badge
                    key={index}
                    label={badge.label}
                    variant={badge.variant}
                    icon={badge.icon}
                  />
                ))}
              </div>
            )}
            {viewMode === "list" ? (
              <TaskList
                tasks={sortedTasks}
                isDaily={true}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onReorder={onReorder}
                onEdit={onEdit}
                onUpdateAiDuration={onUpdateAiDuration}
              />
            ) : (
              <CalendarView
                tasks={sortedTasks}
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

      {/* Modal de confirmación para Organizar tiempos con IA */}
      <ConfirmationModal
        isOpen={showAiModal}
        title="Organizar tiempos con IA"
        message="😎Esta opción respeta los horarios fijos pero puede demorar hasta 1 minuto en responder😿."
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
        message="⚡Esta opción responde al instante pero no respeta los horarios fijos de tus tareas 😿."
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
