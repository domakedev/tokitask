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
  const { isModalOpen, setModalOpen, editingTask, setEditingTask, showConfirmation, setShowConfirmation, taskToDelete, setTaskToDelete, handleSaveTask, handleToggleComplete, handleDeleteTask, confirmDelete, handleEditTask, handleReorderTasks, handleClearAllDayTasks, handleUpdateHabitForAllTasks } = useTaskStore();

  const { setDayTasks, setGeneralTasks, setWeeklyTasks, setEndOfDay } = useScheduleStore();

  const handleUpdateUserData = useCallback(
    async (newUserData: Partial<UserData>) => {
      if (user && userData) {
        const prevUserData = { ...userData };
        const updatedData = { ...userData, ...newUserData } as UserData;
        setUserData(updatedData);

        // Sincronizar con useScheduleStore
        if (newUserData.dayTasks !== undefined) {
          setDayTasks(newUserData.dayTasks);
        }
        if (newUserData.generalTasks !== undefined) {
          setGeneralTasks(newUserData.generalTasks);
        }
        if (newUserData.weeklyTasks !== undefined) {
          setWeeklyTasks(newUserData.weeklyTasks);
        }
        if (newUserData.endOfDay !== undefined) {
          setEndOfDay(newUserData.endOfDay);
        }

        try {
          await updateUserData(user.uid, updatedData);
        } catch {
          setUserData(prevUserData);
          // Revertir cambios en useScheduleStore también
          if (newUserData.dayTasks !== undefined) {
            setDayTasks(prevUserData.dayTasks);
          }
          if (newUserData.generalTasks !== undefined) {
            setGeneralTasks(prevUserData.generalTasks);
          }
          if (newUserData.weeklyTasks !== undefined) {
            setWeeklyTasks(prevUserData.weeklyTasks);
          }
          if (newUserData.endOfDay !== undefined) {
            setEndOfDay(prevUserData.endOfDay);
          }
          toast.error(
            "Error al actualizar los datos. No se guardó en la base de datos."
          );
          throw new Error("Error updating user data");
        }
      }
    },
    [user, userData, setUserData, setDayTasks, setGeneralTasks, setWeeklyTasks, setEndOfDay]
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
    handleUpdateHabitForAllTasks,
  };
};
