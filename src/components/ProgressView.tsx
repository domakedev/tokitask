"use client";
import React, { useState, useMemo } from "react";
import { UserData, BaseTask, Priority } from "../types";
import Icon from "./Icon";

interface ProgressViewProps {
  userData: UserData;
}

const ProgressView: React.FC<ProgressViewProps> = ({ userData }) => {
  const [selectedTaskProgressIds, setSelectedTaskProgressIds] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isAnimating, setIsAnimating] = useState(false);

  // Usar completions por progressId que son persistentes
  const taskCompletionsByProgressId = userData.taskCompletionsByProgressId || {};

  // Get unique tasks by name (not by ID) to avoid duplicates
  const uniqueTasks = useMemo(() => {
    const taskMap = new Map<string, BaseTask>();

    // Add general tasks
    userData.generalTasks.forEach(task => {
      if (!taskMap.has(task.name)) {
        taskMap.set(task.name, task);
      }
    });

    // Add day tasks (these may be clones of general/weekly tasks)
    userData.dayTasks.forEach(task => {
      if (!taskMap.has(task.name)) {
        taskMap.set(task.name, task);
      }
    });

    // Add weekly tasks
    Object.values(userData.weeklyTasks || {}).forEach(dayTasks => {
      dayTasks.forEach(task => {
        if (!taskMap.has(task.name)) {
          taskMap.set(task.name, task);
        }
      });
    });

    return Array.from(taskMap.values());
  }, [userData]);

  // Get completion dates for selected tasks (aggregate by progressId)
  const completionDates = useMemo(() => {
    if (selectedTaskProgressIds.length === 0) return [];

    const allCompletionDates: string[] = [];
    selectedTaskProgressIds.forEach(progressId => {
      const taskCompletions = taskCompletionsByProgressId[progressId] || [];
      allCompletionDates.push(...taskCompletions);
    });

    // Remove duplicates and sort
    return [...new Set(allCompletionDates)].sort();
  }, [selectedTaskProgressIds, taskCompletionsByProgressId]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const dateStr = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === currentMonth;
      const completedTasks: string[] = [];
      selectedTaskProgressIds.forEach(progressId => {
        const taskCompletions = taskCompletionsByProgressId[progressId] || [];
        if (taskCompletions.includes(dateStr)) {
          completedTasks.push(progressId);
        }
      });

      days.push({
        date: new Date(current),
        dateStr,
        isCurrentMonth,
        completedTasks,
        day: current.getDate()
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentMonth, currentYear, selectedTaskProgressIds, taskCompletionsByProgressId]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (selectedTaskProgressIds.length === 0) return null;

    const completions = completionDates;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Current streak (days where at least one selected task was completed)
    let streak = 0;
    const sortedCompletions = [...completions].sort().reverse();
    const today = now.toISOString().split('T')[0];

    for (let i = 0; ; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (completions.includes(dateStr)) {
        streak++;
      } else if (i === 0 || dateStr >= sortedCompletions[0]) {
        // If today is not completed, or we're checking future dates, stop
        break;
      } else {
        break;
      }
    }

    // Monthly completions
    const monthlyCompletions = completions.filter(date => {
      const [year, month, day] = date.split('-').map(Number);
      return month - 1 === currentMonth && year === currentYear;
    }).length;

    // Days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    return {
      streak,
      monthlyCompletions,
      daysInMonth,
      totalCompletions: completions.length
    };
  }, [selectedTaskProgressIds, completionDates]);

  // Generate unique color based on progressId with good contrast
  const getUniqueTaskColor = (progressId: string | undefined) => {
    // Verificar que progressId existe y no está vacío
    if (!progressId || progressId.trim() === "") {
      return "bg-slate-600"; // Color por defecto
    }

    // Paleta de colores vibrantes con buen contraste para texto blanco
    const colorPalette = [
      "bg-emerald-500",   // Verde esmeralda
      "bg-blue-500",     // Azul
      "bg-purple-500",   // Púrpura
      "bg-pink-500",     // Rosa
      "bg-indigo-500",   // Índigo
      "bg-cyan-500",     // Cian
      "bg-teal-500",     // Verde azulado
      "bg-orange-500",   // Naranja
      "bg-rose-500",     // Rosa rojizo
      "bg-violet-500",   // Violeta
      "bg-sky-500",      // Celeste
      "bg-lime-500",     // Lima
      "bg-amber-500",    // Ámbar
      "bg-fuchsia-500",  // Fucsia
      "bg-yellow-600",    // Amarillo (más oscuro para mejor contraste)
    ];

    // Generate a simple hash from progressId
    let hash = 0;
    for (let i = 0; i < progressId.length; i++) {
      const char = progressId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Use absolute value and modulo to get consistent index
    const colorIndex = Math.abs(hash) % colorPalette.length;
    return colorPalette[colorIndex];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (isAnimating) return;

    setIsAnimating(true);

    setTimeout(() => {
      if (direction === 'prev') {
        if (currentMonth === 0) {
          setCurrentMonth(11);
          setCurrentYear(currentYear - 1);
        } else {
          setCurrentMonth(currentMonth - 1);
        }
      } else {
        if (currentMonth === 11) {
          setCurrentMonth(0);
          setCurrentYear(currentYear + 1);
        } else {
          setCurrentMonth(currentMonth + 1);
        }
      }
      setIsAnimating(false);
    }, 150);
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Task Pills */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Seleccionar Tareas</h2>
        <div className="flex flex-wrap justify-center mt-6 gap-2">
          {uniqueTasks.map(task => (
            <button
              key={task.id}
              onClick={() => {
                setSelectedTaskProgressIds(prev =>
                  prev.includes(task.progressId)
                    ? prev.filter(id => id !== task.progressId)
                    : [...prev, task.progressId]
                );
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedTaskProgressIds.includes(task.progressId)
                  ? `${getUniqueTaskColor(task.progressId)} text-white shadow-lg`
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {task.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      {selectedTaskProgressIds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-slate-400 hover:text-white"
            >
              <Icon name="chevronLeft" className="h-5 w-5 text-white" />
            </button>
            <h3 className="text-lg font-semibold text-white">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-slate-400 hover:text-white"
            >
              <Icon name="chevronRight" className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className={`grid grid-cols-7 gap-1 transition-opacity duration-150 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-slate-400">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              const isToday = day.dateStr === new Date().toISOString().split('T')[0];
              return (
                <div
                  key={`${currentMonth}-${currentYear}-${index}`}
                  className={`p-2 text-center text-sm rounded-lg relative ${
                    day.isCurrentMonth
                      ? day.completedTasks.length > 0
                        ? "text-white"
                        : "bg-slate-700 text-slate-300"
                      : "bg-slate-800 text-slate-500"
                  } ${isToday ? "ring-2 ring-white ring-inset" : ""}`}
                >
                  {day.completedTasks.length === 0 ? (
                    day.day
                  ) : day.completedTasks.length === 1 ? (
                    <div className={`w-full h-full rounded-lg ${getUniqueTaskColor(day.completedTasks[0])} flex items-center justify-center`}>
                      {day.day}
                    </div>
                  ) : (
                    <>
                      <div className="w-full h-full flex gap-1 flex-wrap">
                        {day.completedTasks.map((progressId) => (
                          <div
                            key={progressId}
                            className={`${getUniqueTaskColor(progressId)} flex-1 rounded-lg min-w-2.5 min-h-2.5`}
                          />
                        ))}
                      </div>
                      <div className="absolute top-0 right-0 text-[12px] font-bold text-black bg-white bg-opacity-50 px-1 rounded">
                        {day.day}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Estadísticas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="flame" className="h-6 w-6 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-white">{statistics.streak}</p>
                  <p className="text-sm text-slate-400">Días de racha</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="calendar" className="h-6 w-6 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-white">{statistics.monthlyCompletions}</p>
                  <p className="text-sm text-slate-400">Completadas este mes</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="checkCircle" className="h-6 w-6 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-white">{statistics.totalCompletions}</p>
                  <p className="text-sm text-slate-400">Total completadas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-white">
              {statistics.streak > 0 && (
                <>¡Mantén la racha! Has completado al menos una de estas tareas por {statistics.streak} días consecutivos.</>
              )}
              {statistics.streak === 0 && statistics.totalCompletions > 0 && (
                <>Has completado estas tareas {statistics.totalCompletions} veces en total. ¡Sigue adelante!</>
              )}
              {statistics.totalCompletions === 0 && (
                <>Aún no has completado estas tareas. ¡Empieza hoy!</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressView;