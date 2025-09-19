import React, { useRef, useEffect } from "react";
import { DayTask, getPriorityLabel } from "../types";
import Icon from "./Icon";
import Badge from "./Badge";
import {
  formatTimeTo12Hour,
  calculateTimeDifferenceInMinutes,
} from "../utils/dateUtils";

interface CalendarTaskProps {
  task: DayTask;
  position: {
    top: string;
    height: string;
    left?: string;
    right?: string;
    zIndex?: number;
  };
  onToggleComplete: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const CalendarTask: React.FC<CalendarTaskProps> = ({
  task,
  position,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const taskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (taskRef.current && !taskRef.current.contains(event.target as Node)) {
        setIsHovered(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // --- SIN CAMBIOS EN ESTA SECCIÓN ---
  const getTimeSlotDuration = () => {
    if (!task.startTime || !task.endTime) return null;
    const diffMinutes = calculateTimeDifferenceInMinutes(
      task.startTime,
      task.endTime
    );
    if (diffMinutes <= 0) return null;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  };
  const timeSlotDuration = getTimeSlotDuration();
  // --- FIN DE LA SECCIÓN SIN CAMBIOS ---

  const calculatedHeight = parseInt(position.height);
  const minTaskHeight = 30;
  const anchorWidth = 8;

  const taskHeight = Math.max(calculatedHeight, minTaskHeight);
  const anchorTop = parseInt(position.top);
  const taskTop = anchorTop - (taskHeight - calculatedHeight) / 2; // Center task on anchor
  const anchorLeft = `calc(${
    position.left || "3rem"
  } - ${anchorWidth}px - 4px)`; // To the left of task

  const taskStyle: React.CSSProperties = {
    top: `${taskTop}px`,
    height: `${taskHeight}px`,
    left: position.left || "3rem", // Task stays in original position
    right: position.right || "0.5rem",
    zIndex: isHovered ? 50 : position.zIndex || (task.isCurrent ? 10 : 1),
    position: "absolute",
  };

  return (
    <div className="">
      {/* Ancla visual: rectángulo con altura exacta de la duración */}
      <div
        className="absolute bg-emerald-500/70 border border-emerald-400 rounded-sm"
        style={{
          top: `${anchorTop}px`,
          left: anchorLeft,
          width: `${anchorWidth}px`,
          height: `${calculatedHeight}px`,
          zIndex: 15,
        }}
        title={`Inicio: ${
          task.startTime ? formatTimeTo12Hour(task.startTime) : ""
        }`}
      />

      {/* Línea conectora horizontal */}
      <div
        className="absolute bg-emerald-400/50"
        style={{
          top: `${anchorTop + calculatedHeight / 2}px`, // Centro vertical del ancla
          left: `calc(${position.left || "3rem"} - 4px)`,
          width: "4px",
          height: "2px",
          zIndex: 14,
        }}
      />

      <div
        ref={taskRef}
        className={`absolute rounded-md border cursor-default transition-all duration-300 ${
          isHovered
            ? "scale-105 shadow-2xl ring-2 ring-emerald-600 ring-opacity-50 z-50"
            : "hover:scale-[1.02]"
        } ${
          task.completed
            ? "bg-slate-700 border-slate-600 opacity-15"
            : task.isCurrent
            ? "bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-500/30"
            : "bg-slate-700 border-slate-600 hover:shadow-md"
        } ${task.isCurrent ? "ring-2 ring-emerald-400 ring-opacity-50" : ""}
        ${task.completed && isHovered ? "opacity-100" : ""}`}
        style={{
          ...taskStyle,
          minHeight: isHovered ? "90px" : "0px",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* El resto del componente permanece igual */}
        <div className="flex items-center justify-between h-full p-2 gap-2">
          {/* Checkbox para completar tarea */}
          <div className="flex-shrink-0 mr-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(task.id);
              }}
              className={`flex-shrink-0 h-4 w-4 md:h-6 md:w-6 rounded flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-400 cursor-pointer transition-all ${
                isHovered
                  ? "scale-110 ring-2 ring-emerald-400 ring-opacity-50"
                  : ""
              }`}
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
                <div className="h-full w-full rounded bg-rose-600 flex items-center justify-center transition-all">
                  <Icon
                    name="check"
                    className="h-3 w-3 md:h-4 md:w-4 text-white"
                  />
                </div>
              ) : (
                <div
                  className={`h-full w-full rounded border-2 transition-all ${
                    isHovered
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-slate-400"
                  }`}
                ></div>
              )}
            </button>
          </div>

          {/* Contenido principal - vista compacta por defecto, expandida en hover */}
          <div
            className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${
              isHovered ? "flex flex-col gap-2" : "flex items-center"
            }`}
          >
            {/* Vista compacta (por defecto) */}
            {!isHovered && (
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="bg-slate-800 rounded hidden px-2 py-1 text-xs sm:flex items-center">
                    <Icon name="timer" className="h-3 w-3 inline mr-0.5" />
                    {task.baseDuration}
                  </span>
                  {timeSlotDuration && (
                    <span className="flex-shrink-0 text-xs hidden sm:block text-emerald-400 font-mono bg-emerald-900/50 px-2 py-1 rounded">
                      {timeSlotDuration}
                    </span>
                  )}
                  <p
                    className={`font-semibold truncate text-xs md:text-sm leading-tight flex-1 flex justify-start gap-2 items-center ${
                      task.completed ? "line-through" : ""
                    }`}
                  >
                    {task.name} 
                    {task.isCurrent && (
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                    )}
                  </p>
                  {task.startTime && task.endTime && (
                    <span className="flex-shrink-0 text-xs text-slate-300 font-mono bg-slate-600/50 px-2 py-1 rounded">
                      {formatTimeTo12Hour(task.startTime)} -{" "}
                      {formatTimeTo12Hour(task.endTime)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Vista expandida (en hover) */}
            {isHovered && (
              <div className="w-full space-y-2 overflow-x-auto">
                {/* Primera fila expandida: nombre, duración y horas */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="bg-slate-800 rounded px-2 py-1 text-xs whitespace-nowrap flex items-center">
                      <Icon name="timer" className="h-3 w-3 inline mr-1" />
                      Ideal: {task.baseDuration}
                    </span>
                    <p
                      className={`font-semibold flex-shrink-0 truncate text-sm leading-tight flex ${
                        task.completed ? "line-through" : ""
                      }`}
                    >
                      {task.name}
                    </p>
                    {timeSlotDuration && (
                      <span className="flex-shrink-0 text-xs text-emerald-400 font-mono bg-emerald-900/50 px-2 py-1 rounded">
                        IA: {timeSlotDuration}
                      </span>
                    )}
                    {task.startTime && task.endTime && (
                      <span className="flex-shrink-0 text-xs text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded">
                        {formatTimeTo12Hour(task.startTime)} -{" "}
                        {formatTimeTo12Hour(task.endTime)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Segunda fila expandida: badges organizados */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-1">
                    {/* Badge de flexible/fijo */}
                    <Badge
                      label={task.flexibleTime ? "Flexible" : "Fijo"}
                      icon={task.flexibleTime ? "bird" : "lock"}
                      variant={task.flexibleTime ? "flexible" : "fixed"}
                      className="text-xs px-2 py-1 whitespace-nowrap"
                    />
                    {/* Badge de prioridad */}
                    <Badge
                      label={getPriorityLabel(task.priority)}
                      variant={
                        task.priority === 2
                          ? "high"
                          : task.priority === 1
                          ? "medium"
                          : "low"
                      }
                      className="text-xs px-2 py-1 whitespace-nowrap"
                    />
                    {task.isHabit && (
                      <Badge
                        label="Hábito"
                        icon="repeat"
                        variant="habit"
                        className="text-xs px-2 py-1 whitespace-nowrap"
                      />
                    )}
                    {/* Badge de IA recomendación */}
                    {"aiDuration" in task && task.aiDuration && (
                      <Badge
                        label={`IA: ${task.aiDuration}`}
                        icon="orbit"
                        variant="ai"
                        className="text-xs px-2 py-1 whitespace-nowrap"
                      />
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task.id);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 rounded transition-colors"
                    title="Editar tarea"
                  >
                    <Icon name="pencil" className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-500 rounded transition-colors"
                    title="Eliminar tarea"
                  >
                    <Icon name="trash2" className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Indicador visual para tareas con duración calculada */}
        {task.isCurrent && (
          <div className="absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarTask;
