import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { DayTask, GeneralTask, UserData, BaseTask, Page } from "../types";
import { updateUserData } from "../services/firestoreService";
import { generateTaskId } from "../utils/idGenerator";

export const useTaskManagement = (
  user: User | null,
  userData: UserData | null,
  setUserData: (data: UserData | null) => void,
  showNotification: (message: string, type?: "success" | "error") => void
) => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Day);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<BaseTask | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<BaseTask | null>(null);

  const handleUpdateUserData = useCallback(
    async (newUserData: Partial<UserData>) => {
      if (user && userData) {
        const prevUserData = { ...userData };
        const updatedData = { ...userData, ...newUserData } as UserData;
        setUserData(updatedData);
        try {
          await updateUserData(user.uid, updatedData);
        } catch {
          setUserData(prevUserData);
          showNotification(
            "Error al actualizar los datos. No se guardó en la base de datos.",
            "error"
          );
          throw new Error("Error updating user data");
        }
      }
    },
    [user, userData, setUserData, showNotification]
  );

  const recalculateCurrentDayTask = useCallback((tasks: DayTask[]): DayTask[] => {
    const firstPendingIndex = tasks.findIndex((task) => !task.completed);
    return tasks.map((task, index) => ({
      ...task,
      isCurrent: index === firstPendingIndex,
    }));
  }, []);

  const handleSaveTask = useCallback(
    async (task: BaseTask | Omit<BaseTask, "id">) => {
      if (!userData) return;
      let updatedUserData: UserData;
      const prevUserData = { ...userData };
      try {
        if (currentPage === Page.Day) {
          const updatedTasks =
            "id" in task
              ? userData.dayTasks.map((t) =>
                  t.id === (task as BaseTask).id ? { ...t, ...task } : t
                )
              : [
                  ...userData.dayTasks,
                  {
                    ...task,
                    id: generateTaskId(),
                    progressId: generateTaskId(), // Nuevo progressId único
                    completed: false,
                    isCurrent: false,
                    aiDuration: "",
                  } as DayTask,
                ];
          updatedUserData = {
            ...userData,
            dayTasks: recalculateCurrentDayTask(updatedTasks as DayTask[]),
          };
          setUserData(updatedUserData);
        } else {
          const updatedTasks =
            "id" in task
              ? userData.generalTasks.map((t) =>
                  t.id === (task as BaseTask).id ? { ...t, ...task } : t
                )
              : [
                  ...userData.generalTasks,
                  {
                    ...task,
                    id: generateTaskId(),
                    progressId: generateTaskId(), // Nuevo progressId único
                    completed: false,
                    baseDuration: task.baseDuration || "",
                  } as GeneralTask,
                ];
          updatedUserData = { ...userData, generalTasks: updatedTasks };
          setUserData(updatedUserData);
        }
        await handleUpdateUserData(updatedUserData);
        setModalOpen(false);
        setEditingTask(null);
        const taskName = "name" in task ? task.name : "Tarea";
        const action = "id" in task ? "actualizada" : "añadida";
        showNotification(`Se ${action} tarea "${taskName}" en la DB.`, "success");
      } catch (error) {
        console.error("Error en handleSaveTask:", error);
        setUserData(prevUserData);
        const taskName = "name" in task ? task.name : "Tarea";
        showNotification(
          `Error al guardar tarea "${taskName}". No se guardó en la base de datos.`,
          "error"
        );
      }
    },
    [userData, currentPage, setUserData, recalculateCurrentDayTask, handleUpdateUserData, showNotification]
  );

  const handleToggleComplete = useCallback(
    async (taskId: string) => {
      if (!userData) return;
      const prevUserData = { ...userData };
      try {
        const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const taskCompletionsByProgressId = userData.taskCompletionsByProgressId || {};

        // Find the task to get its progressId
        let taskProgressId = "";
        if (currentPage === Page.Day) {
          const task = userData.dayTasks.find(t => t.id === taskId);
          taskProgressId = task?.progressId || "";
        } else {
          const task = userData.generalTasks.find(t => t.id === taskId);
          taskProgressId = task?.progressId || "";
        }

        if (currentPage === Page.Day) {
          const updatedTasks = userData.dayTasks.map((t) => {
            if (t.id === taskId) {
              const wasCompleted = t.completed;
              const newCompleted = !t.completed;

              // Update completion history by progressId (persistent)
              if (newCompleted && !wasCompleted) {
                if (taskProgressId) {
                  const currentCompletions = taskCompletionsByProgressId[taskProgressId] || [];
                  // Only add if this date doesn't already exist
                  if (!currentCompletions.includes(now)) {
                    taskCompletionsByProgressId[taskProgressId] = [...currentCompletions, now];
                  }
                }
              } else if (!newCompleted && wasCompleted) {
                // Remove from progressId-based completions
                if (taskProgressId) {
                  const progressIdCompletions = taskCompletionsByProgressId[taskProgressId] || [];
                  const todayIndex = progressIdCompletions.indexOf(now);
                  if (todayIndex !== -1) {
                    progressIdCompletions.splice(todayIndex, 1);
                    taskCompletionsByProgressId[taskProgressId] = progressIdCompletions;
                  }
                }
              }

              return { ...t, completed: newCompleted };
            }
            return t;
          });
          const updatedUserData = {
            ...userData,
            dayTasks: recalculateCurrentDayTask(updatedTasks),
            taskCompletionsByProgressId,
          };
          setUserData(updatedUserData);
          await handleUpdateUserData(updatedUserData);
          const task = userData.dayTasks.find(t => t.id === taskId);
          const taskName = task?.name || "Tarea";
          showNotification(`Se actualizó estado de tarea "${taskName}" en la DB.`, "success");
        } else {
          const updatedTasks = userData.generalTasks.map((t) => {
            if (t.id === taskId) {
              const wasCompleted = t.completed;
              const newCompleted = !t.completed;

              // Update completion history by progressId (persistent)
              if (newCompleted && !wasCompleted) {
                if (taskProgressId) {
                  const currentCompletions = taskCompletionsByProgressId[taskProgressId] || [];
                  // Only add if this date doesn't already exist
                  if (!currentCompletions.includes(now)) {
                    taskCompletionsByProgressId[taskProgressId] = [...currentCompletions, now];
                  }
                }
              } else if (!newCompleted && wasCompleted) {
                // Remove from progressId-based completions
                if (taskProgressId) {
                  const progressIdCompletions = taskCompletionsByProgressId[taskProgressId] || [];
                  const todayIndex = progressIdCompletions.indexOf(now);
                  if (todayIndex !== -1) {
                    progressIdCompletions.splice(todayIndex, 1);
                    taskCompletionsByProgressId[taskProgressId] = progressIdCompletions;
                  }
                }
              }

              return { ...t, completed: newCompleted };
            }
            return t;
          });
          const updatedUserData = {
            ...userData,
            generalTasks: updatedTasks,
            taskCompletionsByProgressId,
          };
          setUserData(updatedUserData);
          await handleUpdateUserData(updatedUserData);
          const task = userData.generalTasks.find(t => t.id === taskId);
          const taskName = task?.name || "Tarea";
          showNotification(`Se actualizó estado de tarea "${taskName}" en la DB.`, "success");
        }
      } catch (error) {
        console.error("Error en handleToggleComplete:", error);
        setUserData(prevUserData);
        let taskName = "Tarea";
        if (currentPage === Page.Day) {
          const task = userData.dayTasks.find(t => t.id === taskId);
          taskName = task?.name || "Tarea";
        } else {
          const task = userData.generalTasks.find(t => t.id === taskId);
          taskName = task?.name || "Tarea";
        }
        showNotification(
          `Error al actualizar estado de tarea "${taskName}". No se guardó en la base de datos.`,
          "error"
        );
      }
    },
    [userData, currentPage, setUserData, recalculateCurrentDayTask, handleUpdateUserData, showNotification]
  );

  const handleDeleteTask = useCallback((taskId: string) => {
    const task = [
      ...(userData?.dayTasks || []),
      ...(userData?.generalTasks || []),
      // También buscar en weeklyTasks
      ...Object.values(userData?.weeklyTasks || {}).flat(),
    ].find((t) => t.id === taskId);
    if (task) {
      setTaskToDelete(task);
      setShowConfirmation(true);
    }
  }, [userData]);

  const confirmDelete = useCallback(
    async () => {
      if (!userData || !taskToDelete) return;
      const prevUserData = { ...userData };
      try {
        if (currentPage === Page.Day) {
          const updatedTasks = userData.dayTasks.filter(
            (t) => t.id !== taskToDelete.id
          );
          const updatedUserData = {
            ...userData,
            dayTasks: recalculateCurrentDayTask(updatedTasks),
          };
          setUserData(updatedUserData);
          await handleUpdateUserData(updatedUserData);
          setShowConfirmation(false);
          setTaskToDelete(null);
          const taskName = taskToDelete.name || "Tarea";
          showNotification(`Se eliminó tarea "${taskName}" de la DB.`, "success");
        } else {
          const updatedTasks = userData.generalTasks.filter(
            (t) => t.id !== taskToDelete.id
          );
          const updatedUserData = { ...userData, generalTasks: updatedTasks };
          setUserData(updatedUserData);
          await handleUpdateUserData(updatedUserData);
          setShowConfirmation(false);
          setTaskToDelete(null);
          const taskName = taskToDelete.name || "Tarea";
          showNotification(`Se eliminó tarea "${taskName}" de la DB.`, "success");
        }
      } catch (error) {
        console.error("Error en confirmDelete:", error);
        setUserData(prevUserData);
        setShowConfirmation(false);
        setTaskToDelete(null);
        const taskName = taskToDelete.name || "Tarea";
        showNotification(
          `Error al eliminar tarea "${taskName}". No se guardó en la base de datos.`,
          "error"
        );
      }
    },
    [userData, taskToDelete, currentPage, setUserData, recalculateCurrentDayTask, handleUpdateUserData, showNotification]
  );

  const handleEditTask = useCallback((taskId: string) => {
    const task = [
      ...(userData?.dayTasks || []),
      ...(userData?.generalTasks || []),
      // También buscar en weeklyTasks
      ...Object.values(userData?.weeklyTasks || {}).flat(),
    ].find((t) => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setModalOpen(true);
    }
  }, [userData]);

  const handleReorderTasks = useCallback(
    async (reorderedTasks: (DayTask | GeneralTask)[]) => {
      if (!userData) return;
      const prevUserData = { ...userData };
      try {
        let updatedUserData: UserData;
        if (currentPage === Page.Day) {
          updatedUserData = {
            ...userData,
            dayTasks: recalculateCurrentDayTask(reorderedTasks as DayTask[]),
          };
        } else {
          updatedUserData = {
            ...userData,
            generalTasks: reorderedTasks as GeneralTask[],
          };
        }
        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
      } catch (error) {
        console.error("Error en handleReorderTasks:", error);
        setUserData(prevUserData);
        showNotification(
          "Error al reordenar las tareas. No se guardó en la base de datos.",
          "error"
        );
      }
    },
    [userData, currentPage, setUserData, recalculateCurrentDayTask, handleUpdateUserData, showNotification]
  );

  const handleClearAllDayTasks = useCallback(
    async () => {
      if (!userData || currentPage !== Page.Day) return;
      const prevUserData = { ...userData };
      try {
        const updatedUserData = {
          ...userData,
          dayTasks: [],
        };
        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
        showNotification("Todas las tareas del día han sido eliminadas.", "success");
      } catch (error) {
        console.error("Error en handleClearAllDayTasks:", error);
        setUserData(prevUserData);
        showNotification(
          "Error al eliminar las tareas. No se guardó en la base de datos.",
          "error"
        );
      }
    },
    [userData, currentPage, setUserData, handleUpdateUserData, showNotification]
  );

  return {
    currentPage,
    setCurrentPage,
    isModalOpen,
    setModalOpen,
    editingTask,
    setEditingTask,
    showConfirmation,
    setShowConfirmation,
    taskToDelete,
    setTaskToDelete,
    handleSaveTask,
    handleToggleComplete,
    handleDeleteTask,
    confirmDelete,
    handleEditTask,
    handleReorderTasks,
    handleUpdateUserData,
    recalculateCurrentDayTask,
    handleClearAllDayTasks,
  };
};