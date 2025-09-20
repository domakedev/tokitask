import { useState, useCallback, useRef, useEffect } from "react";
import { DayTask, UserData, WEEKDAY_LABELS } from "../types";
import { getCurrentWeekDay } from "../utils/dateUtils";
import { generateTaskId } from "../utils/idGenerator";
import { toast } from "react-toastify";

export const useAiSync = (
  userData: UserData | null,
  handleUpdateUserData: (data: Partial<UserData>) => Promise<void>,
  showNotification: (message: string, type?: "success" | "error") => void
) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [freeTime, setFreeTime] = useState<string | null>(null);
  const [tempEndOfDay, setTempEndOfDay] = useState<string>(userData?.endOfDay || "18:00");
  const lastSyncRef = useRef<Date | null>(null);

  // Sincronizar tempEndOfDay con userData.endOfDay cuando cambie
  useEffect(() => {
    if (userData?.endOfDay && userData.endOfDay !== tempEndOfDay) {
      setTempEndOfDay(userData.endOfDay);
    }
  }, [userData?.endOfDay]);

  const recalculateCurrentDayTask = useCallback((tasks: DayTask[]): DayTask[] => {
    const firstPendingIndex = tasks.findIndex((task) => !task.completed);
    return tasks.map((task, index) => ({
      ...task,
      isCurrent: index === firstPendingIndex,
    }));
  }, []);

  // Función para convertir duración string a minutos
  const parseDurationToMinutes = useCallback((duration: string): number => {
    if (!duration) return 0;

    const lowerDuration = duration.toLowerCase();
    let totalMinutes = 0;

    // Buscar horas
    const hourMatch = lowerDuration.match(/(\d+)\s*h/);
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
    }

    // Buscar minutos
    const minuteMatch = lowerDuration.match(/(\d+)\s*min/);
    if (minuteMatch) {
      totalMinutes += parseInt(minuteMatch[1]);
    }

    // Si no encuentra formato específico, intentar parsear como número directo
    if (totalMinutes === 0) {
      const directMatch = lowerDuration.match(/(\d+)/);
      if (directMatch) {
        totalMinutes = parseInt(directMatch[1]);
      }
    }

    return totalMinutes;
  }, []);

  // Función para validar si las tareas fijas exceden el tiempo disponible
  const validateFixedTasksTime = useCallback((tasks: DayTask[], endOfDay: string, currentTime: string): boolean => {
    const fixedTasks = tasks.filter(task => !task.completed && task.flexibleTime === false);
    if (fixedTasks.length === 0) return true; // No hay tareas fijas, continuar

    const totalFixedMinutes = fixedTasks.reduce((total, task) => {
      return total + parseDurationToMinutes(task.baseDuration);
    }, 0);

    // Calcular tiempo disponible en minutos
    const [endHour, endMinute] = endOfDay.split(':').map(Number);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);

    const endTotalMinutes = endHour * 60 + endMinute;
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const availableMinutes = endTotalMinutes - currentTotalMinutes;

    return totalFixedMinutes <= availableMinutes;
  }, [parseDurationToMinutes]);

  const syncWithAI = useCallback(
    async (options?: { endOfDay?: string; tasks?: DayTask[] }) => {
      if (!userData) return;

      const tasksForSync = options?.tasks || userData.dayTasks || [];
      const endOfDayForSync =
        options?.endOfDay ||
        (tempEndOfDay && tempEndOfDay.trim() !== "" ? tempEndOfDay : null) ||
        userData.endOfDay ||
        "18:00";

      // Validar que tenemos los datos necesarios
      if (!Array.isArray(tasksForSync) || !endOfDayForSync) {
        showNotification("Datos insuficientes para sincronizar con IA. Verifica tu configuración.", "error");
        return;
      }

      const tasksToPlan: DayTask[] =
        tasksForSync.length > 0
          ? tasksForSync
              .filter((t) => !t.completed)
              .map((t) => ({
                ...t,
                baseDuration: t.baseDuration,
                aiDuration: t.aiDuration ?? "",
                // Asignar fecha actual si no tiene scheduledDate o está vacío
                scheduledDate: t.scheduledDate && t.scheduledDate.trim() !== ""
                  ? t.scheduledDate
                  : new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format in local time
              }))
          : [];

      if (tasksToPlan.length === 0) {
        await handleUpdateUserData({
          ...userData,
          dayTasks: tasksForSync,
          endOfDay: endOfDayForSync,
        });
        setFreeTime(null);
        return;
      }

      // Validar tiempo de tareas fijas antes de sincronizar
      const now = new Date();
      const userTime = now.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      if (!validateFixedTasksTime(tasksToPlan, endOfDayForSync, userTime)) {
        const totalFixedMinutes = tasksToPlan
          .filter(task => task.flexibleTime === false)
          .reduce((total, task) => total + parseDurationToMinutes(task.baseDuration), 0);

        toast.error(
          `⚠️ No te queda suficiente tiempo para completar las tareas fijas (total de ${Math.floor(totalFixedMinutes / 60)} horas ${totalFixedMinutes % 60} min). \n\n Ajusta la hora de fin del día o modifica las tareas fijas.`,
          {
            position: "top-right",
            autoClose: false,
            closeOnClick: false,
            draggable: false,
            theme: "dark",
            style: {
              backgroundColor: "#1f2937",
              color: "#f87171",
              border: "1px solid #dc2626",
              borderRadius: "8px",
              fontSize: "14px",
              lineHeight: "1.5",
              whiteSpace: "pre-line"
            }
          }
        );
        return;
      }

      setIsSyncing(true);
      try {
        const response = await fetch('/api/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tasks: tasksToPlan,
            endOfDay: endOfDayForSync,
            userTime,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al sincronizar con la IA');
        }

        const {
          updatedTasks,
          freeTime: newFreeTime,
          tip,
        } = await response.json();

        // La API ya devuelve las tareas procesadas correctamente
        const completedOriginalTasks = tasksForSync.filter((t) => t.completed);
        const finalTasks = recalculateCurrentDayTask([
          ...completedOriginalTasks,
          ...updatedTasks,
        ]);

        const updatedUserData = {
          ...userData,
          dayTasks: finalTasks,
          endOfDay: endOfDayForSync,
        };

        await handleUpdateUserData(updatedUserData);
        setFreeTime(newFreeTime);
        setAiTip(tip || null);
        showNotification("Horario actualizado con IA.", "success");
        lastSyncRef.current = new Date();
      } catch (error) {
        console.error("Error syncing with AI:", error);

        // Provide more specific error messages
        let errorMessage = "Error al sincronizar con la IA.";
        if (error instanceof Error) {
          if (error.message.includes("GEMINI_API_KEY")) {
            errorMessage = "Configuración de API incompleta. Revisa las variables de entorno.";
          } else if (error.message.includes("No se pudo actualizar")) {
            errorMessage = "Error de conexión con el servicio de IA. Inténtalo de nuevo.";
          }
        }

        showNotification(errorMessage, "error");
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [userData, handleUpdateUserData, tempEndOfDay, showNotification, recalculateCurrentDayTask, validateFixedTasksTime, parseDurationToMinutes]
  );

  const handleUpdateAiDuration = useCallback(
    async (taskId: string, newAiDuration: string) => {
      if (!userData) return;
      const prevUserData = { ...userData };
      try {
        const updatedTasks = userData.dayTasks.map((t) =>
          t.id === taskId ? { ...t, aiDuration: newAiDuration } : t
        );
        const updatedUserData = { ...userData, dayTasks: updatedTasks };
        await handleUpdateUserData(updatedUserData);
      } catch (error) {
        console.error("Error en handleUpdateAiDuration:", error);
        // Revertir cambios en UI si hay error en DB
        await handleUpdateUserData(prevUserData);
        showNotification(
          "Error al actualizar el tiempo de IA. Los cambios han sido revertidos.",
          "error"
        );
      }
    },
    [userData, handleUpdateUserData, showNotification]
  );

    // Nueva función que solo clona las tareas sin llamar a la IA
  const handleCloneDaySchedule = useCallback(async () => {
    if (!userData) return;

    const currentDay = getCurrentWeekDay();
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time

    // Get all tasks that should be included for today
    const generalTasks = userData.generalTasks || [];
    const dayTasks = userData.weeklyTasks?.[currentDay] || [];
    const calendarTasks = userData.calendarTasks || [];

    // Include tasks specifically scheduled for today from calendarTasks
    const scheduledCalendarTasks = calendarTasks.filter(task =>
      task.scheduledDate && task.scheduledDate === today
    );

    const allTasks = [
      ...generalTasks,
      ...dayTasks,
      ...scheduledCalendarTasks
    ];

    // Remove duplicates based on id
    const uniqueTasks = allTasks.filter((task, index, self) =>
      index === self.findIndex(t => t.id === task.id)
    );

    if (uniqueTasks.length === 0) {
      showNotification("No hay tareas programadas para hoy. Crea tareas en la sección General primero.", "error");
      return;
    }

    try {
      const taskCompletionsByProgressId = userData.taskCompletionsByProgressId || {};

      // Crear IDs únicos para evitar duplicados, pero mantener progressId
      const allTasksAsDay: DayTask[] = uniqueTasks.map((task) => {
        const taskProgressId = task.progressId || generateTaskId();
        // Verificar si la tarea ya fue completada hoy según la DB
        const taskCompletions = taskCompletionsByProgressId[taskProgressId] || [];
        const isCompletedToday = taskCompletions.includes(today);

        return {
          ...task,
          id: generateTaskId(), // ID único usando UUID v4
          progressId: taskProgressId, // Mantener progressId existente o crear uno nuevo
          completed: isCompletedToday, // Verificar completitud según DB
          isCurrent: false,
          aiDuration: "",
          isHabit: task.isHabit ?? false, // Asegurar que isHabit se copie correctamente
        };
      });

      // Calcular cuál es la primera tarea pendiente
      const firstPendingIndex = allTasksAsDay.findIndex((task) => !task.completed);
      const finalTasks = allTasksAsDay.map((task, index) => ({
        ...task,
        isCurrent: index === firstPendingIndex,
      }));

      const updatedUserData = {
        ...userData,
        dayTasks: finalTasks,
      };

      await handleUpdateUserData(updatedUserData);
      setFreeTime(null);
      setAiTip(null);
      showNotification(`Horario del ${WEEKDAY_LABELS[getCurrentWeekDay()]} clonado exitosamente.`, "success");
    } catch (error) {
      console.error("Error cloning day schedule:", error);
      showNotification("Error al clonar el horario del día.", "error");
    }
  }, [userData, handleUpdateUserData, showNotification]);

  return {
    isSyncing,
    aiTip,
    setAiTip,
    freeTime,
    tempEndOfDay,
    setTempEndOfDay,
    syncWithAI,
    handleUpdateAiDuration,
    handleCloneDaySchedule,
  };
};