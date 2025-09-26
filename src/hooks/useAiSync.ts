import { useState, useCallback, useRef, useEffect } from "react";
import { DayTask, UserData, WEEKDAY_LABELS } from "../types";
import {
  getCurrentWeekDay,
  calculateTimeDifferenceInMinutes,
  addMinutesToTime,
  parseDurationToMinutes,
  normalizeTime,
} from "../utils/dateUtils";
import { generateTaskId } from "../utils/idGenerator";
import { toast } from "react-toastify";

export const useAiSync = (
  userData: UserData | null,
  handleUpdateUserData: (data: Partial<UserData>) => Promise<void>,
  showNotification: (message: string, type?: "success" | "error") => void
) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiTip, setAiTip] = useState<{ message: string; type: 'tip' | 'warning' } | null>(null);
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

  // Función para validar si las tareas fijas exceden el tiempo disponible
  const validateFixedTasksTime = useCallback((tasks: DayTask[], endOfDay: string, currentTime: string): boolean => {
    const fixedTasks = tasks.filter(task => !task.completed && task.flexibleTime === false);
    if (fixedTasks.length === 0) return true; // No hay tareas fijas, continuar

    const parseTimeToMinutes = (time: string): number => {
      const [hour, minute] = time.split(':').map(Number);
      return hour * 60 + minute;
    };

    const totalFixedMinutes = fixedTasks.reduce((total, task) => {
      let remaining = 0;
      if (!task.startTime || !task.endTime) {
        // Tarea no programada, usar duración completa
        remaining = parseDurationToMinutes(task.baseDuration);
      } else {
        // Tarea programada, calcular tiempo restante
        const startTotal = parseTimeToMinutes(task.startTime);
        const endTotal = parseTimeToMinutes(task.endTime);
        const currentTotal = parseTimeToMinutes(currentTime);
        if (currentTotal >= endTotal) {
          remaining = 0; // Ya terminó
        } else if (currentTotal >= startTotal) {
          remaining = endTotal - currentTotal; // Tiempo restante
        } else {
          remaining = parseDurationToMinutes(task.baseDuration); // No ha empezado, duración completa
        }
      }
      return total + remaining;
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
      // const sixAm = new Date();
      // sixAm.setHours(6, 0, 0, 0);
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
        setAiTip(tip ? { message: tip, type: 'tip' } : null);
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
        console.log("🚀 ~ useAiSync ~ userData.dayTasks IIIII:", userData.dayTasks)
        // --- 1. PREPARACIÓN INICIAL (sin cambios) ---
        const tasksForSync = userData.dayTasks || [];
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
            // Normalizar tiempos a formato HH:MM
            startTime: t.startTime ? normalizeTime(t.startTime) : undefined,
            endTime: t.endTime ? normalizeTime(t.endTime) : undefined,
          }));

        // Validar tiempo de tareas fijas antes de sincronizar
        if (!validateFixedTasksTime(tareas, endOfDayForSync, userTime)) {
          const totalFixedMinutes = tareas
            .filter(task => task.flexibleTime === false)
            .reduce((total, task) => total + parseDurationToMinutes(task.baseDuration), 0);

          toast.error(
            `⚠️ No te queda suficiente tiempo para completar las tareas fijas, requieren de: ${Math.floor(totalFixedMinutes / 60)} horas ${totalFixedMinutes % 60} min. \n\n Ajusta la hora de fin del día o modifica las tareas fijas.`,
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
          setIsSyncing(false);
          return;
        }

        // Separar tareas fijas y flexibles
        const tareasNoFlexibles = tareas.filter(t => t.flexibleTime === false);
        const tareasFlexibles = tareas.filter(t => t.flexibleTime !== false);
        
        // Dentro de las no flexibles, separar las que tienen horario específico de las que no
        const tareasConHorarioFijo = tareasNoFlexibles.filter(t => t.startTime && t.endTime);
        const tareasNoFlexiblesSinHorario = tareasNoFlexibles.filter(t => !t.startTime || !t.endTime);
        
        // =================================================================================
        // NUEVA LÓGICA: RESPETAR HORARIOS FIJOS Y LLENAR ESPACIOS CON FLEXIBLES
        // =================================================================================

        const warnings: string[] = [];

        // --- FASE 1: Crear estructura de tiempo con tareas fijas ---
        interface TimeSlot {
          startTime: string;
          endTime: string;
          task?: DayTask;
          isFixed: boolean;
        }

        const timeSlots: TimeSlot[] = [];
        let currentTime = HORA_INICIO_ALINEADA;

        // Ordenar tareas fijas por hora de inicio
        const tareasFixasOrdenadas = [...tareasConHorarioFijo]
          .map(tarea => {
            const start = tarea.startTime!;
            const end = tarea.endTime!;
            console.log("🚀 ~ useAiSync ~ userTime >= end:", {userTime, end})
            if (userTime >= end) {
              // Omitir tarea porque ya terminó
              warnings.push(`La tarea "${tarea.name}" no se pudo programar porque su horario de inicio o fin estaba fuera de tiempo.`);
              return null;
            } else if (userTime > start) {
              // Ajustar startTime a la hora actual
              return { ...tarea, startTime: userTime };
            } else {
              return tarea;
            }
          })
          .filter(tarea => tarea !== null)
          .sort((a, b) => (a!.startTime || '').localeCompare(b!.startTime || ''));

        // Colocar tareas fijas y crear espacios libres entre ellas
        for (const tareaFija of tareasFixasOrdenadas) {
          const tareaStart = tareaFija.startTime!;
          const tareaEnd = tareaFija.endTime!;

          // Si hay espacio antes de esta tarea fija, crear slot libre
          if (currentTime < tareaStart) {
            timeSlots.push({
              startTime: currentTime,
              endTime: tareaStart,
              isFixed: false
            });
          }

          // Agregar la tarea fija
          timeSlots.push({
            startTime: tareaStart,
            endTime: tareaEnd,
            task: tareaFija,
            isFixed: true
          });

          currentTime = tareaEnd;
        }

        // Si queda tiempo después de la última tarea fija
        if (currentTime < HORA_FIN) {
          timeSlots.push({
            startTime: currentTime,
            endTime: HORA_FIN,
            isFixed: false
          });
        }

        // --- FASE 2: Calcular tiempo disponible para tareas flexibles ---
        // Primero, reservar tiempo para tareas no flexibles sin horario
        const tiempoReservadoParaNoFlexibles = tareasNoFlexiblesSinHorario.reduce((sum, t) => sum + t.baseDurationMinutes, 0);
        
        const tiempoTotalDisponible = timeSlots
          .filter(slot => !slot.isFixed)
          .reduce((total, slot) => total + calculateTimeDifferenceInMinutes(slot.startTime, slot.endTime), 0);
        
        const tiempoDisponibleParaFlexibles = Math.max(0, tiempoTotalDisponible - tiempoReservadoParaNoFlexibles);

        // --- FASE 3: Distribuir tareas flexibles en espacios disponibles ---
        const totalFlexibleBaseDuration = tareasFlexibles.reduce((sum, t) => sum + t.baseDurationMinutes, 0);
        const duracionesFlexibles: { [id: string]: number } = {};
        
        const BLOCK_SIZE = 10;
        const totalBloques = Math.floor(tiempoDisponibleParaFlexibles / BLOCK_SIZE);

        if (totalBloques > 0 && totalFlexibleBaseDuration > 0) {
            const tareasConBloques = tareasFlexibles.map(tarea => {
                const proportion = tarea.baseDurationMinutes / totalFlexibleBaseDuration;
                const bloquesIdeales = totalBloques * proportion;
                return {
                    ...tarea,
                    bloquesIdeales,
                    fraccion: bloquesIdeales - Math.floor(bloquesIdeales),
                    bloquesAsignados: Math.floor(bloquesIdeales),
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
                duracionesFlexibles[t.id] = t.bloquesAsignados * BLOCK_SIZE;
            });
        }
        
        // --- FASE 4: Construir el horario final llenando espacios libres ---
        const updatedTasks: DayTask[] = [];
        const tareasFlexiblesProcesadas = new Set<string>();

        for (const slot of timeSlots) {
          if (slot.isFixed && slot.task) {
            // Agregar tarea fija con su horario original
            const taskDurationMinutes = parseDurationToMinutes(slot.task.baseDuration);
            const formattedAiDuration = taskDurationMinutes >= 60
              ? `${Math.floor(taskDurationMinutes / 60).toString().padStart(2, '0')}:${(taskDurationMinutes % 60).toString().padStart(2, '0')}`
              : `00:${(taskDurationMinutes % 60).toString().padStart(2, '0')}`;

            updatedTasks.push({
              ...slot.task,
              startTime: slot.startTime,
              endTime: slot.endTime,
              aiDuration: formattedAiDuration,
            });
          } else {
            // Llenar espacio libre con tareas flexibles
            let slotTime = slot.startTime;
            const slotEndTime = slot.endTime;

            // Primero procesar tareas no flexibles sin horario (respetando su baseDuration completa como bloque)
            for (const tareaNoFlexible of tareasNoFlexiblesSinHorario) {
              if (tareasFlexiblesProcesadas.has(tareaNoFlexible.id)) continue;
              if (slotTime >= slotEndTime) break;

              const duracionExacta = tareaNoFlexible.baseDurationMinutes;
              const tiempoRestanteEnSlot = calculateTimeDifferenceInMinutes(slotTime, slotEndTime);

              // Solo asignar si el slot completo puede acomodar toda la duración base
              if (tiempoRestanteEnSlot >= duracionExacta) {
                const taskEndTime = addMinutesToTime(slotTime, duracionExacta);

                const formattedAiDuration = duracionExacta >= 60
                  ? `${Math.floor(duracionExacta / 60).toString().padStart(2, '0')}:${(duracionExacta % 60).toString().padStart(2, '0')}`
                  : `00:${(duracionExacta % 60).toString().padStart(2, '0')}`;

                updatedTasks.push({
                  ...tareaNoFlexible,
                  startTime: slotTime,
                  endTime: taskEndTime,
                  aiDuration: formattedAiDuration,
                });

                slotTime = taskEndTime;
                tareasFlexiblesProcesadas.add(tareaNoFlexible.id);
              }
              // Si no cabe completa, omitir en este slot (se agregará al final)
            }
            
            // Luego procesar tareas flexibles
            for (const tareaFlexible of tareasFlexibles) {
              if (tareasFlexiblesProcesadas.has(tareaFlexible.id)) continue;
              if (slotTime >= slotEndTime) break;
              
              const aiDurationMinutes = duracionesFlexibles[tareaFlexible.id] ?? 0;
              
              // Si la tarea no tiene duración asignada, darle al menos 10 minutos
              const duracionFinal = aiDurationMinutes > 0 ? aiDurationMinutes : 10;
              
              const tiempoRestanteEnSlot = calculateTimeDifferenceInMinutes(slotTime, slotEndTime);
              const duracionAUsar = Math.min(duracionFinal, tiempoRestanteEnSlot);
              
              if (duracionAUsar > 0) {
                const taskEndTime = addMinutesToTime(slotTime, duracionAUsar);
                
                const formattedAiDuration = duracionAUsar >= 60
                  ? `${Math.floor(duracionAUsar / 60).toString().padStart(2, '0')}:${(duracionAUsar % 60).toString().padStart(2, '0')}`
                  : `00:${(duracionAUsar % 60).toString().padStart(2, '0')}`;

                updatedTasks.push({
                  ...tareaFlexible,
                  startTime: slotTime,
                  endTime: taskEndTime,
                  aiDuration: formattedAiDuration,
                });

                slotTime = taskEndTime;
                
                // SIEMPRE marcar como procesada, independientemente de si se usó toda la duración
                tareasFlexiblesProcesadas.add(tareaFlexible.id);
                
                // Si no usamos toda la duración, actualizar la duración restante para referencia
                if (duracionAUsar < duracionFinal) {
                  duracionesFlexibles[tareaFlexible.id] = duracionFinal - duracionAUsar;
                }
              }
            }
          }
        }

        // --- FASE 5: Agregar tareas flexibles no procesadas al final ---
        let tiempoFinal = updatedTasks.length > 0
          ? updatedTasks[updatedTasks.length - 1].endTime || HORA_INICIO_ALINEADA
          : HORA_INICIO_ALINEADA;

        // Procesar tareas no flexibles sin horario no procesadas (con su duración exacta)
        for (const tareaNoFlexible of tareasNoFlexiblesSinHorario) {
          if (!tareasFlexiblesProcesadas.has(tareaNoFlexible.id)) {
            const duracionExacta = tareaNoFlexible.baseDurationMinutes;
            const taskEndTime = addMinutesToTime(tiempoFinal, duracionExacta);

            if (taskEndTime > HORA_FIN) {
              warnings.push(`La tarea "${tareaNoFlexible.name}" excede la hora de fin del día.`);
            }

            const formattedAiDuration = duracionExacta >= 60
              ? `${Math.floor(duracionExacta / 60).toString().padStart(2, '0')}:${(duracionExacta % 60).toString().padStart(2, '0')}`
              : `00:${(duracionExacta % 60).toString().padStart(2, '0')}`;

            updatedTasks.push({
              ...tareaNoFlexible,
              startTime: tiempoFinal,
              endTime: taskEndTime,
              aiDuration: formattedAiDuration,
            });

            tiempoFinal = taskEndTime;
          }
        }
        
        // Procesar tareas flexibles no procesadas
        for (const tareaFlexible of tareasFlexibles) {
          if (!tareasFlexiblesProcesadas.has(tareaFlexible.id)) {
            const duracionRestante = duracionesFlexibles[tareaFlexible.id] ?? 10; // Mínimo 10 minutos
            const taskEndTime = addMinutesToTime(tiempoFinal, duracionRestante);
            
            const formattedAiDuration = duracionRestante >= 60
              ? `${Math.floor(duracionRestante / 60).toString().padStart(2, '0')}:${(duracionRestante % 60).toString().padStart(2, '0')}`
              : `00:${(duracionRestante % 60).toString().padStart(2, '0')}`;

            updatedTasks.push({
              ...tareaFlexible,
              startTime: tiempoFinal,
              endTime: taskEndTime,
              aiDuration: formattedAiDuration,
            });

            tiempoFinal = taskEndTime;
          }
        }

        // Ordenar tareas finales por hora de inicio para mantener continuidad
        updatedTasks.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        // --- 5. Calcular tiempo libre ---
        const totalAvailableMinutes = calculateTimeDifferenceInMinutes(HORA_INICIO_ALINEADA, HORA_FIN);
        const totalOccupiedMinutes = updatedTasks.reduce((sum, task) => {
          return sum + parseDurationToMinutes(task.aiDuration || task.baseDuration);
        }, 0);
        const freeTimeMinutes = Math.max(0, totalAvailableMinutes - totalOccupiedMinutes);
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

        console.log("🚀 ~ useAiSync ~ updatedUserData OOOOOOO:", updatedUserData.dayTasks)
        await handleUpdateUserData(updatedUserData);
        setFreeTime(newFreeTime);
        if (warnings.length > 0) {
          setAiTip({ message: warnings.join('\n'), type: 'warning' });
        } else {
          setAiTip({
            message: "Planificación local completa. ¡Revisa tu horario actualizado! Las tareas con horarios fijos se respetan completamente.",
            type: 'tip'
          });
        }
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
      validateFixedTasksTime,
    ]
  );

  const getAiAdvice = useCallback(
    async (tasks: DayTask[]) => {
      if (!userData) return null;

      try {
        const response = await fetch('/api/advice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tasks: tasks,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al obtener consejo de la IA');
        }

        const { advice } = await response.json();
        return advice;
      } catch (error) {
        console.error("Error getting AI advice:", error);
        showNotification("Error al obtener consejo de la IA.", "error");
        return null;
      }
    },
    [userData, showNotification]
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
    getAiAdvice,
  };
};