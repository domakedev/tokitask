import { create } from 'zustand';
import { BaseTask, DayTask, GeneralTask, Page, WeekDay, WEEKDAY_LABELS } from '../types';
import { updateUserData } from '../services/firestoreService';
import { generateTaskId } from '../utils/idGenerator';
import { toast } from 'react-toastify';
import { useAuthStore } from './authStore';
import { useProgressStore } from './progressStore';
import { useScheduleStore } from './scheduleStore';
import { useTimerStore } from './timerStore';

interface TaskState {
  isModalOpen: boolean;
  editingTask: BaseTask | null;
  showConfirmation: boolean;
  taskToDelete: BaseTask | null;
  copiedTask: BaseTask | null;
  setModalOpen: (open: boolean) => void;
  setEditingTask: (task: BaseTask | null) => void;
  setShowConfirmation: (show: boolean) => void;
  setTaskToDelete: (task: BaseTask | null) => void;
  setCopiedTask: (task: BaseTask | null) => void;
  clearCopiedTask: () => void;
  handleSaveTask: (task: BaseTask | Omit<BaseTask, 'id' | 'progressId'>, activeTab?: WeekDay) => Promise<void>;
  handlePasteTask: (activeTab?: WeekDay) => Promise<void>;
  handleToggleComplete: (taskId: string) => Promise<void>;
  handleDeleteTask: (taskId: string) => void;
  confirmDelete: () => Promise<void>;
  handleEditTask: (taskId: string) => void;
  handleReorderTasks: (reorderedTasks: (DayTask | GeneralTask)[]) => Promise<void>;
  handleClearAllDayTasks: () => Promise<void>;
  handleUpdateHabitForAllTasks: (taskId: string, isHabit: boolean) => Promise<void>;
  handleMoveTaskToTomorrow: (taskId: string) => Promise<void>;
  recalculateCurrentDayTask: (tasks: DayTask[]) => DayTask[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  isModalOpen: false,
  editingTask: null,
  showConfirmation: false,
  taskToDelete: null,
  copiedTask: null,

  setModalOpen: (isModalOpen) => set({ isModalOpen }),
  setEditingTask: (editingTask) => set({ editingTask }),
  setShowConfirmation: (showConfirmation) => set({ showConfirmation }),
  setTaskToDelete: (taskToDelete) => set({ taskToDelete }),
  setCopiedTask: (copiedTask) => set({ copiedTask }),
  clearCopiedTask: () => set({ copiedTask: null }),

  recalculateCurrentDayTask: (tasks: DayTask[]) => {
    const firstPendingIndex = tasks.findIndex((task) => !task.completed);
    return tasks.map((task, index) => ({
      ...task,
      isCurrent: index === firstPendingIndex,
    }));
  },

  handleSaveTask: async (task, activeTab) => {
    const { user } = useAuthStore.getState();
    const { userData } = useAuthStore.getState();
    const scheduleState = useScheduleStore.getState();
    const { currentPage, dayTasks, generalTasks, setDayTasks, setGeneralTasks } = scheduleState;
    const { weeklyTasks, setWeeklyTasks, calendarTasks, setCalendarTasks } = scheduleState;
    const { taskCompletionsByProgressId, setTaskCompletionsByProgressId } = useProgressStore.getState();

    if (!user || !userData) return;

    const prevUserData = { ...userData };
    try {
      // Verificar si es una edición y si se está cambiando isHabit
      const isEditing = 'id' in task;
      let isHabitChanged = false;
      let originalTask;

      if (isEditing) {
        // Buscar la tarea original para comparar isHabit
        const allTasks = [
          ...dayTasks,
          ...generalTasks,
          ...Object.values(userData.weeklyTasks || {}).flat(),
          ...(userData.calendarTasks || [])
        ];
        originalTask = allTasks.find((t) => t.id === (task as BaseTask).id);
        if (originalTask && 'isHabit' in task && originalTask.isHabit !== task.isHabit) {
          isHabitChanged = true;
        }
      }

      // Determinar dónde guardar la tarea
      const hasScheduledDate = task.scheduledDate && task.scheduledDate.trim() !== "";
      const isFromCalendarView = currentPage === Page.General && activeTab === undefined; // Cuando viene del calendario

      let targetLocation: 'day' | 'general' | 'weekly' | 'calendar' = 'general';
      if (isEditing) {
        const taskId = (task as BaseTask).id;
        if (dayTasks.some(t => t.id === taskId)) {
          targetLocation = 'day';
        } else if (generalTasks.some(t => t.id === taskId)) {
          targetLocation = 'general';
        } else if (Object.values(weeklyTasks).some(tasks => tasks.some(t => t.id === taskId))) {
          targetLocation = 'weekly';
        } else if (calendarTasks?.some(t => t.id === taskId)) {
          targetLocation = 'calendar';
        }
      } else {
        if (currentPage === Page.Day) {
          targetLocation = 'day';
        } else if (hasScheduledDate && isFromCalendarView) {
          targetLocation = 'calendar';
        } else if (activeTab && activeTab !== WeekDay.All) {
          targetLocation = 'weekly';
        } else {
          targetLocation = 'general';
        }
      }

      switch (targetLocation) {
        case 'day':
          const taskName = task.name.trim().toLowerCase();
          const existingTask = dayTasks.find(t => t.name.trim().toLowerCase() === taskName && (!isEditing || t.id !== (task as BaseTask).id));
          if (existingTask) {
            toast.error(`Ya existe una tarea con el nombre "${task.name}" en el día actual.`);
            throw new Error('Duplicate task name');
          }
          const updatedTasks = isEditing
            ? dayTasks.map((t) => (t.id === (task as BaseTask).id ? { ...t, ...task } : t))
            : [
                ...dayTasks,
                {
                  ...task,
                  id: generateTaskId(),
                  progressId: generateTaskId(),
                  completed: false,
                  isCurrent: false,
                  aiDuration: '',
                  flexibleTime: task.flexibleTime ?? true,
                  isHabit: task.isHabit ?? false,
                } as DayTask,
              ];
          const recalculatedTasks = get().recalculateCurrentDayTask(updatedTasks as DayTask[]);
          setDayTasks(recalculatedTasks);
          const updatedUserData = {
            ...userData,
            dayTasks: recalculatedTasks,
          };
          await updateUserData(user.uid, updatedUserData);
          useAuthStore.getState().setUserData(updatedUserData);
          break;
        case 'calendar':
        const currentCalendarTasks = calendarTasks || [];
        const taskNameCal = task.name.trim().toLowerCase();
        const existingTaskCal = currentCalendarTasks.find(t => t.name.trim().toLowerCase() === taskNameCal && t.scheduledDate === task.scheduledDate && (!isEditing || t.id !== (task as BaseTask).id));
        if (existingTaskCal) {
          toast.error(`Ya existe una tarea con el nombre "${task.name}" programada para esta fecha.`);
          throw new Error('Duplicate task name');
        }
        const updatedCalendarTasks = isEditing
          ? currentCalendarTasks.map((t) => (t.id === (task as BaseTask).id ? { ...t, ...task } : t))
          : [
              ...currentCalendarTasks,
              {
                ...task,
                id: generateTaskId(),
                progressId: generateTaskId(),
                completed: false,
                baseDuration: task.baseDuration || '',
                flexibleTime: task.flexibleTime ?? true,
                isHabit: task.isHabit ?? false,
              } as GeneralTask,
            ];
        setCalendarTasks(updatedCalendarTasks);
        const updatedUserDataCal = { ...userData, calendarTasks: updatedCalendarTasks };
        await updateUserData(user.uid, updatedUserDataCal);
        useAuthStore.getState().setUserData(updatedUserDataCal);
        break;
      case 'weekly':
        const day: WeekDay = isEditing ? (Object.keys(weeklyTasks).find(d => weeklyTasks[d as WeekDay].some(t => t.id === (task as BaseTask).id)) as WeekDay)! : activeTab!;
        const currentWeeklyTasks = weeklyTasks[day] || [];
        const taskNameWeek = task.name.trim().toLowerCase();
        const existingTaskWeek = currentWeeklyTasks.find((t: GeneralTask) => t.name.trim().toLowerCase() === taskNameWeek && (!isEditing || t.id !== (task as BaseTask).id));
        if (existingTaskWeek) {
          toast.error(`Ya existe una tarea con el nombre "${task.name}" en ${WEEKDAY_LABELS[day]}.`);
          throw new Error('Duplicate task name');
        }
        const updatedWeeklyTasks = isEditing
          ? currentWeeklyTasks.map((t: GeneralTask) => (t.id === (task as BaseTask).id ? { ...t, ...task } : t))
          : [
              ...currentWeeklyTasks,
              {
                ...task,
                id: generateTaskId(),
                progressId: generateTaskId(),
                completed: false,
                baseDuration: task.baseDuration || '',
                flexibleTime: task.flexibleTime ?? true,
                isHabit: task.isHabit ?? false,
              } as GeneralTask,
            ];
        const updatedWeeklyTasksObj = { ...weeklyTasks, [day]: updatedWeeklyTasks };
        setWeeklyTasks(updatedWeeklyTasksObj);
        const updatedUserDataWeek = { ...userData, weeklyTasks: updatedWeeklyTasksObj };
        await updateUserData(user.uid, updatedUserDataWeek);
        useAuthStore.getState().setUserData(updatedUserDataWeek);
        break;
      case 'general':
        const taskNameGen = task.name.trim().toLowerCase();
        const existingTaskGen = generalTasks.find(t => t.name.trim().toLowerCase() === taskNameGen && (!isEditing || t.id !== (task as BaseTask).id));
        if (existingTaskGen) {
          toast.error(`Ya existe una tarea con el nombre "${task.name}" en tareas generales.`);
          throw new Error('Duplicate task name');
        }
        const updatedGeneralTasks = isEditing
          ? generalTasks.map((t) => (t.id === (task as BaseTask).id ? { ...t, ...task } : t))
          : [
              ...generalTasks,
              {
                ...task,
                id: generateTaskId(),
                progressId: generateTaskId(),
                completed: false,
                baseDuration: task.baseDuration || '',
                flexibleTime: task.flexibleTime ?? true,
                isHabit: task.isHabit ?? false,
              } as GeneralTask,
            ];
        setGeneralTasks(updatedGeneralTasks);
        const updatedUserDataGen = { ...userData, generalTasks: updatedGeneralTasks };
        await updateUserData(user.uid, updatedUserDataGen);
        useAuthStore.getState().setUserData(updatedUserDataGen);
        break;
      }

      // Si se cambió isHabit, actualizar todas las tareas con el mismo nombre
      if (isHabitChanged && isEditing && 'isHabit' in task) {
        await get().handleUpdateHabitForAllTasks((task as BaseTask).id, task.isHabit!);
      }

      set({ isModalOpen: false, editingTask: null });
      const taskName = 'name' in task ? task.name : 'Tarea';
      const action = isEditing ? 'actualizó' : 'añadida';
      toast.success(`Se ${action} tarea "${taskName}" en la base de datos.`);
    } catch (error) {
      console.error('Error en handleSaveTask:', error);
      useAuthStore.getState().setUserData(prevUserData);
      const taskName = 'name' in task ? task.name : 'Tarea';
      toast.error(`Error al guardar tarea "${taskName}". No se guardó en la base de datos.`);
    }
  },

  handleToggleComplete: async (taskId) => {
    const { user } = useAuthStore.getState();
    const { userData } = useAuthStore.getState();
    const { currentPage, dayTasks, generalTasks, calendarTasks, setDayTasks, setGeneralTasks, setCalendarTasks } = useScheduleStore.getState();
    const { taskCompletionsByProgressId, setTaskCompletionsByProgressId } = useProgressStore.getState();

    if (!user || !userData) return;

    const prevUserData = { ...userData };
    try {
      const now = new Date().toLocaleDateString('en-CA');
      const completions = taskCompletionsByProgressId || {};

      let taskProgressId = '';
      if (currentPage === Page.Day) {
        const task = dayTasks.find((t) => t.id === taskId);
        taskProgressId = task?.progressId || '';
      } else {
        // Buscar en generalTasks primero
        let task = generalTasks.find((t) => t.id === taskId);
        if (!task && calendarTasks) {
          // Si no está en generalTasks, buscar en calendarTasks
          task = calendarTasks.find((t) => t.id === taskId);
        }
        taskProgressId = task?.progressId || '';
      }

      if (currentPage === Page.Day) {
        const updatedTasks = dayTasks.map((t) => {
          if (t.id === taskId) {
            const wasCompleted = t.completed;
            const newCompleted = !t.completed;

            // Detener temporizador si la tarea se está completando
            if (newCompleted && !wasCompleted) {
              const { activeTimer, clearActiveTimer } = useTimerStore.getState();
              if (activeTimer && activeTimer.taskId === taskId) {
                clearActiveTimer();
              }
            }

            if (newCompleted && !wasCompleted && taskProgressId) {
              const currentCompletions = completions[taskProgressId] || [];
              if (!currentCompletions.includes(now)) {
                completions[taskProgressId] = [...currentCompletions, now];
              }
            } else if (!newCompleted && wasCompleted && taskProgressId) {
              const progressIdCompletions = completions[taskProgressId] || [];
              const todayIndex = progressIdCompletions.indexOf(now);
              if (todayIndex !== -1) {
                progressIdCompletions.splice(todayIndex, 1);
                completions[taskProgressId] = progressIdCompletions;
              }
            }

            return { ...t, completed: newCompleted };
          }
          return t;
        });
        const recalculatedTasks = get().recalculateCurrentDayTask(updatedTasks);
        setDayTasks(recalculatedTasks);
        const updatedUserData = {
          ...userData,
          dayTasks: recalculatedTasks,
          taskCompletionsByProgressId: completions,
        };
        await updateUserData(user.uid, updatedUserData);
        useAuthStore.getState().setUserData(updatedUserData);
        setTaskCompletionsByProgressId(completions);
        const task = dayTasks.find((t) => t.id === taskId);
        const taskName = task?.name || 'Tarea';
        toast.success(`Se actualizó estado de tarea "${taskName}" en la base de datos.`);
      } else {
        // Verificar si la tarea está en calendarTasks
        const isCalendarTask = calendarTasks?.some(t => t.id === taskId);

        if (isCalendarTask && calendarTasks) {
          const updatedTasks = calendarTasks.map((t) => {
            if (t.id === taskId) {
              const wasCompleted = t.completed;
              const newCompleted = !t.completed;

              // Detener temporizador si la tarea se está completando
              if (newCompleted && !wasCompleted) {
                const { activeTimer, clearActiveTimer } = useTimerStore.getState();
                if (activeTimer && activeTimer.taskId === taskId) {
                  clearActiveTimer();
                }
              }

              if (newCompleted && !wasCompleted && taskProgressId) {
                const currentCompletions = completions[taskProgressId] || [];
                if (!currentCompletions.includes(now)) {
                  completions[taskProgressId] = [...currentCompletions, now];
                }
              } else if (!newCompleted && wasCompleted && taskProgressId) {
                const progressIdCompletions = completions[taskProgressId] || [];
                const todayIndex = progressIdCompletions.indexOf(now);
                if (todayIndex !== -1) {
                  progressIdCompletions.splice(todayIndex, 1);
                  completions[taskProgressId] = progressIdCompletions;
                }
              }

              return { ...t, completed: newCompleted };
            }
            return t;
          });
          setCalendarTasks(updatedTasks);
          const updatedUserData = {
            ...userData,
            calendarTasks: updatedTasks,
            taskCompletionsByProgressId: completions,
          };
          await updateUserData(user.uid, updatedUserData);
          useAuthStore.getState().setUserData(updatedUserData);
          setTaskCompletionsByProgressId(completions);
          const task = calendarTasks.find((t) => t.id === taskId);
          const taskName = task?.name || 'Tarea';
          toast.success(`Se actualizó estado de tarea "${taskName}" en la base de datos.`);
        } else {
          const updatedTasks = generalTasks.map((t) => {
            if (t.id === taskId) {
              const wasCompleted = t.completed;
              const newCompleted = !t.completed;

              // Detener temporizador si la tarea se está completando
              if (newCompleted && !wasCompleted) {
                const { activeTimer, clearActiveTimer } = useTimerStore.getState();
                if (activeTimer && activeTimer.taskId === taskId) {
                  clearActiveTimer();
                }
              }

              if (newCompleted && !wasCompleted && taskProgressId) {
                const currentCompletions = completions[taskProgressId] || [];
                if (!currentCompletions.includes(now)) {
                  completions[taskProgressId] = [...currentCompletions, now];
                }
              } else if (!newCompleted && wasCompleted && taskProgressId) {
                const progressIdCompletions = completions[taskProgressId] || [];
                const todayIndex = progressIdCompletions.indexOf(now);
                if (todayIndex !== -1) {
                  progressIdCompletions.splice(todayIndex, 1);
                  completions[taskProgressId] = progressIdCompletions;
                }
              }

              return { ...t, completed: newCompleted };
            }
            return t;
          });
          setGeneralTasks(updatedTasks);
          const updatedUserData = {
            ...userData,
            generalTasks: updatedTasks,
            taskCompletionsByProgressId: completions,
          };
          await updateUserData(user.uid, updatedUserData);
          useAuthStore.getState().setUserData(updatedUserData);
          setTaskCompletionsByProgressId(completions);
          const task = generalTasks.find((t) => t.id === taskId);
          const taskName = task?.name || 'Tarea';
          toast.success(`Se actualizó estado de tarea "${taskName}" en la base de datos.`);
        }
      }
    } catch (error) {
      console.error('Error en handleToggleComplete:', error);
      useAuthStore.getState().setUserData(prevUserData);
      let taskName = 'Tarea';
      if (currentPage === Page.Day) {
        const task = dayTasks.find((t) => t.id === taskId);
        taskName = task?.name || 'Tarea';
      } else {
        // Buscar en generalTasks primero
        let task = generalTasks.find((t) => t.id === taskId);
        if (!task && calendarTasks) {
          // Si no está en generalTasks, buscar en calendarTasks
          task = calendarTasks.find((t) => t.id === taskId);
        }
        taskName = task?.name || 'Tarea';
      }
      toast.error(`Error al actualizar estado de tarea "${taskName}". No se guardó en la base de datos.`);
    }
  },

  handleDeleteTask: (taskId) => {
    const { userData } = useAuthStore.getState();
    const { dayTasks, generalTasks, weeklyTasks, calendarTasks } = useScheduleStore.getState();

    const task = [
      ...dayTasks,
      ...generalTasks,
      ...Object.values(weeklyTasks).flat(),
      ...(calendarTasks || []),
    ].find((t) => t.id === taskId);
    if (task) {
      set({ taskToDelete: task, showConfirmation: true });
    }
  },

  confirmDelete: async () => {
    const { user } = useAuthStore.getState();
    const { userData } = useAuthStore.getState();
    const { taskToDelete } = get();
    const { currentPage, dayTasks, generalTasks, weeklyTasks, calendarTasks, setDayTasks, setGeneralTasks, setWeeklyTasks, setCalendarTasks } = useScheduleStore.getState();

    if (!user || !userData || !taskToDelete) return;

    const prevUserData = { ...userData };
    try {
      // Detener temporizador si la tarea lo tenía activo
      const { activeTimer, clearActiveTimer } = useTimerStore.getState();
      if (activeTimer && activeTimer.taskId === taskToDelete.id) {
        clearActiveTimer();
      }

      if (currentPage === Page.Day) {
        const updatedTasks = dayTasks.filter((t) => t.id !== taskToDelete.id);
        const recalculatedTasks = get().recalculateCurrentDayTask(updatedTasks);
        setDayTasks(recalculatedTasks);
        const updatedUserData = {
          ...userData,
          dayTasks: recalculatedTasks,
        };
        await updateUserData(user.uid, updatedUserData);
        useAuthStore.getState().setUserData(updatedUserData);
        set({ showConfirmation: false, taskToDelete: null });
        const taskName = taskToDelete.name || 'Tarea';
        toast.success(`Se eliminó tarea "${taskName}" de la DB.`);
      } else {
        // Verificar si la tarea está en calendarTasks
        const isCalendarTask = calendarTasks?.some(t => t.id === taskToDelete.id);
        if (isCalendarTask) {
          const updatedTasks = calendarTasks.filter((t) => t.id !== taskToDelete.id);
          setCalendarTasks(updatedTasks);
          const updatedUserData = { ...userData, calendarTasks: updatedTasks };
          await updateUserData(user.uid, updatedUserData);
          useAuthStore.getState().setUserData(updatedUserData);
        } else {
          const updatedTasks = generalTasks.filter((t) => t.id !== taskToDelete.id);
          setGeneralTasks(updatedTasks);
          const updatedUserData = { ...userData, generalTasks: updatedTasks };
          await updateUserData(user.uid, updatedUserData);
          useAuthStore.getState().setUserData(updatedUserData);
        }
        set({ showConfirmation: false, taskToDelete: null });
        const taskName = taskToDelete.name || 'Tarea';
        toast.success(`Se eliminó tarea "${taskName}" de la DB.`);
      }
    } catch (error) {
      console.error('Error en confirmDelete:', error);
      useAuthStore.getState().setUserData(prevUserData);
      set({ showConfirmation: false, taskToDelete: null });
      const taskName = taskToDelete.name || 'Tarea';
      toast.error(`Error al eliminar tarea "${taskName}". No se guardó en la base de datos.`);
    }
  },

  handleEditTask: (taskId) => {
    const { userData } = useAuthStore.getState();
    const { dayTasks, generalTasks, weeklyTasks, calendarTasks } = useScheduleStore.getState();

    const task = [
      ...dayTasks,
      ...generalTasks,
      ...Object.values(weeklyTasks).flat(),
      ...(calendarTasks || []),
    ].find((t) => t.id === taskId);
    if (task) {
      set({ editingTask: task, isModalOpen: true });
    }
  },

  handleReorderTasks: async (reorderedTasks) => {
    const { user } = useAuthStore.getState();
    const { userData } = useAuthStore.getState();
    const { currentPage, setDayTasks, setGeneralTasks } = useScheduleStore.getState();

    if (!user || !userData) return;

    const prevUserData = { ...userData };
    try {
      let updatedUserData;
      if (currentPage === Page.Day) {
        const recalculatedTasks = get().recalculateCurrentDayTask(reorderedTasks as DayTask[]);
        setDayTasks(recalculatedTasks);
        updatedUserData = {
          ...userData,
          dayTasks: recalculatedTasks,
        };
      } else {
        setGeneralTasks(reorderedTasks as GeneralTask[]);
        updatedUserData = {
          ...userData,
          generalTasks: reorderedTasks as GeneralTask[],
        };
      }
      await updateUserData(user.uid, updatedUserData);
      useAuthStore.getState().setUserData(updatedUserData);
    } catch (error) {
      console.error('Error en handleReorderTasks:', error);
      useAuthStore.getState().setUserData(prevUserData);
      toast.error('Error al reordenar las tareas. No se guardó en la base de datos.');
    }
  },

  handleClearAllDayTasks: async () => {
    const { user } = useAuthStore.getState();
    const { userData } = useAuthStore.getState();
    const { currentPage, setDayTasks } = useScheduleStore.getState();

    if (!user || !userData || currentPage !== Page.Day) return;

    const prevUserData = { ...userData };
    try {
      setDayTasks([]);
      const updatedUserData = {
        ...userData,
        dayTasks: [],
      };
      await updateUserData(user.uid, updatedUserData);
      useAuthStore.getState().setUserData(updatedUserData);
      toast.success('Todas las tareas del día han sido eliminadas.');
    } catch (error) {
      console.error('Error en handleClearAllDayTasks:', error);
      useAuthStore.getState().setUserData(prevUserData);
      toast.error('Error al eliminar las tareas. No se guardó en la base de datos.');
    }
  },

  handleUpdateHabitForAllTasks: async (taskId: string, isHabit: boolean) => {
    const { user } = useAuthStore.getState();
    const { userData } = useAuthStore.getState();
    const { dayTasks, generalTasks, weeklyTasks, calendarTasks, setDayTasks, setGeneralTasks, setWeeklyTasks, setCalendarTasks } = useScheduleStore.getState();

    if (!user || !userData) return;

    // Encontrar la tarea original para obtener su nombre
    const allTasks = [
      ...dayTasks,
      ...generalTasks,
      ...Object.values(weeklyTasks).flat(),
      ...(calendarTasks || []),
    ];
    const originalTask = allTasks.find((t) => t.id === taskId);
    if (!originalTask) return;

    const taskName = originalTask.name.trim().toLowerCase();
    const prevUserData = { ...userData };

    try {
      // Actualizar dayTasks
      const updatedDayTasks = dayTasks.map((task) =>
        task.name.trim().toLowerCase() === taskName ? { ...task, isHabit } : task
      );

      // Actualizar generalTasks
      const updatedGeneralTasks = generalTasks.map((task) =>
        task.name.trim().toLowerCase() === taskName ? { ...task, isHabit } : task
      );

      // Actualizar weeklyTasks
      const updatedWeeklyTasks = { ...weeklyTasks };
      (Object.keys(updatedWeeklyTasks) as (keyof typeof updatedWeeklyTasks)[]).forEach((day) => {
        updatedWeeklyTasks[day] = updatedWeeklyTasks[day].map((task: GeneralTask) =>
          task.name.trim().toLowerCase() === taskName ? { ...task, isHabit } : task
        );
      });

      // Actualizar calendarTasks
      const updatedCalendarTasks = (calendarTasks || []).map((task) =>
        task.name.trim().toLowerCase() === taskName ? { ...task, isHabit } : task
      );

      // Actualizar Zustand stores
      setDayTasks(updatedDayTasks);
      setGeneralTasks(updatedGeneralTasks);
      setWeeklyTasks(updatedWeeklyTasks);
      setCalendarTasks(updatedCalendarTasks);

      // Actualizar userData y base de datos
      const updatedUserData = {
        ...userData,
        dayTasks: updatedDayTasks,
        generalTasks: updatedGeneralTasks,
        weeklyTasks: updatedWeeklyTasks,
        calendarTasks: updatedCalendarTasks,
      };

      await updateUserData(user.uid, updatedUserData);
      useAuthStore.getState().setUserData(updatedUserData);

      const habitText = isHabit ? 'marcada como hábito' : 'desmarcada como hábito';
      toast.success(`Tarea "${originalTask.name}" ${habitText} en todos los horarios.`);
    } catch (error) {
      console.error('Error en handleUpdateHabitForAllTasks:', error);
      useAuthStore.getState().setUserData(prevUserData);
      toast.error(`Error al actualizar el hábito de "${originalTask.name}". No se guardó en la base de datos.`);
    }
  },

  handleMoveTaskToTomorrow: async (taskId) => {
    const { user } = useAuthStore.getState();
    const { userData } = useAuthStore.getState();
    const { dayTasks, setDayTasks, setCalendarTasks } = useScheduleStore.getState();

    if (!user || !userData) return;

    const prevUserData = { ...userData };
    try {
      const task = dayTasks.find((t) => t.id === taskId);
      if (!task) return;

      // Calcular fecha de mañana
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      console.log("🚀 ~ tomorrowStr:", tomorrowStr)

      const calendarTasks = userData.calendarTasks || [];
      let updatedCalendarTasks;
      if (task.scheduledDate) {
        // Es una tarea programada, cambiar su fecha (buscar por nombre y fecha actual)
        updatedCalendarTasks = calendarTasks.map(t =>
          t.name === task.name && t.scheduledDate === task.scheduledDate ? { ...t, scheduledDate: tomorrowStr } : t
        );
      } else {
        // No programada, crear nueva
        const newCalendarTask: GeneralTask = {
          id: task.id, // Mantener el mismo id
          name: task.name,
          baseDuration: task.baseDuration,
          priority: task.priority,
          progressId: task.progressId,
          flexibleTime: task.flexibleTime,
          isHabit: task.isHabit,
          scheduledDate: tomorrowStr,
          completed: false,
          ...(task.startTime && { startTime: task.startTime }),
          ...(task.endTime && { endTime: task.endTime }),
        };
        updatedCalendarTasks = [...calendarTasks, newCalendarTask];
      }
      setCalendarTasks(updatedCalendarTasks);

      // Eliminar de dayTasks
      const updatedDayTasks = dayTasks.filter((t) => t.id !== taskId);
      const recalculatedDayTasks = get().recalculateCurrentDayTask(updatedDayTasks);
      setDayTasks(recalculatedDayTasks);

      // Actualizar userData
      const updatedUserData = {
        ...userData,
        dayTasks: recalculatedDayTasks,
        calendarTasks: updatedCalendarTasks,
      };
      await updateUserData(user.uid, updatedUserData);
      useAuthStore.getState().setUserData(updatedUserData);

      toast.success(`Tarea "${task.name}" movida para mañana.`);
    } catch (error) {
      console.error('Error en handleMoveTaskToTomorrow:', error);
      useAuthStore.getState().setUserData(prevUserData);
      toast.error('Error al mover la tarea para mañana. No se guardó en la base de datos.');
    }
  },

  handlePasteTask: async (activeTab) => {
    const { copiedTask } = get();
    if (!copiedTask) {
      toast.error('No hay tarea copiada.');
      return;
    }
    // Crear una copia sin id y progressId, excluyendo campos undefined
    const taskToPaste: Omit<BaseTask, 'id' | 'progressId'> = {
      name: copiedTask.name,
      baseDuration: copiedTask.baseDuration,
      priority: copiedTask.priority,
      flexibleTime: copiedTask.flexibleTime,
      isHabit: copiedTask.isHabit,
      ...(copiedTask.startTime && { startTime: copiedTask.startTime }),
      ...(copiedTask.endTime && { endTime: copiedTask.endTime }),
      ...(copiedTask.scheduledDate && { scheduledDate: copiedTask.scheduledDate }),
    };
    try {
      await get().handleSaveTask(taskToPaste, activeTab);
      // El toast de éxito se muestra en handleSaveTask
    } catch (error) {
      // Error ya mostrado en handleSaveTask, no hacer nada
    }
  },
}));