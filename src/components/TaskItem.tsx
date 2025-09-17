import React, { useCallback } from "react";
import { BaseTask, DayTask, Priority, getPriorityLabel } from "../types";
import Icon from "./Icon";
import { useTimer } from "../hooks/useTimer";

interface TaskItemProps {
  task: DayTask | (BaseTask & { completed?: boolean; isCurrent?: boolean });
  isDaily: boolean;
  onToggleComplete?: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  onUpdateAiDuration?: (id: string, newAiDuration: string) => void;
}

const getPriorityClass = (priority: Priority): string => {
  switch (priority) {
    case Priority.High:
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case Priority.Medium:
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case Priority.Low:
      return "bg-sky-500/20 text-sky-400 border-sky-500/30";
    default:
      return "bg-slate-600 text-slate-300";
  }
};

const TaskItem: React.FC<
  TaskItemProps & React.HTMLAttributes<HTMLDivElement>
> = ({
  task,
  isDaily,
  onToggleComplete,
  onDelete,
  onEdit,
  onUpdateAiDuration,
  className,
  ...divProps
}) => {
  const initialAiDuration =
    isDaily && "aiDuration" in task ? (task as DayTask).aiDuration : undefined;

  const {
    timerActive,
    paused,
    remainingSeconds,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleStopTimer,
    formatSecondsToAiDuration,
  } = useTimer(initialAiDuration, onUpdateAiDuration, task.id);

  const getTaskSpecificClasses = () => {
    if (!isDaily) {
      return "border-slate-600 bg-slate-800";
    }
    if (task.completed) {
      // Fainter border and opacity for completed tasks
      return "border-slate-700 bg-slate-800 opacity-50";
    }
    if (task.isCurrent) {
      // Prominent border for the current task
      return "border-emerald-500 bg-slate-800";
    }
    // Default style for pending tasks
    return "border-slate-600 bg-slate-800";
  };

  const taskClasses = [
    "p-3 md:p-4",
    "rounded-lg",
    "border",
    "flex",
    "items-center",
    "space-x-2 md:space-x-4",
    "transition-all",
    "duration-300",
    "shadow-sm",
    "group",
    "cursor-grab",
    getTaskSpecificClasses(),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Mostrar temporizador solo para tareas diarias y con tiempo IA
  const showTimer = isDaily && "aiDuration" in task && !task.completed;

  const handleStartTimerClick = useCallback(() => {
    if ("aiDuration" in task) {
      handleStartTimer();
    }
  }, [handleStartTimer, task]);


  return (
    <div className={taskClasses + " relative"} {...divProps}>
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
            <Icon name="grip-vertical" className="text-slate-500 h-4 w-4 md:h-5 md:w-5" />
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
            <button
              onClick={() => onEdit?.(task.id)}
              className="p-1 rounded-md hover:bg-slate-700 hover:text-white transition-colors opacity-60 hover:opacity-100"
              title="Editar tarea"
              aria-label="Editar tarea"
            >
              <Icon name="pencil" className="h-3 w-3 md:h-4 md:w-4" />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 rounded-md hover:bg-red-700 hover:text-white transition-colors opacity-60 hover:opacity-100"
              title="Eliminar tarea"
              aria-label="Eliminar tarea"
            >
              <Icon name="trash2" className="h-3 w-3 md:h-4 md:w-4" />
            </button>
          </div>
        </div>

        {/* Segunda fila: badges y temporizador */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center flex-wrap text-xs text-slate-400 gap-1 md:gap-2 flex-1 min-w-0">
            <span className="bg-slate-700 rounded px-1 py-0.5 text-xs whitespace-nowrap flex items-center">
              <Icon name="timer" className="h-3 w-3 inline mr-1" />
              {task.baseDuration}
            </span>
            <span
              className={`font-medium px-1 py-0.5 rounded-full border text-xs whitespace-nowrap flex items-center ${
                task.flexibleTime
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-orange-500/20 text-orange-400 border-orange-500/30"
              }`}
            >
              {task.flexibleTime ? (
                <>
                  <Icon name="bird" className="h-3 w-3 inline mr-1" />
                  Flexible
                </>
              ) : (
                <>
                  <Icon name="lock" className="h-3 w-3 inline mr-1" />
                  Fijo
                </>
              )}
            </span>
            <span
              className={`font-medium px-1 py-0.5 rounded-full border text-xs whitespace-nowrap ${getPriorityClass(
                task.priority
              )}`}
            >
              {getPriorityLabel(task.priority)}
            </span> 
            {isDaily && "aiDuration" in task && (
              <span className="bg-emerald-900/40 text-emerald-300 rounded px-1 py-0.5 text-xs whitespace-nowrap flex items-center">
                <Icon name="orbit" className="h-3 w-3 inline mr-1" />
                IA recomendación: {task.aiDuration}
              </span>
            )}                       
          </div>

          {showTimer && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Icon name="clock" className="inline-block h-3 w-3 md:h-4 md:w-4 text-emerald-400" />
              <span
                className="text-xs md:text-sm font-mono text-emerald-400 bg-slate-900 border border-slate-700 rounded px-1 md:px-2 py-0.5"
                style={{
                  minWidth: "50px",
                  maxWidth: "80px",
                  textAlign: "center",
                }}
              >
                {remainingSeconds !== null
                  ? formatSecondsToAiDuration(remainingSeconds)
                  : task.aiDuration}
              </span>
              {!timerActive && (
                <button onClick={handleStartTimerClick} className="ml-1">
                  <Icon name="play" className="h-3 w-3 md:h-4 md:w-4 text-emerald-500" />
                </button>
              )}
              {timerActive && !paused && (
                <button onClick={handlePauseTimer} className="ml-1">
                  <Icon name="pause" className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
                </button>
              )}
              {timerActive && paused && (
                <button onClick={handleResumeTimer} className="ml-1">
                  <Icon name="play" className="h-3 w-3 md:h-4 md:w-4 text-emerald-500" />
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
      </div>
    </div>
  );
};

export default TaskItem;
