import { useState, useCallback, useRef, useEffect } from "react";
import { DayTask, UserData, WEEKDAY_LABELS } from "../types";
import {
  getCurrentWeekDay,
  calculateTimeDifferenceInMinutes,
  roundToNearest5,
  addMinutesToTime,
} from "../utils/dateUtils";
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

    const trimmed = duration.trim().toLowerCase();

    // Manejar formato "1:30 h" o "1:30"
    const timeMatch = trimmed.match(/^(\d+):(\d+)\s*(h|hora|horas?)?$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      return hours * 60 + minutes;
    }

    // Buscar horas
    const hourMatch = trimmed.match(/(\d+)\s*h/);
    let total = 0;
    if (hourMatch) {
      total += parseInt(hourMatch[1], 10) * 60;
    }

    // Buscar minutos
    const minuteMatch = trimmed.match(/(\d+)\s*min/);
    if (minuteMatch) {
      total += parseInt(minuteMatch[1], 10);
    }

    if (total > 0) return total;

    // Si no encuentra formato específico, intentar parsear como número directo
    const directMatch = trimmed.match(/(\d+)/);
    if (directMatch) {
      return parseInt(directMatch[1]);
    }

    return 0;
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
      //new date 6 am
      const sixAm = new Date();
      sixAm.setHours(6, 0, 0, 0);
      const userTime = sixAm.toLocaleTimeString("es-ES", {
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

        console.log("🚀 ~ useAiSync ~ updatedUserDataUUUUUUUU:", updatedUserData)
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
      const allTasksAsDay: DayTask[] = uniqueTasks.map((task, index) => {
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
          order: task.order ?? index,
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

  const syncWithPseudoAI = useCallback(
    async (options?: { endOfDay?: string; tasks?: DayTask[] }) => {
      if (!userData) return;

      setIsSyncing(true);

      try {
        // --- 1. PREPARACIÓN INICIAL (sin cambios) ---
        const tasksForSync = userData.dayTasks || [];
        console.log("🚀 ~ useAiSync ~ MATEEE ENTRADA:", tasksForSync)
        const endOfDayForSync =
          options?.endOfDay || tempEndOfDay || userData.endOfDay || "23:00";

        const now = new Date();
        const userTime = now.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        
        const HORA_INICIO = userTime;
        const HORA_FIN = endOfDayForSync;
        // const HORA_INICIO = "02:04";
        // const HORA_FIN = "16:00";

        // INICIO DE LA CORRECCIÓN: ALINEAR LA HORA DE INICIO
       // =================================================================================
       
       // 1. Alinear la hora de inicio a la cuadrícula de 5 minutos.
       
       // Esto es CRUCIAL para que el método de bloques funcione sin desperdiciar tiempo.
       const [startHour, startMinute] = HORA_INICIO.split(':').map(Number);
       const remainder = startMinute % 10; // <--- ESTA ES LA LÍNEA CLAVE       
       let initialOffset = 0;
      let HORA_INICIO_ALINEADA = HORA_INICIO;

       // Si la hora de inicio no es un múltiplo de 10 (ej: 02:04),
       // calculamos el tiempo hasta el siguiente múltiplo (02:05).
      if (remainder !== 0) {
          initialOffset = 10 - remainder; // <--- Y ESTA TAMBIÉN
          HORA_INICIO_ALINEADA = addMinutesToTime(HORA_INICIO, initialOffset);
          console.log("🚀 ~ useAiSync ~ HORA_INICIO_ALINEADA:", HORA_INICIO_ALINEADA)
      }

       const minutosTotalesDisponibles = calculateTimeDifferenceInMinutes(
          HORA_INICIO_ALINEADA,
          HORA_FIN
        );

        if (minutosTotalesDisponibles < 0) {
          showNotification("El horario de inicio es posterior al de fin.", "error");
          setIsSyncing(false);
          return;
        }

        const tareas = tasksForSync
          .filter((t) => !t.completed)
          .map((t, index) => ({
            ...t,
            baseDurationMinutes: parseDurationToMinutes(t.baseDuration),
            order: t.order ?? index,
          }));

        const tareasOrdenadas = [...tareas].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const tareasFlexibles = tareasOrdenadas.filter(t => t.flexibleTime);
        
        // =================================================================================
        // INICIO DE LA LÓGICA CORREGIDA: MÉTODO DE DOS FASES
        // =================================================================================

        // --- FASE 1: Colocar las Tareas Fijas y Medir el Tiempo Restante ---

        let minutosDisponiblesParaFlexibles = minutosTotalesDisponibles;
        for (const tarea of tareasOrdenadas) {
            if (!tarea.flexibleTime) {
                // CAMBIO: Redondeamos las tareas fijas a la nueva cuadrícula de 10 minutos.
                minutosDisponiblesParaFlexibles -= Math.round(tarea.baseDurationMinutes / 10) * 10;
            }
        }
        minutosDisponiblesParaFlexibles = Math.max(0, minutosDisponiblesParaFlexibles);

        // --- FASE 2: Calcular Duración de Flexibles con Bloques de 10 min ---
        const totalFlexibleBaseDuration = tareasFlexibles.reduce((sum, t) => sum + t.baseDurationMinutes, 0);
        const duracionesFlexibles: { [id: string]: number } = {};
        
        // CAMBIO: Definimos el tamaño del bloque para reutilizarlo.
        const BLOCK_SIZE = 10;

        // CAMBIO: Calculamos el presupuesto en bloques de 10 minutos.
        const totalBloques = Math.floor(minutosDisponiblesParaFlexibles / BLOCK_SIZE);

        if (totalBloques > 0 && totalFlexibleBaseDuration > 0) {
            const tareasConBloques = tareasFlexibles.map(tarea => {
                const proportion = tarea.baseDurationMinutes / totalFlexibleBaseDuration;
                const bloquesIdeales = totalBloques * proportion;
                return {
                    ...tarea,
                    bloquesIdeales,
                    fraccion: bloquesIdeales - Math.floor(bloquesIdeales),
                    bloquesAsignados: Math.floor(bloquesIdeales),
                    // CAMBIO: El límite máximo de bloques también se basa en 10.
                    maxBloques: Math.floor(tarea.baseDurationMinutes / BLOCK_SIZE),
                };
            });

            const bloquesAsignadosInicialmente = tareasConBloques.reduce((sum, t) => sum + t.bloquesAsignados, 0);
            let bloquesRestantes = totalBloques - bloquesAsignadosInicialmente;

            tareasConBloques.sort((a, b) => b.fraccion - a.fraccion);

            for (const tarea of tareasConBloques) {
                if (bloquesRestantes <= 0) break;
                tarea.bloquesAsignados += 1;
                bloquesRestantes -= 1;
            }
    
            let surplusBloques = 0;
            for (const tarea of tareasConBloques) {
                if (tarea.bloquesAsignados > tarea.maxBloques) {
                    surplusBloques += tarea.bloquesAsignados - tarea.maxBloques;
                    tarea.bloquesAsignados = tarea.maxBloques;
                }
            }

            if (surplusBloques > 0) {
                tareasConBloques.sort((a, b) => a.baseDurationMinutes - b.baseDurationMinutes);
        
                for (const tarea of tareasConBloques) {
                    if (surplusBloques <= 0) break;
                    const puedeRecibir = tarea.maxBloques - tarea.bloquesAsignados;
                    if (puedeRecibir > 0) {
                        const aAsignar = Math.min(surplusBloques, puedeRecibir);
                        tarea.bloquesAsignados += aAsignar;
                        surplusBloques -= aAsignar;
                    }
                }
            }

            tareasConBloques.forEach(t => {
                // CAMBIO: La duración final se calcula multiplicando por 10.
                duracionesFlexibles[t.id] = t.bloquesAsignados * BLOCK_SIZE;
            });
        }
        
        // --- FASE 3: Construir el Horario Final ---
        let tiempoAcumulado = HORA_INICIO_ALINEADA;
        const updatedTasks: DayTask[] = [];

        for (const tarea of tareasOrdenadas) {
            let aiDurationMinutes = 0;
            if (tarea.flexibleTime) {
                aiDurationMinutes = duracionesFlexibles[tarea.id] ?? 0;
            } else {
                // CAMBIO: Las tareas fijas también se redondean a 10.
                aiDurationMinutes = Math.round(tarea.baseDurationMinutes / 10) * 10;
            }

            let startTime = tiempoAcumulado;
            let endTime;

            if (!tarea.flexibleTime && tarea.startTime && tarea.startTime.trim() !== '') {
                startTime = tarea.startTime;
                if (tarea.endTime && tarea.endTime.trim() !== '') {
                    endTime = tarea.endTime;
                    aiDurationMinutes = calculateTimeDifferenceInMinutes(startTime, endTime);
                } else {
                    endTime = addMinutesToTime(startTime, aiDurationMinutes);
                }
            } else {
                endTime = addMinutesToTime(startTime, aiDurationMinutes);
            }

            const formattedAiDuration = aiDurationMinutes >= 60
              ? `${Math.floor(aiDurationMinutes / 60)} h ${aiDurationMinutes % 60} min`
              : `${aiDurationMinutes} min`;

            updatedTasks.push({
              ...tarea,
              startTime,
              endTime,
              aiDuration: formattedAiDuration,
            });

            tiempoAcumulado = endTime;
        }

        // --- 6. Calcular tiempo libre ---
        // Calcular tiempo libre como: HORA_FIN - HORA_INICIO - suma de aiDuration de todas las tareas
        const totalAssignedMinutes = updatedTasks.reduce((sum, task) => sum + parseDurationToMinutes(task.aiDuration), 0);

        const totalAvailableMinutes = calculateTimeDifferenceInMinutes(HORA_INICIO, HORA_FIN);
        console.log("🚀 ~ useAiSync ~ Tiempo FREE", {
          totalAvailableMinutes,
          totalAssignedMinutes,
          initialOffset
        })
        const freeTimeMinutes = totalAvailableMinutes - totalAssignedMinutes + initialOffset;
        const newFreeTime = freeTimeMinutes > 0 ? `${freeTimeMinutes} min` : null;
        
        // --- 7. Finalizar y devolver resultado ---
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

        console.log("🚀 ~ useAiSync ~ MATE SALIDA", updatedUserData.dayTasks)
        await handleUpdateUserData(updatedUserData);
        setFreeTime(newFreeTime);
        setAiTip(
          "Planificación local completa. ¡Revisa tu horario actualizado!"
        );
        showNotification("Horario calculado localmente.", "success");
      } catch (error) {
        console.error("Error in pseudoAI sync:", error);
        showNotification("Error al calcular el horario localmente.", "error");
      } finally {
        setIsSyncing(false);
      }
    },
    [
      userData,
      handleUpdateUserData,
      tempEndOfDay,
      showNotification,
      recalculateCurrentDayTask,
      parseDurationToMinutes,
    ]
  );

  return {
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
  };
};