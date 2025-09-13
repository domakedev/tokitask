"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Page } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useTaskManagement } from "../hooks/useTaskManagement";
import { useAiSync } from "../hooks/useAiSync";
import BottomNav from "../components/BottomNav";
import DayView from "../components/DayView";
import GeneralView from "../components/GeneralView";
import ProfileView from "../components/ProfileView";
import TaskModal from "../components/AddTaskModal";
import ConfirmationModal from "../components/ConfirmationModal";
import NotificationToast from "../components/NotificationToast";
import FirebaseErrorScreen from "../components/FirebaseErrorScreen";
import ApiErrorScreen from "../components/ApiErrorScreen";
import Icon from "../components/Icon";

export default function HomePage() {
  const router = useRouter();
  const { user, userData, loading, authError, handleSignOut, setUserData } = useAuth();

  // API key validation is handled server-side in the API routes
  // No need to check client-side as the key is server-only

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showNotification = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setNotification({ message, type });
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
  } = useTaskManagement(user, userData, setUserData, showNotification);

  const {
    isSyncing,
    aiTip,
    setAiTip,
    freeTime,
    tempEndOfDay,
    setTempEndOfDay,
    syncWithAI,
    handleUpdateAiDuration,
    handleSetEndOfDay,
    handleStartDay,
  } = useAiSync(userData, handleUpdateUserData, showNotification);

  // Handle redirect to login when user is not authenticated
  useEffect(() => {
    if (!loading && (!user || !userData)) {
      router.push("/login");
    }
  }, [user, userData, loading, router]);

  // AI Loading Messages
  const aiLoadingMessages = [
    "Analizando tus tareas...",
    "Calculando tiempos óptimos...",
    "Buscando consejos personalizados...",
    "Organizando tu día...",
    "Preparando tu horario ideal...",
  ];
  const [aiLoadingIndex, setAiLoadingIndex] = useState(0);

  useEffect(() => {
    if (isSyncing) {
      setAiLoadingIndex(0);
      const interval = setInterval(() => {
        setAiLoadingIndex((prev) =>
          prev < aiLoadingMessages.length - 1 ? prev + 1 : 0
        );
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSyncing, aiLoadingMessages.length]);

  const dayViewComponent = useMemo(() => {
    if (!userData) return null;
    return (
      <DayView
        userData={userData}
        isSyncing={isSyncing}
        aiTip={aiTip}
        freeTime={freeTime}
        onStartDay={handleStartDay}
        onSyncWithAI={syncWithAI}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDeleteTask}
        onReorder={handleReorderTasks}
        onEdit={handleEditTask}
        onUpdateAiDuration={handleUpdateAiDuration}
        onSetEndOfDay={handleSetEndOfDay}
        tempEndOfDay={tempEndOfDay}
        setTempEndOfDay={setTempEndOfDay}
        onDismissAiTip={() => setAiTip(null)}
      />
    );
  }, [userData, isSyncing, aiTip, freeTime, handleStartDay, syncWithAI, handleToggleComplete, handleDeleteTask, handleReorderTasks, handleEditTask, handleUpdateAiDuration, handleSetEndOfDay, tempEndOfDay, setTempEndOfDay, setAiTip]);

  const generalViewComponent = useMemo(() => {
    if (!userData) return null;
    return (
      <GeneralView
        userData={userData}
        onSaveTask={handleSaveTask}
        onDelete={handleDeleteTask}
        onReorder={handleReorderTasks}
        onEdit={handleEditTask}
        onToggleComplete={handleToggleComplete}
        onSetEndOfDay={handleSetEndOfDay}
        tempEndOfDay={tempEndOfDay}
        setTempEndOfDay={setTempEndOfDay}
      />
    );
  }, [userData, handleSaveTask, handleDeleteTask, handleReorderTasks, handleEditTask, handleToggleComplete, handleSetEndOfDay, tempEndOfDay, setTempEndOfDay]);

  const profileViewComponent = useMemo(() => (
    <ProfileView user={user} onSignOut={handleSignOut} />
  ), [user, handleSignOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Icon
          name="loader"
          className="h-12 w-12 animate-spin text-emerald-400 mb-4"
        />
        <p className="text-lg text-white font-semibold">Cargando...</p>
      </div>
    );
  }


  if (authError) {
    return <FirebaseErrorScreen />;
  }

  // Don't render anything while loading or if redirecting
  if (loading || !user || !userData) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {currentPage === Page.Day && dayViewComponent}
      {currentPage === Page.General && generalViewComponent}
      {currentPage === Page.Profile && profileViewComponent}

      {currentPage !== Page.Profile && (
        <div
          className="fixed bottom-24 right-6 flex flex-col items-center z-20"
          style={{ width: 56 }}
        >
          <button
            onClick={() => setModalOpen(true)}
            className="w-full bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75 transition-transform transform hover:scale-110"
          >
            <Icon name="plus" />
          </button>
          <span
            className="w-full mt-2 bg-emerald-600 text-white text-xs font-medium px-0 py-1 rounded shadow"
            style={{ textAlign: "center", opacity: 0.95, display: "block" }}
          >
            Nueva tarea
          </span>
        </div>
      )}

      <BottomNav
        activePage={currentPage}
        onNavigate={setCurrentPage}
        profilePhotoUrl={user?.photoURL || undefined}
      />

      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleSaveTask}
          taskToEdit={editingTask}
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
          onConfirm={handleStartDay}
          title="¿Empezar el día?"
          message="Esto usará la plantilla de 'Horario General' para generar tu horario de hoy con IA. ¿Deseas continuar?"
        />
      )}

      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onDismiss={() => setNotification(null)}
        />
      )}

      {isSyncing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <Icon
            name="loader"
            className="h-16 w-16 animate-spin text-emerald-400 mb-6"
          />
          <p className="text-sm text-slate-300 mt-6 text-center">
            Esto puede tardar unos segundos.
          </p>
          <div className="relative h-8 w-full flex items-center justify-center overflow-hidden mt-2">
            <span
              key={aiLoadingIndex}
              className="absolute w-full text-lg text-white font-semibold transition-all duration-500 ease-in-out animate-slide-up text-center"
              style={{
                animation: "slideUp 0.5s",
              }}
            >
              {aiLoadingMessages[aiLoadingIndex]}
            </span>
          </div>
          <style jsx global>{`
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
