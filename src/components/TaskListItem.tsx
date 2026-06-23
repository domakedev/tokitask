import React, { useCallback, useState, useMemo } from "react";
import { BaseTask, DayTask, Priority, getPriorityLabel } from "../types";
import Icon from "./Icon";
import Badge from "./Badge";
import ConfirmationModal from "./ConfirmationModal";
// TIMER DESACTIVADO: el conteo con setInterval no es fiable en móvil (se congela
// al apagar la pantalla / pasar a segundo plano). Conservado para reactivar a futuro.
// import { useTimer } from "../hooks/useTimer";
import { parseDurationToMinutes, formatDurationToHuman } from "../utils/dateUtils";
import { useTaskStore } from "../stores/taskStore";
import { useAuthStore } from "../stores/authStore";
import { toast } from "react-toastify";

interface TaskListItemProps {
  task: DayTask | (BaseTask & { completed?: boolean; isCurrent?: boolean });
  isDaily: boolean;
  onToggleComplete?: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  onUpdateAiDuration?: (id: string, newAiDuration: string) => void;
  className?: string;
  showTimer?: boolean;
  showCopyButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  index?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const TaskListItem: React.FC<TaskListItemProps> = ({
  task,
  isDaily,
  onToggleComplete,
  onDelete,
  onEdit,
  onUpdateAiDuration,
  className = "",
  showTimer = true,
  showCopyButton = true,
  showEditButton = true,
  showDeleteButton = true,
  index,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const [showMoveModal, setShowMoveModal] = useState(false);

  const { userData } = useAuthStore.getState();

  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  // Verificar si la tarea tiene startTime y si este es mayor o igual al endOfDay del usuario
  const isOutsideSchedule = userData && task.startTime && timeToMinutes(task.startTime) >= timeToMinutes(userData.endOfDay);

  const isFromGeneralTasks = useMemo(() => {
    return userData?.generalTasks?.some(gt => gt.name === task.name) ?? false;
  }, [userData, task.name]);

//isFromWeeklyTasks
  const isFromWeeklyTasks = useMemo(() => {
    if (!userData?.weeklyTasks) return false;
    return Object.values(userData.weeklyTasks).some(weekTasks =>
      weekTasks.some(wt => wt.name === task.name)
    );
  }, [userData, task.name]);
  // TIMER DESACTIVADO (ver nota en el import)
  // const initialAiDuration =
  //   isDaily && "aiDuration" in task ? (task as DayTask).aiDuration : undefined;

  // Duración recomendada por la IA (si existe y es válida)
  const aiMinutes =
    isDaily && "aiDuration" in task
      ? parseDurationToMinutes((task as DayTask).aiDuration)
      : 0;
  const hasAiDuration = aiMinutes > 0;

  // Tarea "fuera del día": el planificador Express la dejó con duración 00:00
  // (fija ya vencida u opcional sin hueco). Sigue siendo completable, pero
  // visualmente debe distinguirse de una tarea realizable.
  const isDiscarded =
    isDaily &&
    "aiDuration" in task &&
    (task as DayTask).aiDuration === "00:00" &&
    !task.completed;

  /* TIMER DESACTIVADO (ver nota en el import). Conservado para reactivar a futuro.
  const {
    timerActive,
    paused,
    remainingSeconds,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleStopTimer,
    formatSecondsToAiDuration,
    effectiveDuration,
    isUsingBaseDuration,
  } = useTimer(initialAiDuration, task.baseDuration, onUpdateAiDuration, task.id);


  // Mostrar temporizador para tareas diarias con duración (IA o base) y no completadas
  const shouldShowTimer = showTimer && isDaily && (effectiveDuration) && !task.completed;

  const handleStartTimerClick = useCallback(() => {
    if (effectiveDuration) {
      handleStartTimer();
    }
  }, [handleStartTimer, effectiveDuration]);
  */

  const handleMoveClick = useCallback(() => {
    setShowMoveModal(true);
  }, []);

  const handleConfirmMove = useCallback(async () => {
    const { handleMoveTaskToTomorrow } = useTaskStore.getState();
    await handleMoveTaskToTomorrow(task.id);
    setShowMoveModal(false);
  }, [task.id]);

  const handleCancelMove = useCallback(() => {
    setShowMoveModal(false);
  }, []);

  const isCurrent = task.isCurrent && !task.completed;

  return (
    <div className={`relative p-3 md:p-4 rounded-lg border flex items-start gap-2 md:gap-3 transition-all duration-300 shadow-sm group cursor-grab bg-slate-800 ${className} ${
        isDiscarded
          ? 'border-amber-600/50 opacity-70'
          : isCurrent
          ? 'border-emerald-400 ring-1 ring-emerald-400/40'
          : 'border-slate-600'
      }`}>
      {/* Columna izquierda: check o grip */}
      <div className="flex flex-col items-center justify-center flex-shrink-0">
        {isDaily ? (
          <button
            onClick={() => onToggleComplete?.(task.id)}
            className="flex-shrink-0 h-6 w-6 md:h-7 md:w-7 rounded flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-400 cursor-pointer"
            title={
              task.completed
                ? "Marcar como pendiente"
                : "Marcar como completada"
            }
            aria-label={
              task.completed
                ? "Marcar tarea como incompleta"
                : "Marcar tarea como completa"
            }
          >
            {task.completed ? (
              <div className="h-full w-full rounded bg-emerald-600 flex items-center justify-center">
                <Icon name="check" className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
            ) : (
              <div className="h-full w-full rounded border-2 border-slate-400 group-hover:border-emerald-400 transition-colors"></div>
            )}
          </button>
        ) : (
          <div className="flex-shrink-0 cursor-grab">
            <Icon name="gripvertical" className="text-slate-200 h-5 w-5" />
          </div>
        )}
      </div>

      {/* Columna central: contenido compacto */}
      <div className="flex flex-col flex-grow min-w-0">
        {/* Primera fila: nombre y acciones */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isCurrent && (
              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                Ahora
              </span>
            )}
            <p
              className={`font-semibold text-white text-sm md:text-base truncate ${task.completed ? "line-through text-slate-400" : ""}`}
            >
              {task.name}
            </p>
          </div>
          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
            {showEditButton && (
              <button
                onClick={() => onEdit?.(task.id)}
                className="p-1.5 md:p-2 rounded-md hover:bg-slate-700 hover:text-white transition-colors text-slate-400"
                title="Editar tarea"
                aria-label="Editar tarea"
              >
                <Icon name="pencil" className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            )}
            {showCopyButton && (
              <button
                onClick={() => {
                  const { setCopiedTask } = useTaskStore.getState();
                  setCopiedTask(task);
                  toast.success(`Tarea "${task.name}" copiada.`);
                }}
                className="p-1.5 md:p-2 rounded-md hover:bg-slate-700 hover:text-white transition-colors text-slate-400"
                title="Copiar tarea"
                aria-label="Copiar tarea"
              >
                <Icon name="copy" className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            )}
            {isDaily && !isFromGeneralTasks && !isFromWeeklyTasks && (
              <button
                onClick={handleMoveClick}
                className="p-1.5 md:p-2 rounded-md hover:bg-slate-700 hover:text-white transition-colors text-slate-400"
                title="Pasar para mañana"
                aria-label="Pasar tarea para mañana"
              >
                <Icon name="arrowbigrightdash" className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            )}
            {showDeleteButton && (
              <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 md:p-2 rounded-md hover:bg-red-700 hover:text-white transition-colors text-slate-400"
                title="Eliminar tarea"
                aria-label="Eliminar tarea"
              >
                <Icon name="trash2" className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Segunda fila: badges y temporizador */}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div className="flex items-center flex-wrap text-xs text-slate-400 gap-1 md:gap-2 flex-1 min-w-0">
            {/* Duración única y prominente: IA si está, si no la base.
                Si quedó fuera del día, no mostramos duración (sería engañosa). */}
            {isDiscarded ? (
              <Badge label="Fuera del día" icon="clock" variant="blocked" />
            ) : hasAiDuration ? (
              <Badge
                label={formatDurationToHuman((task as DayTask).aiDuration)}
                icon="timer"
                variant="ai"
              />
            ) : (
              <span className="bg-slate-700 rounded px-1.5 py-0.5 text-xs whitespace-nowrap flex items-center">
                <Icon name="timer" className="h-3 w-3 inline mr-1" />
                {task.baseDuration}
              </span>
            )}
            {/* Solo destacamos lo excepcional: horario fijo */}
            {!task.flexibleTime && (
              <Badge label="Fijo" icon="lock" variant="fixed" />
            )}
            {/* Prioridad: solo si no es opcional (Baja) */}
            {task.priority !== Priority.Low && (
              <Badge
                label={getPriorityLabel(task.priority)}
                variant={task.priority === Priority.High ? 'high' : 'medium'}
              />
            )}
            {task.isHabit && <Badge label="Hábito" icon="repeat" variant="habit" />}
            {task.startTime && task.endTime && task.startTime !== task.endTime && (
              <Badge
                label={`${task.startTime} - ${task.endTime}`}
                icon="clock"
                variant="hour"
              />
            )}
            {isDaily && !task.completed && isOutsideSchedule && (
              <Badge
                label="Pasa el final del día"
                icon="clock"
                variant="danger"
              />
            )}
          </div>

          {/* TIMER DESACTIVADO: conteo poco fiable en móvil (setInterval se congela
              con la pantalla apagada). Conservado para reactivar a futuro.
          {shouldShowTimer && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Icon name="clock" className={`inline-block h-3 w-3 md:h-4 md:w-4 ${isUsingBaseDuration ? 'text-slate-400' : 'text-emerald-400'}`} />
              <span
                className={`text-xs md:text-sm font-mono ${isUsingBaseDuration ? 'text-slate-400' : 'text-emerald-400'} bg-slate-900 border border-slate-700 rounded px-1 md:px-2 py-0.5`}
                style={{
                  minWidth: "50px",
                  maxWidth: "80px",
                  textAlign: "center",
                }}
              >
                {remainingSeconds !== null
                  ? formatSecondsToAiDuration(remainingSeconds)
                  : effectiveDuration}
              </span>
              {!timerActive && (
                <button onClick={handleStartTimerClick} className="ml-1 p-1">
                  <Icon name="play" className={`h-4 w-4 md:h-5 md:w-5 ${isUsingBaseDuration ? 'text-slate-500' : 'text-emerald-500'}`} />
                </button>
              )}
              {timerActive && !paused && (
                <button onClick={handlePauseTimer} className="ml-1 p-1">
                  <Icon name="pause" className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                </button>
              )}
              {timerActive && paused && (
                <button onClick={handleResumeTimer} className="ml-1 p-1">
                  <Icon name="play" className={`h-4 w-4 md:h-5 md:w-5 ${isUsingBaseDuration ? 'text-slate-500' : 'text-emerald-500'}`} />
                </button>
              )}
              {timerActive && (
                <button onClick={handleStopTimer} className="ml-1 p-1">
                  <Icon name="stop" className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                </button>
              )}
            </div>
          )}
          */}
        </div>
      </div>

      {/* Columna derecha: reordenar (sin solaparse con las acciones) */}
      {index !== undefined && (
        <div className="flex flex-col justify-center items-center flex-shrink-0 gap-1 self-stretch">
          <button
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className={`p-1.5 rounded-md transition-colors ${onMoveUp ? 'hover:bg-slate-700 text-slate-300' : 'opacity-30 cursor-not-allowed text-slate-500'}`}
            title={onMoveUp ? "Subir tarea" : "No se puede subir más"}
            aria-label={onMoveUp ? "Subir tarea" : "No se puede subir más"}
          >
            <Icon name="chevronup" className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className={`p-1.5 rounded-md transition-colors ${onMoveDown ? 'hover:bg-slate-700 text-slate-300' : 'opacity-30 cursor-not-allowed text-slate-500'}`}
            title={onMoveDown ? "Bajar tarea" : "No se puede bajar más"}
            aria-label={onMoveDown ? "Bajar tarea" : "No se puede bajar más"}
          >
            <Icon name="chevrondown" className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={showMoveModal}
        title="Pasar tarea para mañana"
        message="¿Deseas pasar esta tarea para mañana?"
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
      />
    </div>
  );
};

export default TaskListItem;
