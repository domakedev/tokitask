"use client";
import React, { useState, useMemo } from "react";
import { UserData, BaseTask, Priority } from "../types";
import Icon from "./Icon";

interface ProgressViewProps {
  userData: UserData;
}

const ProgressView: React.FC<ProgressViewProps> = ({ userData }) => {
  const [selectedTaskName, setSelectedTaskName] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isAnimating, setIsAnimating] = useState(false);

  // Usar completions por nombre que son persistentes
  const taskCompletionsByName = userData.taskCompletionsByName || {};

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

  // Get completion dates for selected task (aggregate by task name)
  const completionDates = useMemo(() => {
    if (!selectedTaskName) return [];

    const selectedTask = uniqueTasks.find(t => t.name === selectedTaskName);
    if (!selectedTask) return [];

    // Find all tasks with the same name across all sources
    const allTasksWithSameName: BaseTask[] = [];

    // Check general tasks
    userData.generalTasks.forEach(task => {
      if (task.name === selectedTask.name) {
        allTasksWithSameName.push(task);
      }
    });

    // Check day tasks
    userData.dayTasks.forEach(task => {
      if (task.name === selectedTask.name) {
        allTasksWithSameName.push(task);
      }
    });

    // Check weekly tasks
    Object.values(userData.weeklyTasks || {}).forEach(dayTasks => {
      dayTasks.forEach(task => {
        if (task.name === selectedTask.name) {
          allTasksWithSameName.push(task);
        }
      });
    });

    // Aggregate all completion dates from tasks with the same name
    const allCompletionDates: string[] = [];
    allTasksWithSameName.forEach(task => {
      // Usar completions por nombre que son persistentes
      const taskCompletions = taskCompletionsByName[task.name] || [];
      allCompletionDates.push(...taskCompletions);
    });

    // Remove duplicates and sort
    return [...new Set(allCompletionDates)].sort();
  }, [selectedTaskName, taskCompletionsByName, userData.generalTasks, userData.dayTasks, userData.weeklyTasks, uniqueTasks]);

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
      const isCompleted = completionDates.includes(dateStr);

      days.push({
        date: new Date(current),
        dateStr,
        isCurrentMonth,
        isCompleted,
        day: current.getDate()
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentMonth, currentYear, completionDates]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!selectedTaskName) return null;

    const completions = completionDates;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Current streak
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
      const d = new Date(date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // Days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    return {
      streak,
      monthlyCompletions,
      daysInMonth,
      totalCompletions: completions.length
    };
  }, [selectedTaskName, completionDates]);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.High: return "bg-red-500";
      case Priority.Medium: return "bg-yellow-500";
      case Priority.Low: return "bg-green-500";
      default: return "bg-gray-500";
    }
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
        <h2 className="text-xl font-semibold text-white">Seleccionar Tarea</h2>
        <div className="flex flex-wrap gap-2">
          {uniqueTasks.map(task => (
            <button
              key={task.id}
              onClick={() => setSelectedTaskName(selectedTaskName === task.name ? null : task.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedTaskName === task.name
                  ? `${getPriorityColor(task.priority)} text-white`
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {task.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      {selectedTaskName && (
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
              const selectedTask = uniqueTasks.find(t => t.name === selectedTaskName);
              return (
                <div
                  key={`${currentMonth}-${currentYear}-${index}`}
                  className={`p-2 text-center text-sm rounded-lg ${
                    day.isCurrentMonth
                      ? day.isCompleted
                        ? `${getPriorityColor(selectedTask?.priority || Priority.Low)} text-white`
                        : "bg-slate-700 text-slate-300"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {day.day}
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
                <>¡Mantén la racha! Has completado esta tarea por {statistics.streak} días consecutivos.</>
              )}
              {statistics.streak === 0 && statistics.totalCompletions > 0 && (
                <>Has completado esta tarea {statistics.totalCompletions} veces. ¡Sigue adelante!</>
              )}
              {statistics.totalCompletions === 0 && (
                <>Aún no has completado esta tarea. ¡Empieza hoy!</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressView;