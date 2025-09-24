"use client";
import React, { useState, useMemo, useEffect } from "react";
import { UserData, BaseTask, Page } from "../types";
import Icon from "./Icon";
import EmptyProgressState from "./EmptyProgressState";
import HabitReminder from "./HabitReminder";
import { generateUniqueId } from "@/utils/idGenerator";

interface ProgressViewProps {
  userData: UserData;
  onNavigate: (page: Page) => void;
}

const ProgressView: React.FC<ProgressViewProps> = ({ userData, onNavigate }) => {
  const [selectedTaskProgressIds, setSelectedTaskProgressIds] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isAnimating, setIsAnimating] = useState(false);

  // Usar completions por progressId que son persistentes
  const taskCompletionsByProgressId = useMemo(() => userData.taskCompletionsByProgressId || {}, [userData.taskCompletionsByProgressId]);

  // Get only tasks that have been completed at least once and still exist in userData
  const completedTasks = useMemo(() => {
    const tasks: BaseTask[] = [];

    // Helper function to find task by progressId in all task collections
    const findTaskByProgressId = (progressId: string): BaseTask | null => {
      // Check general tasks
      const generalTask = userData.generalTasks.find(t => t.progressId === progressId);
      if (generalTask) return generalTask;

      // Check day tasks
      const dayTask = userData.dayTasks.find(t => t.progressId === progressId);
      if (dayTask) return dayTask;

      // Check weekly tasks
      for (const dayTasks of Object.values(userData.weeklyTasks || {})) {
        const weeklyTask = dayTasks.find(t => t.progressId === progressId);
        if (weeklyTask) return weeklyTask;
      }

      return null;
    };

    // Only include progressIds that have at least one completion date AND exist in userData AND are habits
    Object.entries(taskCompletionsByProgressId).forEach(([progressId, completionDates]) => {
      // Only include if there are actual completion dates (not empty array)
      if (completionDates && completionDates.length > 0) {
        const task = findTaskByProgressId(progressId);
        if (task && task.isHabit) {
          tasks.push(task);
        }
      }
    });

    return tasks;
  }, [userData, taskCompletionsByProgressId]);

  // Group completed tasks by name
  const completedTaskGroups = useMemo(() => {
    const groups = new Map<string, BaseTask[]>();

    completedTasks.forEach(task => {
      const name = task.name.trim().toLowerCase();
      if (!groups.has(name)) {
        groups.set(name, []);
      }
      groups.get(name)!.push(task);
    });

    return groups;
  }, [completedTasks]);

  // Get unique completed task names for display
  const uniqueCompletedTaskNames = useMemo(() => {
    return Array.from(completedTaskGroups.keys()).sort();
  }, [completedTaskGroups]);

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

  // Get all tasks for a given task name
  const getTasksForName = (taskName: string): BaseTask[] => {
    return completedTaskGroups.get(taskName.toLowerCase()) || [];
  };

  // Get all progressIds for a given task name
  const getProgressIdsForName = (taskName: string): string[] => {
    return getTasksForName(taskName).map(task => task.progressId);
  };

  // Get task name by progressId
  const getTaskNameByProgressId = (progressId: string): string => {
    for (const [name, tasks] of completedTaskGroups) {
      const task = tasks.find(t => t.progressId === progressId);
      if (task) return task.name;
    }
    return "";
  };

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const dateStr = current.toLocaleDateString('en-CA'); // Use local date YYYY-MM-DD
      const isCurrentMonth = current.getMonth() === currentMonth;
      const completedTasks: {name: string, progressId: string}[] = [];
      selectedTaskProgressIds.forEach(progressId => {
        const taskCompletions = taskCompletionsByProgressId[progressId] || [];
        if (taskCompletions.includes(dateStr)) {
          const taskName = getTaskNameByProgressId(progressId);
          if (taskName) {
            completedTasks.push({name: taskName, progressId});
          }
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
      const [year, month] = date.split('-').map(Number);
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

  // Generate unique color based on task name hash
  const getUniqueTaskColor = (taskName: string) => {
    // Simple hash function for consistent color assignment
    let hash = 0;
    const name = taskName.toLowerCase();
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
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

    const index = Math.abs(hash) % colorPalette.length;
    return colorPalette[index];
  };

  //Seleccionar por defecto la primera tarea completada sin que que sea obligatoria siempre
  useEffect(() => {
    if (uniqueCompletedTaskNames.length > 0 && selectedTaskProgressIds.length === 0) {
      const firstTaskName = uniqueCompletedTaskNames[0];  
      const firstProgressIds = getProgressIdsForName(firstTaskName);
      setSelectedTaskProgressIds(firstProgressIds);
    }
  }, [uniqueCompletedTaskNames]);

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

  // If no completed tasks available, show empty state
  if (uniqueCompletedTaskNames.length === 0) {
    return <EmptyProgressState onNavigate={onNavigate} />;
  }

  return (
    <div className="p-2 md:p-4 space-y-2 md:space-y-6">
      {/* Task Pills */}
      <div className="space-y-2 md:space-y-4">
        <h2 className="text-sm md:text-lg lg:text-xl font-semibold text-white">Hábitos en construcción 🏗️ 💪</h2>
        <HabitReminder />
        <div className="flex flex-wrap justify-center mt-4 md:mt-6 gap-1 md:gap-2">
          {uniqueCompletedTaskNames.map(taskName => {
            const progressIds = getProgressIdsForName(taskName);
            const isSelected = progressIds.some(id => selectedTaskProgressIds.includes(id));
            const taskCount = progressIds.length;

            return (
              <button
                key={taskName}
                onClick={() => {
                  setSelectedTaskProgressIds(prev => {
                    const hasAnySelected = progressIds.some(id => prev.includes(id));
                    if (hasAnySelected) {
                      // Remove all progressIds of this task name
                      return prev.filter(id => !progressIds.includes(id));
                    } else {
                      // Add all progressIds of this task name
                      return [...prev, ...progressIds];
                    }
                  });
                }}
                className={`px-3 md:px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ease-in-out relative ${
                  isSelected
                    ? `${getUniqueTaskColor(taskName)} text-white shadow-lg`
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                }`}
              >
                {taskName}
                {taskCount > 1 && (
                  <span className="ml-1 text-xs opacity-75">
                    ({taskCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar */}
      <div className="space-y-2 md:space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-slate-400 hover:text-white transition-colors duration-150 ease-in-out rounded-lg hover:bg-slate-700"
            >
              <Icon name="chevronLeft" className="h-5 w-5" />
            </button>
            <h3 className="text-sm md:text-lg lg:text-xl font-semibold text-white">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-slate-400 hover:text-white transition-colors duration-150 ease-in-out rounded-lg hover:bg-slate-700"
            >
              <Icon name="chevronRight" className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className={`grid grid-cols-7 gap-1 md:gap-2 transition-opacity duration-150 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="p-1 md:p-2 text-center text-xs md:text-sm font-medium text-slate-400">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              const isToday = day.dateStr === new Date().toLocaleDateString('en-CA');
              return (
                <div
                  key={`${currentMonth}-${currentYear}-${index}`}
                  className={`p-1 md:p-2 text-center text-xs md:text-sm rounded-lg relative transition-colors duration-150 ease-in-out ${
                    day.isCurrentMonth
                      ? day.completedTasks.length > 0
                        ? "text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      : "bg-slate-800 text-slate-500"
                  } ${isToday ? "ring-2 ring-white ring-inset" : ""}`}
                >
                  {day.completedTasks.length === 0 ? (
                    day.day
                  ) : day.completedTasks.length === 1 ? (
                    <div className={`w-full h-full rounded-lg ${getUniqueTaskColor(day.completedTasks[0].name)} flex items-center justify-center`}>
                      {day.day}
                    </div>
                  ) : (
                    <>
                      <div className="w-full h-full flex gap-1 flex-wrap">
                        {day.completedTasks.map((task) => (
                          <div
                            key={generateUniqueId()}
                            className={`${getUniqueTaskColor(task.name)} flex-1 rounded-lg min-w-2.5 min-h-2.5`}
                          />
                        ))}
                      </div>
                      <div className="absolute top-0 right-0 text-[8px] sm:text-[12px] font-bold text-black bg-white bg-opacity-50 px-1 rounded">
                        {day.day}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      {/* Statistics */}
      {statistics && (
        <div className="space-y-2 md:space-y-4">
          <h3 className="text-sm md:text-lg lg:text-xl font-semibold text-white">Estadísticas Individuales</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            <div className="bg-slate-800 p-3 md:p-4 rounded-lg shadow-lg">
              <div className="flex items-center space-x-2">
                <Icon name="flame" className="h-5 md:h-6 w-5 md:w-6 text-orange-500" />
                <div>
                  <p className="text-lg md:text-2xl font-bold text-white">{statistics.streak}</p>
                  <p className="text-xs md:text-sm text-slate-400">Días de racha</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 p-3 md:p-4 rounded-lg shadow-lg">
              <div className="flex items-center space-x-2">
                <Icon name="calendar" className="h-5 md:h-6 w-5 md:w-6 text-blue-500" />
                <div>
                  <p className="text-lg md:text-2xl font-bold text-white">{statistics.monthlyCompletions}</p>
                  <p className="text-xs md:text-sm text-slate-400">Completadas este mes</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 p-3 md:p-4 rounded-lg shadow-lg col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2">
                <Icon name="checkCircle" className="h-5 md:h-6 w-5 md:w-6 text-emerald-500" />
                <div>
                  <p className="text-lg md:text-2xl font-bold text-white">{statistics.totalCompletions}</p>
                  <p className="text-xs md:text-sm text-slate-400">Total completadas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-3 md:p-4 rounded-lg shadow-lg">
            <p className="text-sm md:text-base text-white">
              {statistics.streak > 0 && (
                <>¡Mantén la racha semanal! Has completado este hábito por {statistics.streak} días consecutivos.</>
              )}
              {statistics.streak === 0 && statistics.totalCompletions > 0 && (
                <>Has completado este hábito {statistics.totalCompletions} veces en total. ¡Sigue adelante!</>
              )}
              {statistics.totalCompletions === 0 && (
                <>Aún no has completado este hábito. ¡Empieza hoy!</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressView;