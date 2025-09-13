import { useState, useCallback, useRef, useEffect } from "react";
import { DayTask, UserData } from "../types";

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
  }, [userData?.endOfDay, tempEndOfDay]);

  const recalculateCurrentDayTask = useCallback((tasks: DayTask[]): DayTask[] => {
    const firstPendingIndex = tasks.findIndex((task) => !task.completed);
    return tasks.map((task, index) => ({
      ...task,
      isCurrent: index === firstPendingIndex,
    }));
  }, []);

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

      setIsSyncing(true);
      try {
        const now = new Date();
        const userTime = now.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
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
    [userData, handleUpdateUserData, tempEndOfDay, showNotification, recalculateCurrentDayTask]
  );

  const handleUpdateAiDuration = useCallback(
    async (taskId: number, newAiDuration: string) => {
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

  const handleSetEndOfDay = useCallback(
    async () => {
      if (!userData || !tempEndOfDay) return;
      const prevUserData = { ...userData }; // Necesario para rollback si hay error en DB
      try {
        const updatedUserData = { ...userData, endOfDay: tempEndOfDay };
        await handleUpdateUserData(updatedUserData);
        showNotification("Hora de fin del día actualizada.", "success");
        syncWithAI({ endOfDay: tempEndOfDay });
      } catch (error) {
        console.error("Error en handleSetEndOfDay:", error);
        // Revertir cambios en UI si hay error en DB
        await handleUpdateUserData(prevUserData);
        showNotification(
          "Error al actualizar la hora de fin del día. Los cambios han sido revertidos.",
          "error"
        );
      }
    },
    [userData, tempEndOfDay, handleUpdateUserData, showNotification, syncWithAI]
  );

  const handleStartDay = useCallback(() => {
    if (!userData) return;
    const generalTasksAsDay: DayTask[] = userData.generalTasks.map((task) => ({
      ...task,
      completed: false,
      isCurrent: false,
      aiDuration: "",
    }));
    syncWithAI({ tasks: generalTasksAsDay });
  }, [userData, syncWithAI]);

  return {
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
  };
};