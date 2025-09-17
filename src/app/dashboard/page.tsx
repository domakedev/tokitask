"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Page, WeekDay, BaseTask, GeneralTask } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useTaskManagement } from "../../hooks/useTaskManagement";
import { useAiSync } from "../../hooks/useAiSync";
import { toast } from "react-toastify";
import BottomNav from "../../components/BottomNav";
import DayView from "../../components/DayView";
import GeneralView from "../../components/GeneralView";
import ProfileView from "../../components/ProfileView";
import ProgressView from "../../components/ProgressView";
import TaskModal from "../../components/AddTaskModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import FirebaseErrorScreen from "../../components/FirebaseErrorScreen";
import OnboardingModal from "../../components/OnboardingModal";
import Icon from "../../components/Icon";
import { generateTaskId } from "../../utils/idGenerator";

export default function DashboardPage() {
  const router = useRouter();
  const { user, userData, loading, authError, handleSignOut, setUserData } =
    useAuth();

  // Estado para trackear la pestaña activa en General
  const [activeGeneralTab, setActiveGeneralTab] = useState<WeekDay>(
    WeekDay.All
  );

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
  } = useTaskManagement(user, userData, setUserData, showNotification);

  // Función para manejar cambios de pestaña en General
  const handleGeneralTabChange = useCallback((tab: WeekDay) => {
    setActiveGeneralTab(tab);
  }, []);

  // Funciones específicas para manejar tareas de weeklyTasks
  const handleEditWeeklyTask = useCallback(
    (taskId: string) => {
      if (!userData?.weeklyTasks?.[activeGeneralTab]) return;

      const task = userData.weeklyTasks[activeGeneralTab].find(
        (t) => t.id === taskId
      );
      if (task) {
        setEditingTask(task);
        setModalOpen(true);
      }
    },
    [userData, activeGeneralTab, setEditingTask, setModalOpen]
  );

  const handleDeleteWeeklyTask = useCallback(
    async (taskId: string) => {
      if (!userData) return;

      // Asegurar que weeklyTasks esté inicializado
      const currentWeeklyTasks = userData.weeklyTasks || {
        all: [],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      const currentDayTasks = currentWeeklyTasks[activeGeneralTab] || [];
      const task = currentDayTasks.find((t) => t.id === taskId);

      if (task) {
        setTaskToDelete(task);
        setShowConfirmation(true);
      }
    },
    [userData, activeGeneralTab, setTaskToDelete, setShowConfirmation]
  );

  // Función específica para confirmar eliminación de tareas semanales
  const confirmDeleteWeekly = useCallback(async () => {
    if (!userData || !taskToDelete) return;

    const prevUserData = { ...userData };
    try {
      // Asegurar que weeklyTasks esté inicializado
      const currentWeeklyTasks = userData.weeklyTasks || {
        all: [],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      // Filtrar la tarea específica del día activo
      const currentDayTasks = currentWeeklyTasks[activeGeneralTab] || [];
      const updatedTasks = currentDayTasks.filter(
        (t) => t.id !== taskToDelete.id
      );

      const updatedWeeklyTasks = {
        ...currentWeeklyTasks,
        [activeGeneralTab]: updatedTasks,
      };

      const updatedUserData = {
        ...userData,
        weeklyTasks: updatedWeeklyTasks,
      };

      setUserData(updatedUserData);
      await handleUpdateUserData(updatedUserData);
      setShowConfirmation(false);
      setTaskToDelete(null);
      const taskName = taskToDelete.name || "Tarea";
      toast.success(`Se eliminó tarea "${taskName}" de la DB.`);
    } catch (error) {
      console.error("Error en confirmDeleteWeekly:", error);
      setUserData(prevUserData);
      setShowConfirmation(false);
      setTaskToDelete(null);
      const taskName = taskToDelete.name || "Tarea";
      toast.error(
        `Error al eliminar tarea "${taskName}". No se guardó en la base de datos.`
      );
    }
  }, [
    userData,
    taskToDelete,
    activeGeneralTab,
    setUserData,
    handleUpdateUserData,
    showNotification,
    setShowConfirmation,
    setTaskToDelete,
  ]);

  const handleToggleWeeklyTask = useCallback(
    async (taskId: string) => {
      if (!userData) return;

      const prevUserData = { ...userData };
      try {
        const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        const taskCompletionsByProgressId =
          userData.taskCompletionsByProgressId || {};

        // Asegurar que weeklyTasks esté inicializado
        const currentWeeklyTasks = userData.weeklyTasks || {
          all: [],
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        };

        const currentDayTasks = currentWeeklyTasks[activeGeneralTab] || [];
        const task = currentDayTasks.find((t) => t.id === taskId);
        const taskProgressId = task?.progressId || "";

        const updatedTasks = currentDayTasks.map((t) => {
          if (t.id === taskId) {
            const wasCompleted = t.completed;
            const newCompleted = !t.completed;

            // Update completion history by progressId (persistent)
            if (newCompleted && !wasCompleted) {
              if (taskProgressId) {
                const currentCompletions =
                  taskCompletionsByProgressId[taskProgressId] || [];
                // Only add if this date doesn't already exist
                if (!currentCompletions.includes(now)) {
                  taskCompletionsByProgressId[taskProgressId] = [
                    ...currentCompletions,
                    now,
                  ];
                }
              }
            } else if (!newCompleted && wasCompleted) {
              // Remove from progressId-based completions
              if (taskProgressId) {
                const progressIdCompletions =
                  taskCompletionsByProgressId[taskProgressId] || [];
                const todayIndex = progressIdCompletions.indexOf(now);
                if (todayIndex !== -1) {
                  progressIdCompletions.splice(todayIndex, 1);
                  taskCompletionsByProgressId[taskProgressId] =
                    progressIdCompletions;
                }
              }
            }

            return { ...t, completed: newCompleted };
          }
          return t;
        });

        const updatedWeeklyTasks = {
          ...currentWeeklyTasks,
          [activeGeneralTab]: updatedTasks,
        };

        const updatedUserData = {
          ...userData,
          weeklyTasks: updatedWeeklyTasks,
          taskCompletionsByProgressId,
        };

        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
        const foundTask = currentDayTasks.find((t) => t.id === taskId);
        const taskName = foundTask?.name || "Tarea";
        toast.success(
          `Se actualizó estado de tarea "${taskName}" en la base de datos.`
        );
      } catch (error) {
        console.error("Error toggling weekly task:", error);
        setUserData(prevUserData);
        const currentWeeklyTasks = userData.weeklyTasks || {
          all: [],
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        };
        const currentDayTasks = currentWeeklyTasks[activeGeneralTab] || [];
        const foundTask = currentDayTasks.find((t) => t.id === taskId);
        const taskName = foundTask?.name || "Tarea";
        toast.error(`Error al actualizar estado de tarea "${taskName}".`);
      }
    },
    [
      userData,
      activeGeneralTab,
      setUserData,
      handleUpdateUserData,
      showNotification,
    ]
  );

  const handleReorderWeeklyTasks = useCallback(
    async (reorderedTasks: GeneralTask[]) => {
      if (!userData) return;

      const prevUserData = { ...userData };
      try {
        // Asegurar que weeklyTasks esté inicializado
        const currentWeeklyTasks = userData.weeklyTasks || {
          all: [],
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        };

        const updatedWeeklyTasks = {
          ...currentWeeklyTasks,
          [activeGeneralTab]: reorderedTasks,
        };

        const updatedUserData = {
          ...userData,
          weeklyTasks: updatedWeeklyTasks,
        };

        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
      } catch (error) {
        console.error("Error reordering weekly tasks:", error);
        setUserData(prevUserData);
        toast.error("Error al reordenar las tareas.");
      }
    },
    [
      userData,
      activeGeneralTab,
      setUserData,
      handleUpdateUserData,
      showNotification,
    ]
  );

  // Función para guardar tareas contextual según la pestaña activa
  const handleSaveTaskContextual = useCallback(
    async (task: BaseTask | Omit<BaseTask, "id">) => {
      if (currentPage === Page.General) {
        if (activeGeneralTab === WeekDay.All) {
          // Guardar en generalTasks
          await handleSaveTask(task);
        } else {
          // Guardar en weeklyTasks para el día específico
          if (!userData) return;

          const isEditing = "id" in task;
          const prevUserData = { ...userData };

          try {
            // Asegurar que weeklyTasks esté inicializado
            const currentWeeklyTasks = userData.weeklyTasks || {
              all: [],
              monday: [],
              tuesday: [],
              wednesday: [],
              thursday: [],
              friday: [],
              saturday: [],
              sunday: [],
            };

            const currentTasks = currentWeeklyTasks[activeGeneralTab] || [];
            let updatedTasks: GeneralTask[];

            if (isEditing) {
              // Editar tarea existente - filtrar y reemplazar para evitar duplicados
              const filteredTasks = currentTasks.filter(
                (t) => t.id !== task.id
              );
              const existingTask = currentTasks.find((t) => t.id === task.id);
              updatedTasks = [
                ...filteredTasks,
                {
                  ...task,
                  completed: existingTask?.completed ?? false,
                } as GeneralTask,
              ];
            } else {
              // Crear nueva tarea - agregar al final con ID único
              const newTask = {
                ...task,
                id: generateTaskId(),
                progressId: generateTaskId(), // Nuevo progressId único
                completed: false,
              } as GeneralTask;
              updatedTasks = [...currentTasks, newTask];
            }

            const updatedWeeklyTasks = {
              ...currentWeeklyTasks,
              [activeGeneralTab]: updatedTasks,
            };

            const updatedUserData = {
              ...userData,
              weeklyTasks: updatedWeeklyTasks,
            };

            setUserData(updatedUserData);
            await handleUpdateUserData(updatedUserData);
            const taskName = "name" in task ? task.name : "Tarea";
            const action = isEditing ? "actualizó" : "añadió";
            toast.success(
              `Se ${action} tarea "${taskName}" en la base de datos.`
            );
            setModalOpen(false);
            setEditingTask(null);
          } catch (error) {
            console.error("Error saving task for day:", error);
            setUserData(prevUserData);
            const taskName = "name" in task ? task.name : "Tarea";
            toast.error(
              `Error al guardar tarea "${taskName}". No se guardó en la base de datos.`
            );
          }
        }
      } else {
        // Para otras páginas, usar la función normal
        await handleSaveTask(task);
      }
    },
    [
      currentPage,
      activeGeneralTab,
      userData,
      handleSaveTask,
      handleUpdateUserData,
      setUserData,
      showNotification,
      setModalOpen,
      setEditingTask,
    ]
  );

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
    handleCloneDaySchedule,
  } = useAiSync(userData, handleUpdateUserData, showNotification);

  // Función específica para actualizar endOfDay en General sin llamar a la IA
  const handleSetEndOfDayGeneral = useCallback(async () => {
    if (!userData || !tempEndOfDay) return;
    const prevUserData = { ...userData };
    try {
      const updatedUserData = { ...userData, endOfDay: tempEndOfDay };
      await handleUpdateUserData(updatedUserData);
      toast.success("Hora de fin del día actualizada.");
    } catch (error) {
      console.error("Error en handleSetEndOfDayGeneral:", error);
      await handleUpdateUserData(prevUserData);
      toast.error(
        "Error al actualizar la hora de fin del día. Los cambios han sido revertidos."
      );
    }
  }, [userData, tempEndOfDay, handleUpdateUserData, showNotification]);

  // Función para mostrar el modal de confirmación antes de clonar
  const handleShowCloneConfirmation = useCallback(() => {
    setShowConfirmation(true);
  }, [setShowConfirmation]);

  // Función para confirmar y clonar, cerrando el modal
  const handleConfirmClone = useCallback(async () => {
    await handleCloneDaySchedule();
    setShowConfirmation(false);
  }, [handleCloneDaySchedule, setShowConfirmation]);

  // Handle redirect to login when user is not authenticated
  useEffect(() => {
    if (!loading && (!user || !userData)) {
      router.push("/");
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
        onStartDay={handleShowCloneConfirmation}
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
        onNavigate={setCurrentPage}
      />
    );
  }, [
    userData,
    isSyncing,
    aiTip,
    freeTime,
    handleShowCloneConfirmation,
    syncWithAI,
    handleToggleComplete,
    handleDeleteTask,
    handleReorderTasks,
    handleEditTask,
    handleUpdateAiDuration,
    handleSetEndOfDay,
    tempEndOfDay,
    setTempEndOfDay,
    setAiTip,
    setCurrentPage,
  ]);

  const generalViewComponent = useMemo(() => {
    if (!userData) return null;
    return (
      <GeneralView
        userData={userData}
        onSaveTask={handleSaveTask}
        onSaveTaskForDay={handleSaveTaskContextual}
        onDelete={handleDeleteTask}
        onDeleteWeekly={handleDeleteWeeklyTask}
        onReorder={handleReorderTasks}
        onReorderWeekly={handleReorderWeeklyTasks}
        onEdit={handleEditTask}
        onEditWeekly={handleEditWeeklyTask}
        onToggleComplete={handleToggleComplete}
        onToggleWeekly={handleToggleWeeklyTask}
        onSetEndOfDay={handleSetEndOfDayGeneral}
        tempEndOfDay={tempEndOfDay}
        setTempEndOfDay={setTempEndOfDay}
        onTabChange={handleGeneralTabChange}
      />
    );
  }, [
    userData,
    handleSaveTask,
    handleSaveTaskContextual,
    handleDeleteTask,
    handleDeleteWeeklyTask,
    handleReorderTasks,
    handleReorderWeeklyTasks,
    handleEditTask,
    handleEditWeeklyTask,
    handleToggleComplete,
    handleToggleWeeklyTask,
    handleSetEndOfDayGeneral,
    tempEndOfDay,
    setTempEndOfDay,
    handleGeneralTabChange,
    confirmDeleteWeekly,
  ]);

  const handleSignOutWithRedirect = useCallback(async () => {
    await handleSignOut();
    router.push("/");
  }, [handleSignOut, router]);

  const profileViewComponent = useMemo(
    () => <ProfileView user={user} onSignOut={handleSignOutWithRedirect} />,
    [user, handleSignOutWithRedirect]
  );

  const progressViewComponent = useMemo(() => {
    if (!userData) return null;
    return <ProgressView userData={userData} onNavigate={setCurrentPage} />;
  }, [userData, setCurrentPage]);

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
      {currentPage === Page.Progress && progressViewComponent}
      {currentPage === Page.Profile && profileViewComponent}

      {currentPage !== Page.Profile && (
        <div
          className="fixed bottom-20 md:bottom-24 right-4 md:right-6 flex flex-col items-center z-20"
          style={{ width: "56px" }}
        >
          {currentPage === Page.Day && userData.dayTasks.length > 0 && (
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
          onSubmit={
            currentPage === Page.General
              ? handleSaveTaskContextual
              : handleSaveTask
          }
          taskToEdit={editingTask}
        />
      )}

      {showConfirmation && taskToDelete && (
        <ConfirmationModal
          isOpen={showConfirmation}
          onCancel={() => setShowConfirmation(false)}
          onConfirm={() => {
            // Determinar si es una tarea semanal o general/diaria
            const isWeeklyTask = userData?.weeklyTasks?.[
              activeGeneralTab
            ]?.some((t) => t.id === taskToDelete.id);

            if (isWeeklyTask) {
              confirmDeleteWeekly();
            } else {
              confirmDelete();
            }
          }}
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
          message="Esto clonará las tareas de 'Todos los días' y el día de hoy desde tu Horario."
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

      {isSyncing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <Icon
            name="loader"
            className="h-16 w-16 animate-spin text-emerald-400 mb-6"
          />
          <p className="text-sm text-slate-300 mt-6 text-center">
            Esto puede tardar hasta un minuto.
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
