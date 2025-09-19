import { create } from 'zustand';
import { BaseTask, DayTask, GeneralTask, Page } from '../types';
import { updateUserData } from '../services/firestoreService';
import { generateTaskId } from '../utils/idGenerator';
import { toast } from 'react-toastify';
import { useAuthStore } from './authStore';
import { useProgressStore } from './progressStore';
import { useScheduleStore } from './scheduleStore';

interface TaskState {
  isModalOpen: boolean;
  editingTask: BaseTask | null;
  showConfirmation: boolean;
  taskToDelete: BaseTask | null;
  setModalOpen: (open: boolean) => void;
  setEditingTask: (task: BaseTask | null) => void;
  setShowConfirmation: (show: boolean) => void;
  setTaskToDelete: (task: BaseTask | null) => void;
  handleSaveTask: (task: BaseTask | Omit<BaseTask, 'id'>) => Promise<void>;
  handleToggleComplete: (taskId: string) => Promise<void>;
  handleDeleteTask: (taskId: string) => void;
  confirmDelete: () => Promise<void>;
  handleEditTask: (taskId: string) => void;
  handleReorderTasks: (reorderedTasks: (DayTask | GeneralTask)[]) => Promise<void>;
  handleClearAllDayTasks: () => Promise<void>;
  handleUpdateHabitForAllTasks: (taskId: string, isHabit: boolean) => Promise<void>;
  recalculateCurrentDayTask: (tasks: DayTask[]) => DayTask[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  isModalOpen: false,
  editingTask: null,
  showConfirmation: false,
  taskToDelete: null,

  setModalOpen: (isModalOpen) => set({ isModalOpen }),
  setEditingTask: (editingTask) => set({ editingTask }),
  setShowConfirmation: (showConfirmation) => set({ showConfirmation }),
  setTaskToDelete: (taskToDelete) => set({ taskToDelete }),

  recalculateCurrentDayTask: (tasks: DayTask[]) => {
    const firstPendingIndex = tasks.findIndex((task) => !task.completed);
    return tasks.map((task, index) => ({
      ...task,
      isCurrent: index === firstPendingIndex,
    }));
  },

  handleSaveTask: async (task) => {
    const { user } = useAuthStore.getState();
    const { userData } = useAuthStore.getState();
    const { currentPage, dayTasks, generalTasks, setDayTasks, setGeneralTasks } = useScheduleStore.getState();
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
        const allTasks = [...dayTasks, ...generalTasks, ...Object.values(userData.weeklyTasks || {}).flat()];
        originalTask = allTasks.find((t) => t.id === (task as BaseTask).id);
        if (originalTask && 'isHabit' in task && originalTask.isHabit !== task.isHabit) {
          isHabitChanged = true;
        }
      }

      if (currentPage === Page.Day) {
        const updatedTasks = isEditing
          ? dayTasks.map((t) => (t.id === (task as BaseTask).id ? { ...t, ...task } : t))
          : (() => {
              const taskName = task.name.trim().toLowerCase();
              const existingTask = dayTasks.find(t => t.name.trim().toLowerCase() === taskName);
              if (existingTask) {
                toast.error(`Ya existe una tarea con el nombre "${task.name}" en el día actual.`);
                throw new Error('Duplicate task name');
              }
              return [
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
            })();
        const recalculatedTasks = get().recalculateCurrentDayTask(updatedTasks as DayTask[]);
        setDayTasks(recalculatedTasks);
        const updatedUserData = {
          ...userData,
          dayTasks: recalculatedTasks,
        };
        await updateUserData(user.uid, updatedUserData);
        useAuthStore.getState().setUserData(updatedUserData);
      } else {
        const updatedTasks = isEditing
          ? generalTasks.map((t) => (t.id === (task as BaseTask).id ? { ...t, ...task } : t))
          : (() => {
              const taskName = task.name.trim().toLowerCase();
              const existingTask = generalTasks.find(t => t.name.trim().toLowerCase() === taskName);
              if (existingTask) {
                toast.error(`Ya existe una tarea con el nombre "${task.name}" en tareas generales.`);
                throw new Error('Duplicate task name');
              }
              return [
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
            })();
        setGeneralTasks(updatedTasks);
        const updatedUserData = { ...userData, generalTasks: updatedTasks };
        await updateUserData(user.uid, updatedUserData);
        useAuthStore.getState().setUserData(updatedUserData);
      }

      // Si se cambió isHabit, actualizar todas las tareas con el mismo nombre
      if (isHabitChanged && isEditing && 'isHabit' in task) {
        await get().handleUpdateHabitForAllTasks((task as BaseTask).id, task.isHabit!);
      }

      set({ isModalOpen: false, editingTask: null });
      const taskName = 'name' in task ? task.name : 'Tarea';
      const action = isEditing ? 'actualizada' : 'añadida';
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
    const { currentPage, dayTasks, generalTasks, setDayTasks, setGeneralTasks } = useScheduleStore.getState();
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
        const task = generalTasks.find((t) => t.id === taskId);
        taskProgressId = task?.progressId || '';
      }

      if (currentPage === Page.Day) {
        const updatedTasks = dayTasks.map((t) => {
          if (t.id === taskId) {
            const wasCompleted = t.completed;
            const newCompleted = !t.completed;

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
        const updatedTasks = generalTasks.map((t) => {
          if (t.id === taskId) {
            const wasCompleted = t.completed;
            const newCompleted = !t.completed;

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
    } catch (error) {
      console.error('Error en handleToggleComplete:', error);
      useAuthStore.getState().setUserData(prevUserData);
      let taskName = 'Tarea';
      if (currentPage === Page.Day) {
        const task = dayTasks.find((t) => t.id === taskId);
        taskName = task?.name || 'Tarea';
      } else {
        const task = generalTasks.find((t) => t.id === taskId);
        taskName = task?.name || 'Tarea';
      }
      toast.error(`Error al actualizar estado de tarea "${taskName}". No se guardó en la base de datos.`);
    }
  },

  handleDeleteTask: (taskId) => {
    const { userData } = useAuthStore.getState();
    const { dayTasks, generalTasks, weeklyTasks } = useScheduleStore.getState();

    const task = [
      ...dayTasks,
      ...generalTasks,
      ...Object.values(weeklyTasks).flat(),
    ].find((t) => t.id === taskId);
    if (task) {
      set({ taskToDelete: task, showConfirmation: true });
    }
  },

  confirmDelete: async () => {
    const { user } = useAuthStore.getState();
    const { userData } = useAuthStore.getState();
    const { taskToDelete } = get();
    const { currentPage, dayTasks, generalTasks, setDayTasks, setGeneralTasks } = useScheduleStore.getState();

    if (!user || !userData || !taskToDelete) return;

    const prevUserData = { ...userData };
    try {
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
        const updatedTasks = generalTasks.filter((t) => t.id !== taskToDelete.id);
        setGeneralTasks(updatedTasks);
        const updatedUserData = { ...userData, generalTasks: updatedTasks };
        await updateUserData(user.uid, updatedUserData);
        useAuthStore.getState().setUserData(updatedUserData);
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
    const { dayTasks, generalTasks, weeklyTasks } = useScheduleStore.getState();

    const task = [
      ...dayTasks,
      ...generalTasks,
      ...Object.values(weeklyTasks).flat(),
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
    const { dayTasks, generalTasks, weeklyTasks, setDayTasks, setGeneralTasks, setWeeklyTasks } = useScheduleStore.getState();

    if (!user || !userData) return;

    // Encontrar la tarea original para obtener su nombre
    const allTasks = [
      ...dayTasks,
      ...generalTasks,
      ...Object.values(weeklyTasks).flat(),
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

      // Actualizar Zustand stores
      setDayTasks(updatedDayTasks);
      setGeneralTasks(updatedGeneralTasks);
      setWeeklyTasks(updatedWeeklyTasks);

      // Actualizar userData y base de datos
      const updatedUserData = {
        ...userData,
        dayTasks: updatedDayTasks,
        generalTasks: updatedGeneralTasks,
        weeklyTasks: updatedWeeklyTasks,
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
}));