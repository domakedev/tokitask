"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import GeneralView from "../../../components/GeneralView";
import TaskModal from "../../../components/AddTaskModal";
import ConfirmationModal from "../../../components/ConfirmationModal";
import FirebaseErrorScreen from "../../../components/FirebaseErrorScreen";
import OnboardingModal from "../../../components/OnboardingModal";
import AiSyncOverlay from "../../../components/AiSyncOverlay";
import Icon from "../../../components/Icon";
import { generateTaskId } from "../../../utils/idGenerator";

export default function GeneralPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);

  // Estado para trackear la pestaña activa en General
  const [activeGeneralTab, setActiveGeneralTab] = useState<WeekDay>(
    WeekDay.All
  );

  // Estado para el modo de vista en General
  const [generalViewMode, setGeneralViewMode] = useState<"week" | "calendar">(
    "week"
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toLocaleDateString("en-CA")
  );

  // Inicializar el modo de vista desde la URL
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'calendar') {
      setGeneralViewMode('calendar');
    } else {
      setGeneralViewMode('week');
    }
  }, [searchParams]);

  // Inicializar calendarTasks si no existe
  useEffect(() => {
    if (userData && !userData.calendarTasks) {
      const updatedUserData = { ...userData, calendarTasks: [] };
      setUserData(updatedUserData);
    }
  }, [userData, setUserData]);

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
    setCurrentPage(Page.General);
  }, [setCurrentPage]);

  // Función para manejar cambios de pestaña en General
  const handleGeneralTabChange = useCallback((tab: WeekDay) => {
    setActiveGeneralTab(tab);
  }, []);

  // Funciones específicas para manejar tareas de calendarTasks
  const handleEditCalendarTask = useCallback(
    (taskId: string) => {
      if (!userData?.calendarTasks) return;

      const task = userData.calendarTasks.find((t) => t.id === taskId);
      if (task) {
        setEditingTask(task);
        setModalOpen(true);
      }
    },
    [userData, setEditingTask, setModalOpen]
  );

  const handleDeleteCalendarTask = useCallback(
    async (taskId: string) => {
      if (!userData?.calendarTasks) return;

      const task = userData.calendarTasks.find((t) => t.id === taskId);

      if (task) {
        setTaskToDelete(task);
        setShowConfirmation(true);
      }
    },
    [userData, setTaskToDelete, setShowConfirmation]
  );

  // Función específica para confirmar eliminación de tareas del calendario
  const confirmDeleteCalendar = useCallback(async () => {
    if (!userData || !taskToDelete) return;

    const prevUserData = { ...userData };
    try {
      // Asegurar que calendarTasks esté inicializado
      const currentCalendarTasks = userData.calendarTasks || [];

      // Filtrar la tarea específica
      const updatedTasks = currentCalendarTasks.filter(
        (t) => t.id !== taskToDelete.id
      );

      const updatedUserData = {
        ...userData,
        calendarTasks: updatedTasks,
      };

      setUserData(updatedUserData);
      await handleUpdateUserData(updatedUserData);
      setShowConfirmation(false);
      setTaskToDelete(null);
      const taskName = taskToDelete.name || "Tarea";
      toast.success(`Se eliminó tarea "${taskName}" de la DB.`);
    } catch (error) {
      console.error("Error en confirmDeleteCalendar:", error);
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
    setUserData,
    handleUpdateUserData,
    setShowConfirmation,
    setTaskToDelete,
  ]);

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
    setShowConfirmation,
    setTaskToDelete,
  ]);

  const handleToggleWeeklyTask = useCallback(
    async (taskId: string) => {
      if (!userData) return;

      const prevUserData = { ...userData };
      try {
        const now = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format in local time
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
    [userData, activeGeneralTab, setUserData, handleUpdateUserData]
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
    [userData, activeGeneralTab, setUserData, handleUpdateUserData]
  );

  const handleReorderGeneralTasks = useCallback(
    async (reorderedTasks: GeneralTask[]) => {
      if (!userData) return;

      const prevUserData = { ...userData };
      try {
        const updatedUserData = {
          ...userData,
          generalTasks: reorderedTasks,
        };

        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
      } catch (error) {
        console.error("Error reordering general tasks:", error);
        setUserData(prevUserData);
        toast.error("Error al reordenar las tareas.");
      }
    },
    [userData, setUserData, handleUpdateUserData]
  );

  const handleReorderCalendarTasks = useCallback(
    async (reorderedTasks: GeneralTask[]) => {
      if (!userData) return;

      const prevUserData = { ...userData };
      try {
        const updatedUserData = {
          ...userData,
          calendarTasks: reorderedTasks,
        };

        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
      } catch (error) {
        console.error("Error reordering calendar tasks:", error);
        setUserData(prevUserData);
        toast.error("Error al reordenar las tareas.");
      }
    },
    [userData, setUserData, handleUpdateUserData]
  );

  // Función para guardar tareas contextual según la pestaña activa
  const handleSaveTaskContextual = useCallback(
    async (task: BaseTask | Omit<BaseTask, "id">, selectedDays?: WeekDay[]) => {
      if (generalViewMode === "calendar") {
        // Manejar calendarTasks directamente cuando está en modo calendario
        if (!userData) return;

        const isEditing = "id" in task;
        const prevUserData = { ...userData };

        try {
          // Asegurar que calendarTasks esté inicializado
          const currentCalendarTasks = userData.calendarTasks || [];

          if (isEditing) {
            // Verificar si se está cambiando isHabit
            let isHabitChanged = false;

            // Buscar la tarea original para comparar isHabit
            const allTasks = [
              ...userData.dayTasks,
              ...userData.generalTasks,
              ...Object.values(userData.weeklyTasks || {}).flat(),
              ...(userData.calendarTasks || []),
            ];
            const originalTask = allTasks.find((t) => t.id === task.id);
            if (
              originalTask &&
              "isHabit" in task &&
              originalTask.isHabit !== task.isHabit
            ) {
              isHabitChanged = true;
            }

            // Editar tarea existente en calendarTasks
            const updatedTasks = currentCalendarTasks.map((t) =>
              t.id === task.id ? { ...t, ...task } : t
            );

            const updatedUserData = {
              ...userData,
              calendarTasks: updatedTasks,
            };

            setUserData(updatedUserData);
            await handleUpdateUserData(updatedUserData);

            // Si se cambió isHabit, actualizar todas las tareas con el mismo nombre
            if (isHabitChanged && "isHabit" in task) {
              await handleUpdateHabitForAllTasks(task.id, task.isHabit!);
            }
          } else {
            // Crear nueva tarea en calendarTasks
            const newTask = {
              ...task,
              id: generateTaskId(),
              progressId: generateTaskId(),
              completed: false,
            } as GeneralTask;

            const updatedUserData = {
              ...userData,
              calendarTasks: [...currentCalendarTasks, newTask],
            };

            setUserData(updatedUserData);
            await handleUpdateUserData(updatedUserData);
          }

          const taskName = "name" in task ? task.name : "Tarea";
          const action = isEditing ? "actualizó" : "añadió";
          toast.success(
            `Se ${action} tarea "${taskName}" en la base de datos.`
          );
          setModalOpen(false);
          setEditingTask(null);
        } catch (error) {
          console.error("Error saving calendar task:", error);
          setUserData(prevUserData);
          const taskName = "name" in task ? task.name : "Tarea";
          toast.error(
            `Error al guardar tarea "${taskName}". No se guardó en la base de datos.`
          );
        }
      } else if (activeGeneralTab === WeekDay.All) {
        // Guardar en generalTasks
        await handleSaveTask(task);
      } else {
        // Guardar en weeklyTasks para el día específico o múltiples días
        if (!userData) return;

        const isEditing = "id" in task;
        const prevUserData = { ...userData };

        try {
          // Verificar si se está cambiando isHabit
          let isHabitChanged = false;
          let originalTask;

          if (isEditing) {
            // Buscar la tarea original para comparar isHabit
            const allTasks = [
              ...userData.dayTasks,
              ...userData.generalTasks,
              ...Object.values(userData.weeklyTasks || {}).flat(),
              ...(userData.calendarTasks || []),
            ];
            originalTask = allTasks.find((t) => t.id === task.id);
            if (
              originalTask &&
              "isHabit" in task &&
              originalTask.isHabit !== task.isHabit
            ) {
              isHabitChanged = true;
            }
          }

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

          // Determinar en qué días guardar la tarea
          const daysToSave =
            selectedDays && selectedDays.length > 0
              ? selectedDays
              : [activeGeneralTab];

          const updatedWeeklyTasks = { ...currentWeeklyTasks };
          const successfulDays: WeekDay[] = [];

          for (const day of daysToSave) {
            const currentTasks = currentWeeklyTasks[day] || [];
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
              successfulDays.push(day);
            } else {
              // Validar unicidad para nueva tarea en cada día
              const taskName = task.name.trim().toLowerCase();
              const existingTask = currentTasks.find(
                (t) => t.name.trim().toLowerCase() === taskName
              );
              if (existingTask) {
                toast.error(
                  `Ya existe una tarea con el nombre "${task.name}" en ${WEEKDAY_LABELS[day]}.`
                );
                continue; // Skip this day
              }
              // Crear nueva tarea - agregar al final con ID único y progressId único
              const newTask = {
                ...task,
                id: generateTaskId(),
                progressId: generateTaskId(), // Único para cada tarea
                completed: false,
              } as GeneralTask;
              updatedTasks = [...currentTasks, newTask];
              successfulDays.push(day);
            }

            updatedWeeklyTasks[day] = updatedTasks;
          }

          if (successfulDays.length > 0) {
            const updatedUserData = {
              ...userData,
              weeklyTasks: updatedWeeklyTasks,
            };

            setUserData(updatedUserData);
            await handleUpdateUserData(updatedUserData);

            // Si se cambió isHabit, actualizar todas las tareas con el mismo nombre
            if (isHabitChanged && isEditing && "isHabit" in task) {
              await handleUpdateHabitForAllTasks(task.id, task.isHabit!);
            }

            const taskName = "name" in task ? task.name : "Tarea";
            const action = isEditing ? "actualizó" : "añadió";
            const daysText =
              successfulDays.length > 1
                ? ` en ${successfulDays.length} días`
                : ` en ${WEEKDAY_LABELS[successfulDays[0]]}`;
            toast.success(
              `Se ${action} tarea "${taskName}"${daysText} en la base de datos.`
            );
          }
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
    },
    [
      generalViewMode,
      activeGeneralTab,
      userData,
      handleSaveTask,
      handleUpdateUserData,
      setUserData,
      setModalOpen,
      setEditingTask,
      handleUpdateHabitForAllTasks,
      generateTaskId,
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
    syncWithPseudoAI,
    handleUpdateAiDuration,
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
  }, [userData, tempEndOfDay, handleUpdateUserData]);

  const handleSaveTaskForDayWrapper = useCallback(
    (task: BaseTask | Omit<BaseTask, "id">, day: WeekDay) => {
      // Wrapper to maintain compatibility, but since we now use selectedDays, this might not be called
      handleSaveTaskContextual(task, [day]);
    },
    [handleSaveTaskContextual]
  );

  const generalViewComponent = useMemo(() => {
    if (!userData) {
      return <LoadingScreen message="Cargando datos..." />;
    }
    return (
      <GeneralView
        userData={userData}
        onSaveTask={handleSaveTask}
        onSaveTaskForDay={handleSaveTaskForDayWrapper}
        onDelete={handleDeleteTask}
        onDeleteWeekly={handleDeleteWeeklyTask}
        onDeleteCalendar={handleDeleteCalendarTask}
        onReorder={handleReorderGeneralTasks}
        onReorderWeekly={handleReorderWeeklyTasks}
        onReorderCalendar={handleReorderCalendarTasks}
        onEdit={handleEditTask}
        onEditWeekly={handleEditWeeklyTask}
        onEditCalendar={handleEditCalendarTask}
        onToggleComplete={handleToggleComplete}
        onToggleWeekly={handleToggleWeeklyTask}
        onSetEndOfDay={handleSetEndOfDayGeneral}
        tempEndOfDay={tempEndOfDay}
        setTempEndOfDay={setTempEndOfDay}
        onTabChange={handleGeneralTabChange}
        onViewModeChange={setGeneralViewMode}
        onSelectedDateChange={setSelectedCalendarDate}
        viewMode={generalViewMode}
      />
    );
  }, [
    userData,
    handleSaveTask,
    handleSaveTaskForDayWrapper,
    handleDeleteTask,
    handleDeleteWeeklyTask,
    handleReorderGeneralTasks,
    handleReorderWeeklyTasks,
    handleReorderCalendarTasks,
    handleEditTask,
    handleEditWeeklyTask,
    handleToggleComplete,
    handleToggleWeeklyTask,
    handleSetEndOfDayGeneral,
    tempEndOfDay,
    setTempEndOfDay,
    handleGeneralTabChange,
    generalViewMode,
  ]);

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {generalViewComponent}

      <div
        className="fixed bottom-20 md:bottom-24 right-4 md:right-6 flex flex-col items-center z-20"
        style={{ width: "56px" }}
      >
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
          onSubmit={
            generalViewMode === "calendar"
              ? handleSaveTaskContextual
              : (
                  task: BaseTask | Omit<BaseTask, "id">,
                  selectedDays?: WeekDay[]
                ) => {
                  if ("id" in task) {
                    handleSaveTask(
                      task,
                      selectedDays ? selectedDays[0] : undefined
                    );
                  } else {
                    const { progressId, ...taskWithoutProgressId } = task;
                    handleSaveTask(
                      taskWithoutProgressId,
                      selectedDays ? selectedDays[0] : undefined
                    );
                  }
                }
          }
          taskToEdit={editingTask}
          showDaySelection={
            generalViewMode !== "calendar" &&
            activeGeneralTab !== WeekDay.All &&
            !editingTask
          }
          currentDay={
            generalViewMode !== "calendar" ? activeGeneralTab : undefined
          }
          initialScheduledDate={
            generalViewMode === "calendar" && !editingTask
              ? selectedCalendarDate
              : undefined
          }
          showScheduledDateField={generalViewMode === "calendar"}
          currentView={
            generalViewMode === "calendar"
              ? "general-calendar"
              : generalViewMode === "week"
              ? "general-week"
              : "unknown"
          }
        />
      )}

      {showConfirmation && taskToDelete && (
        <ConfirmationModal
          isOpen={showConfirmation}
          onCancel={() => setShowConfirmation(false)}
          onConfirm={() => {
            // Determinar si es una tarea semanal, del calendario o general/diaria
            const isWeeklyTask = userData?.weeklyTasks?.[
              activeGeneralTab
            ]?.some((t) => t.id === taskToDelete.id);

            const isCalendarTask = userData?.calendarTasks?.some(
              (t) => t.id === taskToDelete.id
            );

            if (isCalendarTask) {
              confirmDeleteCalendar();
            } else if (isWeeklyTask) {
              confirmDeleteWeekly();
            } else {
              confirmDelete();
            }
          }}
          title="Confirmar Eliminación"
          message="¿Estás seguro de que quieres eliminar esta tarea?"
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
