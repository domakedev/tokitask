import React, { useCallback, useState, useMemo } from "react";
import { GeneralTask, UserData, BaseTask, WeekDay } from "../types";
import TaskList from "./TaskList";
import WeekDayTabs from "./WeekDayTabs";
import DayTaskNotice from "./DayTaskNotice";
import AllDaysTaskNotice from "./AllDaysTaskNotice";
import CopyPasteButtons from "./CopyPasteButtons";
import Icon from "./Icon";
import { useScheduledTasks } from "../hooks/useScheduledTasks";
import { formatDurationToHuman, parseDurationToMinutes } from "../utils/dateUtils";
import Badge from "./Badge";

interface GeneralViewProps {
  userData: UserData;
  onSaveTask: (task: BaseTask | Omit<BaseTask, "id">) => void;
  onSaveTaskForDay?: (task: BaseTask | Omit<BaseTask, "id">, day: WeekDay) => void;
  onDelete: (id: string) => void;
  onDeleteWeekly?: (id: string) => void;
  onDeleteCalendar?: (id: string) => void;
  onReorder: (tasks: (GeneralTask)[]) => Promise<void>;
  onReorderWeekly?: (tasks: GeneralTask[]) => Promise<void>;
  onReorderCalendar?: (tasks: GeneralTask[]) => Promise<void>;
  onEdit: (id: string) => void;
  onEditWeekly?: (id: string) => void;
  onEditCalendar?: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onToggleWeekly?: (id: string) => void;
  onSetEndOfDay: () => void;
  tempEndOfDay: string;
  setTempEndOfDay: (value: string) => void;
  onTabChange?: (tab: WeekDay) => void;
  onViewModeChange?: (mode: 'week' | 'calendar') => void;
  onSelectedDateChange?: (date: string) => void;
  viewMode?: 'week' | 'calendar';
}

const GeneralView: React.FC<GeneralViewProps> = ({
  userData,
  onDelete,
  onDeleteWeekly,
  onDeleteCalendar,
  onReorder,
  onReorderWeekly,
  onReorderCalendar,
  onEdit,
  onEditWeekly,
  onEditCalendar,
  onToggleComplete,
  onToggleWeekly,
  onSetEndOfDay,
  tempEndOfDay,
  setTempEndOfDay,
  onTabChange,
  onViewModeChange,
  onSelectedDateChange,
  viewMode: externalViewMode = 'week',
}) => {
  const [activeTab, setActiveTab] = useState<WeekDay>(WeekDay.All);
  // Usar el estado externo si está disponible, sino usar estado local
  const [internalViewMode, setInternalViewMode] = useState<'week' | 'calendar'>('week');
  const viewMode = externalViewMode || internalViewMode;
  const setViewMode = (mode: 'week' | 'calendar') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const { tasksForDate, scheduledTasks, weekTasks } = useScheduledTasks({ userData, selectedDate });

  const handleTabChange = useCallback((tab: WeekDay) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  const handleSetEndOfDay = useCallback(() => {
    onSetEndOfDay();
  }, [onSetEndOfDay]);

  // Obtener las tareas para la pestaña activa
  const currentTasks = useMemo(() => {
    if (activeTab === WeekDay.All) {
      return userData.generalTasks;
    }
    return userData.weeklyTasks?.[activeTab] || [];
  }, [userData, activeTab]);

  // Calcular el tiempo total de baseDuration para las tareas actuales
  const totalDuration = useMemo(() => {
    const totalMinutes = currentTasks.reduce((sum, task) => {
      return sum + parseDurationToMinutes(task.baseDuration);
    }, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, [currentTasks]);

  // Funciones específicas para tareas de días
  const handleDeleteWeeklyTask = useCallback((taskId: string) => {
    if (activeTab !== WeekDay.All && onDeleteWeekly) {
      onDeleteWeekly(taskId);
    } else {
      onDelete(taskId);
    }
  }, [activeTab, onDelete, onDeleteWeekly]);

  const handleEditWeeklyTask = useCallback((taskId: string) => {
    if (activeTab !== WeekDay.All && onEditWeekly) {
      onEditWeekly(taskId);
    } else {
      onEdit(taskId);
    }
  }, [activeTab, onEdit, onEditWeekly]);

  const handleToggleWeeklyTask = useCallback((taskId: string) => {
    if (activeTab !== WeekDay.All && onToggleWeekly) {
      onToggleWeekly(taskId);
    } else {
      onToggleComplete(taskId);
    }
  }, [activeTab, onToggleComplete, onToggleWeekly]);

  const handleReorderWeeklyTasks = useCallback(async (tasks: GeneralTask[]) => {
    if (activeTab !== WeekDay.All && onReorderWeekly) {
      await onReorderWeekly(tasks);
    } else {
      await onReorder(tasks);
    }
  }, [activeTab, onReorder, onReorderWeekly]);

  // Componente para el modo calendario
  const CalendarModeComponent: React.FC<{
    userData: UserData;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    currentMonth: number;
    setCurrentMonth: (month: number) => void;
    currentYear: number;
    setCurrentYear: (year: number) => void;
    tasksForDate: GeneralTask[];
    scheduledTasks: GeneralTask[];
    weekTasks: GeneralTask[];
    onDelete: (id: string) => void;
    onDeleteWeekly?: (id: string) => void;
    onDeleteCalendar?: (id: string) => void;
    onEdit: (id: string) => void;
    onEditWeekly?: (id: string) => void;
    onEditCalendar?: (id: string) => void;
    onToggleComplete: (id: string) => void;
    onToggleWeekly?: (id: string) => void;
    onSelectedDateChange?: (date: string) => void;
    generalViewMode: 'week' | 'calendar';
  }> = ({
    userData,
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    currentYear,
    setCurrentYear,
    tasksForDate,
    scheduledTasks,
    weekTasks,
    onDelete,
    onDeleteWeekly,
    onDeleteCalendar,
    onEdit,
    onEditWeekly,
    onEditCalendar,
    onToggleComplete,
    onToggleWeekly,
    onSelectedDateChange,
    generalViewMode,
  }) => {
    const [isWeekTasksExpanded, setIsWeekTasksExpanded] = useState(false);
    // Generar días del calendario
    const calendarDays = useMemo(() => {
      const firstDay = new Date(currentYear, currentMonth, 1);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

      const days = [];
      const current = new Date(startDate);

      // Crear un mapa de fechas con tareas para búsqueda rápida
      const tasksByDate = new Map<string, boolean>();

      // Agregar tareas de calendarTasks (tareas específicamente programadas)
      if (userData.calendarTasks) {
        userData.calendarTasks.forEach(task => {
          if (task.scheduledDate) {
            tasksByDate.set(task.scheduledDate, true);
          }
        });
      }

      for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
        const dateStr = current.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const isCurrentMonth = current.getMonth() === currentMonth;

        // Verificar si hay tareas específicamente programadas para esta fecha
        const hasSpecificTasks = tasksByDate.has(dateStr);

        days.push({
          date: new Date(current),
          dateStr,
          isCurrentMonth,
          hasSpecificTasks,
          day: current.getDate()
        });

        current.setDate(current.getDate() + 1);
      }

      return days;
    }, [currentMonth, currentYear, userData.calendarTasks]);

    const navigateMonth = (direction: 'prev' | 'next') => {
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
    };

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
      <div className="space-y-4">
        {/* Navegación del calendario */}
        <div className="flex items-center justify-between pt-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-slate-400 hover:text-white transition-colors duration-150 ease-in-out rounded-lg hover:bg-slate-700"
          >
            <Icon name="chevronLeft" className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold text-white">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-slate-400 hover:text-white transition-colors duration-150 ease-in-out rounded-lg hover:bg-slate-700"
          >
            <Icon name="chevronRight" className="h-5 w-5" />
          </button>
        </div>

        {/* Grid del calendario */}
        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-slate-400">
              {day}
            </div>
          ))}
          {calendarDays.map((day, index) => {
            const isToday = day.dateStr === new Date().toLocaleDateString('en-CA');
            const isSelected = day.dateStr === selectedDate;
            return (
              <div
                key={`${currentMonth}-${currentYear}-${index}`}
                onClick={() => {
                  setSelectedDate(day.dateStr);
                  onSelectedDateChange?.(day.dateStr);
                }}
                className={`p-2 text-center text-sm rounded-lg relative transition-colors duration-150 ease-in-out cursor-pointer ${
                  day.isCurrentMonth
                    ? day.hasSpecificTasks
                      ? "text-white bg-slate-600 hover:bg-slate-500"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    : "bg-slate-800 text-slate-500"
                } ${isToday ? "ring-2 ring-white ring-inset" : ""} ${isSelected ? "ring-2 ring-emerald-400" : ""}`}
              >
                {day.day}
                {day.hasSpecificTasks && (
                  <div className={`absolute bottom-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ${isToday && "animate-pulse"}`}></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tareas del día seleccionado */}
        {selectedDate && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-white mb-4">
              Tareas para hoy {(() => {
                // Parse date manually to avoid timezone issues
                const [year, month, day] = selectedDate.split('-').map(Number);
                const date = new Date(year, month - 1, day); // month is 0-indexed
                return date.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              })()}
            </h4>

            {/* Tareas programadas específicamente para esta fecha */}
            {scheduledTasks.length > 0 && (
              <div className="mb-6">
                <h5 className="text-md font-medium text-emerald-400 mb-3 flex items-center">
                  <Icon name="calendar" className="mr-2 h-4 w-4" />
                  Tareas programadas específicamente para este día
                </h5>
                <TaskList
                  tasks={scheduledTasks}
                  isDaily={false}
                  onDelete={onDeleteCalendar || onDelete}
                  onReorder={onReorderCalendar || (async () => {})}
                  onEdit={onEditCalendar || onEdit}
                  onToggleComplete={onToggleComplete}
                  showCopyButton={false}
                />
              </div>
            )}

            {/* Tareas de Mi semana (colapsables) */}
            {weekTasks.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setIsWeekTasksExpanded(!isWeekTasksExpanded)}
                  className="flex items-center text-md font-medium text-blue-400 mb-3 hover:text-blue-300 transition-colors"
                >
                  <Icon
                    name={isWeekTasksExpanded ? "chevronDown" : "chevronRight"}
                    className="mr-2 h-4 w-4"
                  />
                  Tareas de Mi semana ({weekTasks.length})
                </button>

                {isWeekTasksExpanded && (
                  <div className="ml-6">
                    <TaskList
                      tasks={weekTasks}
                      isDaily={false}
                      onDelete={onDeleteWeekly || onDelete}
                      onReorder={onReorderCalendar || (async () => {})}
                      onEdit={onEditWeekly || onEdit}
                      onToggleComplete={onToggleWeekly || onToggleComplete}
                      showCopyButton={false}
                      showEditButton={false} // Ocultar botón de editar
                      showDeleteButton={false} // Ocultar botón de eliminar
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mensaje cuando no hay tareas */}
            {scheduledTasks.length === 0 && weekTasks.length === 0 && (
              <p className="text-slate-400 text-center py-8">
                No hay tareas programadas para este día
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <header className="p-2 md:p-4 space-y-2 md:space-y-4 backdrop-blur-sm z-10">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-white">Horario General</h1>
          <p className="text-xs md:text-sm text-slate-400">
            Plantilla de tareas y configuración por día
          </p>
        </div>
        <div className="p-2 md:p-4 bg-slate-800 rounded-lg">
          <label
            htmlFor="end-of-day"
            className="block text-sm md:text-base font-semibold text-white mb-2"
          >
            Hora de finalización para todos los días
          </label>
          <div className="flex items-center space-x-2 md:space-x-3">
            <input
              type="time"
              id="end-of-day"
              value={tempEndOfDay}
              onChange={(e) => setTempEndOfDay(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-1 px-2 md:py-2 md:px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={handleSetEndOfDay}
              className="bg-emerald-500 text-white font-semibold py-1 px-3 md:py-2 md:px-4 rounded-lg shadow-lg hover:bg-emerald-600 transition-colors duration-150 ease-in-out"
            >
              Actualizar
            </button>
          </div>
        </div>

        {/* Toggle de vista */}
        <div className="flex justify-center">
          <div className="bg-slate-800 rounded-lg p-1 flex">
            <button
              onClick={() => {
                setViewMode('week');
                onViewModeChange?.('week');
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon name="list" className="inline mr-2 h-4 w-4" />
              Mi semana
            </button>
            <button
              onClick={() => {
                setViewMode('calendar');
                onViewModeChange?.('calendar');
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon name="calendar" className="inline mr-2 h-4 w-4" />
              Calendario
            </button>
          </div>
        </div>

        {/* Mensaje informativo */}
        <div className="text-center mb-4">
          {viewMode === 'week' ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <Icon name="info" className="inline mr-2 h-4 w-4" />
                Aquí puedes agregar tareas que se repetirán todos los días o en días específicos de la semana.
                Para tareas programadas en fechas concretas, usa la vista Calendario.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <p className="text-sm text-emerald-300">
                <Icon name="calendar" className="inline mr-2 h-4 w-4" />
                Aquí puedes programar tareas para fechas específicas. Selecciona un día del calendario
                para ver y gestionar las tareas de esa fecha.
              </p>
              <p className="text-xs text-emerald-400 mt-2">
                <Icon name="bell" className="inline mr-1 h-3 w-3" />
                Las tareas programadas te avisarán automáticamente a las 6:00 AM
              </p>
            </div>
          )}
        </div>
      </header>
      <main className="px-2 md:px-6 mt-2 md:mt-4 bg-slate-800/80 rounded-xl">
        {viewMode === 'week' ? (
          <>
            <WeekDayTabs activeTab={activeTab} onTabChange={handleTabChange} />
            {activeTab !== WeekDay.All && <DayTaskNotice />}
            {activeTab === WeekDay.All && <AllDaysTaskNotice />}

            <div className="flex items-center justify-between">
              <Badge label={`Tiempo total: ${formatDurationToHuman(totalDuration)}`} variant="base" icon="timer" />
              <CopyPasteButtons activeTab={activeTab} />
            </div>

            <TaskList
              tasks={currentTasks}
              isDaily={false}
              onDelete={activeTab === WeekDay.All ? onDelete : handleDeleteWeeklyTask}
              onReorder={activeTab === WeekDay.All ? onReorder : handleReorderWeeklyTasks}
              onEdit={activeTab === WeekDay.All ? onEdit : handleEditWeeklyTask}
              onToggleComplete={activeTab === WeekDay.All ? onToggleComplete : handleToggleWeeklyTask}
            />
          </>
        ) : (
          /* Modo calendario - sin botones de copiar/pegar */
          <CalendarModeComponent
            userData={userData}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            currentYear={currentYear}
            setCurrentYear={setCurrentYear}
            tasksForDate={tasksForDate}
            scheduledTasks={scheduledTasks}
            weekTasks={weekTasks}
            onDelete={onDelete}
            onDeleteWeekly={onDeleteWeekly}
            onDeleteCalendar={onDeleteCalendar}
            onEdit={onEdit}
            onEditWeekly={onEditWeekly}
            onEditCalendar={onEditCalendar}
            onToggleComplete={onToggleComplete}
            onToggleWeekly={onToggleWeekly}
            onSelectedDateChange={onSelectedDateChange}
            generalViewMode={viewMode}
          />
        )}

        {/* Espacio para el botón flotante de nueva tarea */}
        <div className="h-20"></div>
      </main>
    </div>
  );
};

export default GeneralView;