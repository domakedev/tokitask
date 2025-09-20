import React, { useCallback } from "react";
import { BaseTask, DayTask, Priority, getPriorityLabel } from "../types";
import Icon from "./Icon";
import Badge from "./Badge";
import { useTimer } from "../hooks/useTimer";
import { calculateTimeDifferenceInMinutes, parseDurationToMinutes } from "../utils/dateUtils";
import { useTaskStore } from "../stores/taskStore";
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
}) => {
  const initialAiDuration =
    isDaily && "aiDuration" in task ? (task as DayTask).aiDuration : undefined;

  // Función para calcular y formatear la duración entre startTime y endTime
  const getTimeSlotDuration = () => {
    if (!task.startTime || !task.endTime) return null;
    const diffMinutes = calculateTimeDifferenceInMinutes(task.startTime, task.endTime);
    if (diffMinutes <= 0) return null;

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}min`;
    }
  };

  const timeSlotDuration = getTimeSlotDuration();

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

  return (
    <div className={`p-3 md:p-4 rounded-lg border flex items-center space-x-2 md:space-x-4 transition-all duration-300 shadow-sm group cursor-grab bg-slate-800 border-slate-600 ${className}`}>
      {/* Columna izquierda: check o grip */}
      <div className="flex flex-col items-center justify-center flex-shrink-0 mr-1 md:mr-2">
        {isDaily ? (
          <button
            onClick={() => onToggleComplete?.(task.id)}
            className="flex-shrink-0 h-5 w-5 md:h-7 md:w-7 rounded flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-400 cursor-pointer"
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
              <div className="h-full w-full rounded bg-rose-600 flex items-center justify-center">
                <Icon name="check" className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
            ) : (
              <div className="h-full w-full rounded border-2 border-slate-400 group-hover:border-white transition-colors"></div>
            )}
          </button>
        ) : (
          <div className="flex-shrink-0 cursor-grab">
            <Icon name="gripvertical" className="text-slate-200 h-4 w-4 md:h-5 md:w-5" />
          </div>
        )}
      </div>

      {/* Columna central: contenido compacto */}
      <div className="flex flex-col flex-grow min-w-0">
        {/* Primera fila: nombre y acciones */}
        <div className="flex items-start justify-between gap-2">
          <p
            className={`font-semibold text-white text-sm md:text-base truncate flex-1 ${
              isDaily && task.completed ? "line-through" : ""
            }`}
          >
            {task.name}
          </p>
          <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
            {showEditButton && (
              <button
                onClick={() => onEdit?.(task.id)}
                className="p-1 rounded-md hover:bg-slate-700 hover:text-white transition-colors opacity-60 hover:opacity-100"
                title="Editar tarea"
                aria-label="Editar tarea"
              >
                <Icon name="pencil" className="h-3 w-3 md:h-4 md:w-4" />
              </button>
            )}
            {showDeleteButton && (
              <button
                onClick={() => onDelete(task.id)}
                className="p-1 rounded-md hover:bg-red-700 hover:text-white transition-colors opacity-60 hover:opacity-100"
                title="Eliminar tarea"
                aria-label="Eliminar tarea"
              >
                <Icon name="trash2" className="h-3 w-3 md:h-4 md:w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Segunda fila: badges y temporizador */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center flex-wrap text-xs text-slate-400 gap-1 md:gap-2 flex-1 min-w-0">
            <span className="bg-slate-700 rounded px-1 py-0.5 text-xs whitespace-nowrap flex items-center">
              <Icon name="timer" className="h-3 w-3 inline mr-1" />
              {task.baseDuration}
            </span>
            {timeSlotDuration && (
              <span className="bg-emerald-700 rounded px-1 py-0.5 text-xs whitespace-nowrap flex items-center">
                <Icon name="clock" className="h-3 w-3 inline mr-1" />
                {timeSlotDuration}
              </span>
            )}
            <Badge
              label={task.flexibleTime ? 'Flexible' : 'Fijo'}
              icon={task.flexibleTime ? 'bird' : 'lock'}
              variant={task.flexibleTime ? 'flexible' : 'fixed'}
            />
            <Badge
              label={getPriorityLabel(task.priority)}
              variant={task.priority === 2 ? 'high' : task.priority === 1 ? 'medium' : 'low'}
            />
            {task.isHabit && <Badge label="Hábito" icon="repeat" variant="habit" />}
            {isDaily && "aiDuration" in task && (
              <Badge
                label={`IA recomendación: ${task.aiDuration}`}
                icon="orbit"
                variant="ai"
              />
            )}
            {task.startTime && task.endTime && (
              <Badge
                label={`${task.startTime} - ${task.endTime}`}
                icon="clock"
                variant="ai"
              />
            )}
          </div>

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
                <button onClick={handleStartTimerClick} className="ml-1">
                  <Icon name="play" className={`h-3 w-3 md:h-4 md:w-4 ${isUsingBaseDuration ? 'text-slate-500' : 'text-emerald-500'}`} />
                </button>
              )}
              {timerActive && !paused && (
                <button onClick={handlePauseTimer} className="ml-1">
                  <Icon name="pause" className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
                </button>
              )}
              {timerActive && paused && (
                <button onClick={handleResumeTimer} className="ml-1">
                  <Icon name="play" className={`h-3 w-3 md:h-4 md:w-4 ${isUsingBaseDuration ? 'text-slate-500' : 'text-emerald-500'}`} />
                </button>
              )}
              {timerActive && (
                <button onClick={handleStopTimer} className="ml-1">
                  <Icon name="stop" className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tercera fila: botón de copiar (solo si showCopyButton es true) */}
        {showCopyButton && (
          <div className="flex justify-end mt-1">
            <button
              onClick={() => {
                const { setCopiedTask } = useTaskStore.getState();
                setCopiedTask(task);
                toast.success(`Tarea "${task.name}" copiada.`);
              }}
              className="flex items-center space-x-1 p-1 rounded-md hover:bg-slate-700 hover:text-white transition-colors opacity-60 hover:opacity-100"
              title="Copiar tarea"
              aria-label="Copiar tarea"
            >
              <Icon name="copy" className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs">Copiar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskListItem;