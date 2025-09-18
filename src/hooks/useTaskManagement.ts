import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { DayTask, GeneralTask, UserData, BaseTask, Page } from "../types";
import { updateUserData } from "../services/firestoreService";
import { generateTaskId } from "../utils/idGenerator";
import { toast } from "react-toastify";
import { useScheduleStore } from "../stores/scheduleStore";
import { useProgressStore } from "../stores/progressStore";
import { useTaskStore } from "../stores/taskStore";

export const useTaskManagement = (
  user: User | null,
  userData: UserData | null,
  setUserData: (data: UserData | null) => void,
) => {
  const { currentPage, setCurrentPage } = useScheduleStore();
  const { isModalOpen, setModalOpen, editingTask, setEditingTask, showConfirmation, setShowConfirmation, taskToDelete, setTaskToDelete, handleSaveTask, handleToggleComplete, handleDeleteTask, confirmDelete, handleEditTask, handleReorderTasks, handleClearAllDayTasks } = useTaskStore();

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
          toast.error(
            "Error al actualizar los datos. No se guardó en la base de datos."
          );
          throw new Error("Error updating user data");
        }
      }
    },
    [user, userData, setUserData]
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
    handleClearAllDayTasks,
  };
};
