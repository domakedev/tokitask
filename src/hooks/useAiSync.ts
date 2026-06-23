import { useState, useCallback, useRef, useEffect } from "react";
import { DayTask, UserData, WEEKDAY_LABELS, Priority } from "../types";
import {
  getCurrentWeekDay,
  calculateTimeDifferenceInMinutes,
  addMinutesToTime,
  parseDurationToMinutes,
  normalizeTime,
} from "../utils/dateUtils";
import { generateTaskId } from "../utils/idGenerator";
import { toast } from "react-toastify";
import { useAiUsage } from "./useAiUsage";

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
  const { runGuardedAi } = useAiUsage();

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
    async (options?: { endOfDay?: string; tasks?: DayTask[]; force?: boolean }) => {
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
        // Gate anti-abuso + caché. El hash de caché NO incluye userTime (cambia
        // cada minuto); con las mismas tareas y fin de día reutiliza la respuesta.
        const result = await runGuardedAi<{
          updatedTasks: DayTask[];
          freeTime: string | null;
          tip: string | null;
        }>({
          feature: "schedule",
          input: { tasks: tasksToPlan, endOfDay: endOfDayForSync },
          force: options?.force,
          request: async () => {
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

            return await response.json();
          },
        });

        if (!result.ok) {
          showNotification(result.message || "No se pudo usar la IA.", "error");
          return;
        }

        const {
          updatedTasks,
          freeTime: newFreeTime,
          tip,
        } = result.data!;

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
        if (result.fromCache) {
          showNotification(
            'Mostrando el último horario generado. Usa "Intentar de nuevo" para regenerarlo.',
            "success"
          );
        } else {
          const left = result.remaining?.feature ?? 0;
          showNotification(
            `Horario actualizado con IA. Te quedan ${left} usos hoy.`,
            "success"
          );
        }
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
    [userData, handleUpdateUserData, tempEndOfDay, showNotification, recalculateCurrentDayTask, validateFixedTasksTime, parseDurationToMinutes, runGuardedAi]
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

        // Deduplicar por progressId: si una corrida previa dividió una tarea flexible
        // en varios segmentos, colapsarlos en una sola tarea antes de replanificar.
        const progressIdsVistos = new Set<string>();
        const tareas = tasksForSync
          .filter((t) => !t.completed)
          .filter((t) => {
            const key = t.progressId || t.id;
            if (progressIdsVistos.has(key)) return false;
            progressIdsVistos.add(key);
            return true;
          })
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
        const passedTasks: DayTask[] = [];

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
            if (userTime >= end && !(end < start)) {
              // Mantener tarea visible pero con duración cero para no interferir
              console.log("🚀 ~ useAiSync ~ tarea:", tarea.name)
              passedTasks.push({ ...tarea, aiDuration: "00:00" });
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

        // --- FASE 3: Asignar DURACIONES a las flexibles, ponderado por PRIORIDAD ---
        // Se reparte el presupuesto por tiers (Muy importante → Importante → Opcional).
        // Si falta tiempo, las opcionales pueden quedar en 0 ("no realizable") antes de
        // recortar a las importantes.
        const BLOCK_SIZE = 5; // minutos (múltiplos de 5, igual que la IA)

        // Reparte `budget` minutos entre `grupo` proporcional a baseDuration, en bloques,
        // sin exceder la baseDuration de cada tarea (método de mayor resto / Hamilton).
        const repartirEnBloques = (
          grupo: { id: string; baseDurationMinutes: number }[],
          budget: number
        ): Record<string, number> => {
          const res: Record<string, number> = {};
          grupo.forEach((t) => (res[t.id] = 0));
          const totalBase = grupo.reduce((s, t) => s + t.baseDurationMinutes, 0);
          const totalBloques = Math.floor(budget / BLOCK_SIZE);
          if (totalBloques <= 0 || totalBase <= 0) return res;

          const items = grupo.map((t) => {
            const ideal = totalBloques * (t.baseDurationMinutes / totalBase);
            return {
              id: t.id,
              maxBloques: Math.max(1, Math.round(t.baseDurationMinutes / BLOCK_SIZE)),
              asignados: Math.floor(ideal),
              fraccion: ideal - Math.floor(ideal),
            };
          });

          let restantes = totalBloques - items.reduce((s, i) => s + i.asignados, 0);
          [...items]
            .sort((a, b) => b.fraccion - a.fraccion)
            .forEach((it) => {
              if (restantes > 0) {
                it.asignados += 1;
                restantes -= 1;
              }
            });

          let surplus = 0;
          items.forEach((it) => {
            if (it.asignados > it.maxBloques) {
              surplus += it.asignados - it.maxBloques;
              it.asignados = it.maxBloques;
            }
          });
          for (const it of items) {
            if (surplus <= 0) break;
            const cap = it.maxBloques - it.asignados;
            if (cap > 0) {
              const add = Math.min(surplus, cap);
              it.asignados += add;
              surplus -= add;
            }
          }
          items.forEach((it) => (res[it.id] = it.asignados * BLOCK_SIZE));
          return res;
        };

        const duracionesFlexibles: { [id: string]: number } = {};
        tareasFlexibles.forEach((t) => (duracionesFlexibles[t.id] = 0));

        // Tiers en orden de protección: Muy importante → Importante → Opcional
        const tiersPorPrioridad = [Priority.High, Priority.Medium, Priority.Low].map(
          (p) => tareasFlexibles.filter((t) => (t.priority ?? Priority.Medium) === p)
        );

        let presupuestoFlex = tiempoDisponibleParaFlexibles;
        for (const tier of tiersPorPrioridad) {
          if (tier.length === 0) continue;
          const sumaBase = tier.reduce((s, t) => s + t.baseDurationMinutes, 0);
          const budgetTier = Math.min(presupuestoFlex, sumaBase);
          const reparto = repartirEnBloques(
            tier.map((t) => ({ id: t.id, baseDurationMinutes: t.baseDurationMinutes })),
            budgetTier
          );
          let usado = 0;
          tier.forEach((t) => {
            duracionesFlexibles[t.id] = reparto[t.id] ?? 0;
            usado += duracionesFlexibles[t.id];
          });
          presupuestoFlex = Math.max(0, presupuestoFlex - usado);
        }

        // --- FASE 4: Construir el horario recorriendo los slots EN ORDEN ---
        // Respeta el orden del usuario. Las flexibles pueden DIVIDIRSE entre slots
        // (p. ej. continuar después de una tarea fija). Las no-flexibles sin horario
        // necesitan un bloque contiguo.
        const updatedTasks: DayTask[] = [];

        const fmt = (mins: number) => {
          const m = Math.max(0, mins);
          return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60)
            .toString()
            .padStart(2, "0")}`;
        };

        type ColaItem = {
          task: (typeof tareas)[number];
          remaining: number;
          target: number;
          splittable: boolean;
          placed: boolean;
        };

        // Cola de colocables en orden de array (no-flexibles-sin-horario + flexibles).
        // Las fijas con horario van como anclas (slots isFixed), no entran aquí.
        const cola: ColaItem[] = tareas
          .filter((t) => t.flexibleTime !== false || !(t.startTime && t.endTime))
          .map((t) => {
            const splittable = t.flexibleTime !== false;
            const target = splittable
              ? duracionesFlexibles[t.id] ?? 0
              : t.baseDurationMinutes;
            return { task: t, remaining: target, target, splittable, placed: false };
          });

        const pushSegment = (item: ColaItem, start: string, mins: number): string => {
          const end = addMinutesToTime(start, mins);
          updatedTasks.push({
            ...item.task,
            // los segmentos de continuación llevan id único (mismo progressId)
            id: item.placed ? generateTaskId() : item.task.id,
            startTime: start,
            endTime: end,
            aiDuration: fmt(mins),
          });
          item.placed = true;
          item.remaining -= mins;
          return end;
        };

        for (const slot of timeSlots) {
          if (slot.isFixed && slot.task) {
            const dur =
              slot.task.startTime && slot.task.endTime
                ? calculateTimeDifferenceInMinutes(slot.task.startTime, slot.task.endTime)
                : parseDurationToMinutes(slot.task.baseDuration);
            updatedTasks.push({
              ...slot.task,
              startTime: slot.startTime,
              endTime: slot.endTime,
              aiDuration: fmt(dur),
            });
            continue;
          }

          // Slot libre: llenarlo con la cola, respetando el orden
          let slotTime = slot.startTime;
          let guard = 0;
          while (slotTime < slot.endTime && guard++ < 1000) {
            const libre = calculateTimeDifferenceInMinutes(slotTime, slot.endTime);
            if (libre <= 0) break;

            const head = cola.find((c) => c.remaining > 0);
            if (!head) break;

            if (head.splittable) {
              // Flexible: usa lo que quepa; si sobra, continúa en el siguiente slot
              slotTime = pushSegment(head, slotTime, Math.min(head.remaining, libre));
            } else if (head.remaining <= libre) {
              // No flexible: cabe entera en lo que queda del slot
              slotTime = pushSegment(head, slotTime, head.remaining);
            } else {
              // No flexible que no cabe entera: rellena el hueco con la próxima flexible
              // para no desperdiciar y deja la no-flexible para el siguiente slot.
              const flex = cola.find((c) => c.splittable && c.remaining > 0);
              if (!flex) break;
              slotTime = pushSegment(flex, slotTime, Math.min(flex.remaining, libre));
            }
          }
        }

        // --- FASE 5: Tareas que no entraron en ningún slot ---
        let tiempoFinal = updatedTasks.reduce(
          (max, t) => ((t.endTime || "") > max ? t.endTime || max : max),
          HORA_INICIO_ALINEADA
        );

        for (const item of cola) {
          if (item.remaining <= 0) continue;

          // Opcional que no alcanzó nada de tiempo → "no realizable" (0 min)
          if (
            item.splittable &&
            (item.task.priority ?? Priority.Medium) === Priority.Low &&
            !item.placed
          ) {
            updatedTasks.push({
              ...item.task,
              startTime: HORA_FIN,
              endTime: HORA_FIN,
              aiDuration: "00:00",
            });
            warnings.push(
              `Sin tiempo para "${item.task.name}" (opcional): queda como no realizable hoy.`
            );
            continue;
          }

          // Importantes (o ya iniciadas): se agregan al final aunque excedan el fin del día
          const start = tiempoFinal;
          const end = addMinutesToTime(start, item.remaining);
          updatedTasks.push({
            ...item.task,
            id: item.placed ? generateTaskId() : item.task.id,
            startTime: start,
            endTime: end,
            aiDuration: fmt(item.remaining),
          });
          if (end > HORA_FIN) {
            warnings.push(`La tarea "${item.task.name}" excede la hora de fin del día.`);
          }
          tiempoFinal = end;
          item.remaining = 0;
        }

        // Agregar tareas fijas ya vencidas (duración cero)
        updatedTasks.push(...passedTasks);

        // Ordenar por hora de inicio (numérico)
        const toMin = (t?: string) => {
          if (!t) return Number.MAX_SAFE_INTEGER;
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        };
        updatedTasks.sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

        // --- 5. Calcular tiempo libre ---
        const totalAvailableMinutes = calculateTimeDifferenceInMinutes(HORA_INICIO_ALINEADA, HORA_FIN);
        const totalOccupiedMinutes = updatedTasks.reduce((sum, task) => {
          return sum + parseDurationToMinutes(task.aiDuration || task.baseDuration);
        }, 0);
        const freeTimeMinutes = Math.max(0, totalAvailableMinutes - totalOccupiedMinutes);
        const newFreeTime = freeTimeMinutes > 0 ? `${freeTimeMinutes} min` : null;

        //console de los datos
        console.log("🚀 ~ useAiSync ~ HORA_INICIO_ALINEADA:", {HORA_INICIO_ALINEADA, 
        HORA_FIN, totalAvailableMinutes, totalOccupiedMinutes, freeTimeMinutes, newFreeTime
        })
        
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
    async (tasks: DayTask[], force?: boolean) => {
      if (!userData) return null;

      try {
        // Para el hash de caché solo importan nombre/estado/duración/prioridad
        // de las tareas (lo mismo que envía el endpoint).
        const cacheInput = tasks.map((t) => ({
          name: t.name,
          completed: t.completed,
          aiDuration: t.aiDuration,
          priority: t.priority,
        }));

        const result = await runGuardedAi<{ advice: string }>({
          feature: "advice",
          input: cacheInput,
          force,
          request: async () => {
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

            return await response.json();
          },
        });

        if (!result.ok) {
          showNotification(result.message || "No se pudo usar la IA.", "error");
          return null;
        }

        return result.data!.advice;
      } catch (error) {
        console.error("Error getting AI advice:", error);
        showNotification("Error al obtener consejo de la IA.", "error");
        return null;
      }
    },
    [userData, showNotification, runGuardedAi]
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