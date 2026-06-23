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

  // Set current page
  useEffect(() => {
    setCurrentPage(Page.Day);
  }, [setCurrentPage]);

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
    getAiAdvice,
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

  // Función para pedir consejo a la IA
  const handleGetAiAdvice = useCallback(async () => {
    if (!userData?.dayTasks) return;
    const advice = await getAiAdvice(userData.dayTasks);
    if (advice) {
      setAiTip({ message: advice, type: 'tip' });
      showNotification("Consejo recibido de la IA.", "success");
    }
  }, [userData?.dayTasks, getAiAdvice, setAiTip, showNotification]);

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
        onGetAiAdvice={handleGetAiAdvice}
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
        onRequestClearDay={() => setShowClearConfirmation(true)}
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
    handleGetAiAdvice,
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
    <div className="max-w-2xl lg:max-w-5xl mx-auto pb-28">
      {dayViewComponent}

      {/* FAB anclado al borde derecho de la columna de contenido (no del viewport) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 md:bottom-24 z-20">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 md:px-6 flex justify-end">
          <div
            className="pointer-events-auto flex flex-col items-center"
            style={{ width: "56px" }}
          >
            <button
              onClick={() => setModalOpen(true)}
              className="w-12 h-12 md:w-14 md:h-14 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors duration-150 ease-in-out flex items-center justify-center"
              aria-label="Crear nueva tarea"
            >
              <Icon name="plus" className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <span
              className="w-full mt-1 md:mt-2 bg-emerald-500 text-white text-[10px] sm:text-xs font-medium px-1 py-0.5 rounded-full sm:px-2 sm:py-1 shadow text-center"
              style={{ opacity: 0.95, display: "block", lineHeight: "1" }}
            >
              Nueva
            </span>
          </div>
        </div>
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
