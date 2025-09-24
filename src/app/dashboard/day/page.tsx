"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Page,
  WeekDay,
  BaseTask,
  GeneralTask,
  WEEKDAY_LABELS,
} from "../../../types";
import { useAuthStore } from "../../../stores/authStore";
import LoadingScreen from "../../../components/LoadingScreen";
import { useTaskManagement } from "../../../hooks/useTaskManagement";
import { useAiSync } from "../../../hooks/useAiSync";
import { toast } from "react-toastify";
import DayView from "../../../components/DayView";
import TaskModal from "../../../components/AddTaskModal";
import ConfirmationModal from "../../../components/ConfirmationModal";
import FirebaseErrorScreen from "../../../components/FirebaseErrorScreen";
import OnboardingModal from "../../../components/OnboardingModal";
import AiSyncOverlay from "../../../components/AiSyncOverlay";
import Icon from "../../../components/Icon";
import { generateTaskId } from "../../../utils/idGenerator";

export default function DayPage() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const userData = useAuthStore(state => state.userData);
  const setUserData = useAuthStore(state => state.setUserData);

  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  const showNotification = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      if (type === "success") {
        toast.success(message);
      } else {
        toast.error(message);
      }
    },
    []
  );

  const {
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
  } = useTaskManagement(user, userData, setUserData);

  // Función para navegar al calendario de General
  const handleNavigateToGeneralCalendar = useCallback(() => {
    router.push("/dashboard/general?mode=calendar");
  }, [router]);

  const {
    isSyncing,
    aiTip,
    setAiTip,
    freeTime,
    tempEndOfDay,
    setTempEndOfDay,
    syncWithAI,
    syncWithPseudoAI,
    handleUpdateAiDuration,
    handleCloneDaySchedule,
  } = useAiSync(userData, handleUpdateUserData, showNotification);

  // Función para mostrar el modal de confirmación antes de clonar
  const handleShowCloneConfirmation = useCallback(() => {
    setShowConfirmation(true);
  }, [setShowConfirmation]);

  // Función para confirmar y clonar, cerrando el modal
  const handleConfirmClone = useCallback(async () => {
    await handleCloneDaySchedule();
    setShowConfirmation(false);
  }, [handleCloneDaySchedule, setShowConfirmation]);

  const dayViewComponent = useMemo(() => {
    if (!userData) {
      return <LoadingScreen message="Cargando datos..." />;
    }
    return (
      <DayView
        userData={userData}
        isSyncing={isSyncing}
        aiTip={aiTip}
        freeTime={freeTime}
        onStartDay={handleShowCloneConfirmation}
        onSyncWithAI={syncWithAI}
        onSyncWithPseudoAI={syncWithPseudoAI}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDeleteTask}
        onReorder={handleReorderTasks}
        onEdit={handleEditTask}
        onUpdateAiDuration={handleUpdateAiDuration}
        tempEndOfDay={tempEndOfDay}
        setTempEndOfDay={setTempEndOfDay}
        onDismissAiTip={() => setAiTip(null)}
        onNavigate={setCurrentPage}
        onNavigateToGeneralCalendar={handleNavigateToGeneralCalendar}
      />
    );
  }, [
    userData,
    isSyncing,
    aiTip,
    freeTime,
    handleShowCloneConfirmation,
    syncWithAI,
    syncWithPseudoAI,
    handleToggleComplete,
    handleDeleteTask,
    handleReorderTasks,
    handleEditTask,
    handleUpdateAiDuration,
    tempEndOfDay,
    setTempEndOfDay,
    setAiTip,
    setCurrentPage,
    handleNavigateToGeneralCalendar,
  ]);

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {dayViewComponent}

      <div
        className="fixed bottom-20 md:bottom-24 right-4 md:right-6 flex flex-col items-center z-20"
        style={{ width: "56px" }}
      >
        {(userData?.dayTasks?.length ?? 0) > 0 && (
          <>
            <button
              onClick={() => setShowClearConfirmation(true)}
              className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors duration-150 ease-in-out mb-1 md:mb-2 flex items-center justify-center"
            >
              <Icon
                name="trash2"
                className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6"
              />
            </button>
            <span
              className="w-full mb-2 md:mb-4 bg-red-500 text-white sm:text-xs font-medium px-1 py-0.5 sm:px-2 sm:py-1 rounded-full shadow  text-[10px] text-center"
              style={{ opacity: 0.95, display: "block", lineHeight: "1" }}
            >
              Limpiar
            </span>
          </>
        )}
        <button
          onClick={() => setModalOpen(true)}
          className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors duration-150 ease-in-out flex items-center justify-center"
        >
          <Icon name="plus" className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
        </button>
        <span
          className="w-full mt-1 md:mt-2 bg-emerald-500 text-white text-[10px] sm:text-xs font-medium px-1 py-0.5 rounded-full sm:px-2 sm:py-1 shadow text-center"
          style={{ opacity: 0.95, display: "block", lineHeight: "1" }}
        >
          Nueva
        </span>
      </div>

      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={(task) => handleSaveTask(task)}
          taskToEdit={editingTask}
          showDaySelection={false}
          currentDay={undefined}
          initialScheduledDate={undefined}
          showScheduledDateField={false}
          currentView="day"
        />
      )}

      {showConfirmation && taskToDelete && (
        <ConfirmationModal
          isOpen={showConfirmation}
          onCancel={() => setShowConfirmation(false)}
          onConfirm={confirmDelete}
          title="Confirmar Eliminación"
          message="¿Estás seguro de que quieres eliminar esta tarea?"
        />
      )}

      {showConfirmation && !taskToDelete && (
        <ConfirmationModal
          isOpen={showConfirmation}
          onCancel={() => setShowConfirmation(false)}
          onConfirm={handleConfirmClone}
          title="¿Clonar horario del día?"
          message="Esto clonará todas tus tareas para hoy: repetitivas según el día de la semana y específicas por día en el calendario."
        />
      )}

      {showClearConfirmation && (
        <ConfirmationModal
          isOpen={showClearConfirmation}
          onCancel={() => setShowClearConfirmation(false)}
          onConfirm={() => {
            handleClearAllDayTasks();
            setShowClearConfirmation(false);
          }}
          title="¿Limpiar todas las tareas del día?"
          message="Esto eliminará permanentemente todas las tareas del día actual. ¿Estás seguro?"
        />
      )}

      <OnboardingModal
        isOpen={!userData?.onboardingCompleted}
        onClose={() => {}}
        onComplete={async () => {
          const updatedUserData = { ...userData, onboardingCompleted: true };
          await handleUpdateUserData(updatedUserData);
        }}
      />

      <AiSyncOverlay
        isVisible={isSyncing}
        showLoader={true}
        loaderText="Esto puede tardar hasta un minuto."
        showJarvis={true}
      />
    </div>
  );
}
