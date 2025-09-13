import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { DayTask, GeneralTask, UserData, BaseTask, Page } from "../types";
import { updateUserData } from "../services/firestoreService";

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
                    id: Date.now(),
                    completed: false,
                    isCurrent: false,
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
                    id: Date.now(),
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
        showNotification(
          "id" in task ? "Tarea actualizada." : "Tarea añadida correctamente.",
          "success"
        );
      } catch (error) {
        console.error("Error en handleSaveTask:", error);
        setUserData(prevUserData);
        showNotification(
          "Error al guardar la tarea. No se guardó en la base de datos.",
          "error"
        );
      }
    },
    [userData, currentPage, setUserData, recalculateCurrentDayTask, handleUpdateUserData, showNotification]
  );

  const handleToggleComplete = useCallback(
    async (taskId: number) => {
      if (!userData) return;
      const prevUserData = { ...userData };
      try {
        if (currentPage === Page.Day) {
          const updatedTasks = userData.dayTasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          );
          const updatedUserData = {
            ...userData,
            dayTasks: recalculateCurrentDayTask(updatedTasks),
          };
          setUserData(updatedUserData);
          await handleUpdateUserData(updatedUserData);
          showNotification("Estado de la tarea actualizado.", "success");
        } else {
          const updatedTasks = userData.generalTasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          );
          const updatedUserData = { ...userData, generalTasks: updatedTasks };
          setUserData(updatedUserData);
          await handleUpdateUserData(updatedUserData);
          showNotification("Estado de la tarea actualizado.", "success");
        }
      } catch (error) {
        console.error("Error en handleToggleComplete:", error);
        setUserData(prevUserData);
        showNotification(
          "Error al actualizar el estado de la tarea. No se guardó en la base de datos.",
          "error"
        );
      }
    },
    [userData, currentPage, setUserData, recalculateCurrentDayTask, handleUpdateUserData, showNotification]
  );

  const handleDeleteTask = useCallback((taskId: number) => {
    const task = [
      ...(userData?.dayTasks || []),
      ...(userData?.generalTasks || []),
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
          showNotification("Tarea eliminada.", "success");
        } else {
          const updatedTasks = userData.generalTasks.filter(
            (t) => t.id !== taskToDelete.id
          );
          const updatedUserData = { ...userData, generalTasks: updatedTasks };
          setUserData(updatedUserData);
          await handleUpdateUserData(updatedUserData);
          setShowConfirmation(false);
          setTaskToDelete(null);
          showNotification("Tarea eliminada.", "success");
        }
      } catch (error) {
        console.error("Error en confirmDelete:", error);
        setUserData(prevUserData);
        setShowConfirmation(false);
        setTaskToDelete(null);
        showNotification(
          "Error al eliminar la tarea. No se guardó en la base de datos.",
          "error"
        );
      }
    },
    [userData, taskToDelete, currentPage, setUserData, recalculateCurrentDayTask, handleUpdateUserData, showNotification]
  );

  const handleEditTask = useCallback((taskId: number) => {
    const task = [
      ...(userData?.dayTasks || []),
      ...(userData?.generalTasks || []),
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
  };
};