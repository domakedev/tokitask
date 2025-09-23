import React, { useState } from "react";
import { DayTask } from "../types";
import Icon from "./Icon";
import CalendarTask from "./CalendarTask";
import TaskListItem from "./TaskListItem";

interface CalendarViewProps {
  tasks: DayTask[];
  onToggleComplete: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const [showAllHours, setShowAllHours] = useState(false);

  // Función para calcular el factor de escala basado en el número de tareas
  const getScaleFactor = (taskCount: number): number => {
    if (taskCount <= 3) return 1.9;
    if (taskCount <= 5) return 1.7;
    if (taskCount <= 7) return 1.5;
    if (taskCount <= 9) return 1.3;
    return 1;
  };

  // Nueva función para calcular el rango de horas relevante
  const calculateRelevantHours = () => {
    // Filtrar solo tareas con horario definido y no completadas
    const scheduledTasks = tasks.filter(
      (task) => task.startTime && task.endTime && !task.completed
    );

    // Si no hay tareas, mostrar un rango por defecto (ej. 6 AM a 11 PM)
    if (scheduledTasks.length === 0) {
      return Array.from({ length: 3 }, (_, i) => i + 6);
    }

    // Encontrar la hora de inicio más temprana y la hora de fin más tardía
    let minHour = 23;
    let maxHour = 0;

    scheduledTasks.forEach((task, i) => {
      const startHour = parseInt(task.startTime!.split(":")[0], 10)-1;
      const endHour = parseInt(task.endTime!.split(":")[0], 10);
      if (startHour < minHour) {
        minHour = startHour;
      }   
      if (endHour > maxHour) {
        maxHour = endHour;
      }
    });

    // Generar un array continuo de horas desde la primera hasta la última tarea
    const relevantHours = [];
    for (let hour = minHour; hour <= maxHour; hour++) {
      relevantHours.push(hour);
    }

    // Devolver las horas calculadas o el rango por defecto si algo falla
    return relevantHours.length > 0
      ? relevantHours
      : Array.from({ length: 18 }, (_, i) => i + 6);
  };

  // Determinar horas a mostrar usando la nueva lógica
  const hours = showAllHours
    ? Array.from({ length: 24 }, (_, i) => i) // Muestra todas las horas si el usuario lo pide
    : calculateRelevantHours(); // Muestra el rango continuo por defecto
  // MODIFICADO: Lógica de posicionamiento basada en píxeles con escala dinámica
  const getTaskPosition = (
    task: DayTask,
    taskIndex: number,
    allTasks: DayTask[]
  ) => {
    if (!task.startTime || !task.endTime) return null;

    const [startHour, startMin] = task.startTime.split(":").map(Number);
    const [endHour, endMin] = task.endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;

    // Si la duración es inválida, no se renderiza la tarea
    if (durationMinutes <= 0) return null;

    // Escala dinámica: si hay pocas tareas, aumentar el tamaño para mejor visibilidad
    const scaleFactor = getScaleFactor(allTasks.length);
    const minuteToPixelFactor = scaleFactor;

    // Se calcula el desplazamiento inicial basado en la primera hora visible
    const firstVisibleHour = hours.length > 0 ? hours[0] : 0;
    const dayStartOffsetInMinutes = firstVisibleHour * 60;

    // Se calculan 'top' y 'height' en píxeles con escala
    const top = (startMinutes - dayStartOffsetInMinutes) * minuteToPixelFactor;
    const height = durationMinutes * minuteToPixelFactor;

    // En esta versión simplificada, las tareas que se solapan se superpondrán.
    // La lógica anterior de 'row' se ha eliminado porque rompía la alineación vertical.
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: "3rem", // Mantiene el margen para las etiquetas de hora
      right: "0.5rem",
      zIndex: task.isCurrent ? 20 : 10 + taskIndex,
    };
  };

  const tasksForCalendar = tasks.filter(
    (task) => task.startTime && task.endTime && !task.completed
  );

  const taskPositions = tasksForCalendar.map((task, index) => ({
    task,
    position: getTaskPosition(task, index, tasksForCalendar),
  }));

  // Escala dinámica para mejor visibilidad con pocas tareas
  const scaleFactor = getScaleFactor(tasksForCalendar.length);

  // MODIFICADO: La altura total ajustada por escala
  const hoursShown = hours.length;
  const totalHeight = hoursShown * 60 * scaleFactor; // 60px por cada hora, escalado

  const hiddenHoursBefore = !showAllHours && hours.length > 0 ? hours[0] : 0;
  const hiddenHoursAfter =
    !showAllHours && hours.length > 0 ? 23 - hours[hours.length - 1] : 0;
  const hasHiddenHours =
    !showAllHours && (hiddenHoursBefore > 0 || hiddenHoursAfter > 0);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      {/* --- SIN CAMBIOS EN LA SECCIÓN DE BOTONES --- */}
      {hasHiddenHours && !showAllHours && (
        <div className="mb-3 flex justify-center">
          <button
            onClick={() => setShowAllHours(true)}
            className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 px-3 py-2 rounded text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <Icon name="expand" className="h-3 w-3" />
            <span>
              Mostrar todas las horas ({hiddenHoursBefore + hiddenHoursAfter}{" "}
              ocultas)
            </span>
          </button>
        </div>
      )}
      {showAllHours && (
        <div className="mb-3 flex justify-center">
          <button
            onClick={() => setShowAllHours(false)}
            className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 px-3 py-2 rounded text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <Icon name="minimize" className="h-3 w-3" />
            <span>Mostrar solo horas relevantes</span>
          </button>
        </div>
      )}
      {/* --- FIN DE LA SECCIÓN SIN CAMBIOS --- */}

      <div className="relative" style={{ height: `${totalHeight}px` }}>
        {/* Líneas horarias con escala */}
        {hours.map((hour, index) => (
          <div
            key={hour}
            className={`flex items-center ${
              index === 0
                ? "border-t-2 border-slate-500" // La primera línea no necesita borde superior, el contenedor lo simula
                : "border-y border-slate-600"
            }`}
            style={{ height: `${60 * scaleFactor}px` }}
          >
            <div className="w-12 text-xs text-slate-400 font-mono -translate-y-1/2">
              {hour > 12
                ? `${hour - 12} PM`
                : hour === 0
                ? "12 AM"
                : hour === 12
                ? "12 PM"
                : `${hour} AM`}
            </div>
          </div>
        ))}

        {/* Tareas posicionadas con ancho basado en duración */}
        {taskPositions.map(({ task, position }) => {
          if (!position) return null;
          // Tareas más cortas ocupan todo el ancho, más largas son ligeramente más estrechas
          const durationMinutes = parseInt(position.height);
          const adjustedPosition = {
            ...position,
            right: durationMinutes <= 30 ? "0.5rem" : "2rem", // Cortas: ancho completo, largas: ligeramente estrechas
          };
          return (
            <CalendarTask
              key={task.id}
              task={task}
              position={adjustedPosition}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>

      {/* --- SIN CAMBIOS EN TAREAS SIN HORARIO Y COMPLETADAS --- */}
      {tasks.filter((task) => !task.startTime || !task.endTime).length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-600">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            Tareas sin horario
          </h3>
          <div className="space-y-2">
            {tasks
              .filter((task) => !task.startTime || !task.endTime)
              .map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isDaily={true}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  className={`${
                    task.completed
                      ? "bg-slate-700 border-slate-600 opacity-50"
                      : "bg-slate-700 border-slate-600 hover:bg-slate-600"
                  }`}
                  showTimer={false}
                />
              ))}
          </div>
        </div>
      )}
      {tasks.filter((task) => task.startTime && task.endTime && task.completed)
        .length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-600">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            Tareas Completadas
          </h3>
          <div className="space-y-2">
            {tasks
              .filter(
                (task) => task.startTime && task.endTime && task.completed
              )
              .map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isDaily={true}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  className="bg-slate-700 border-slate-600 opacity-50"
                  showTimer={false}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
