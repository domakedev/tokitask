"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, firebaseInitializationError } from "../services/firebase";
import { getUserData, updateUserData } from "../services/firestoreService";
import { Page, DayTask, GeneralTask, BaseTask, UserData } from "../types";
// import { getUpdatedSchedule, getAiTip } from "./actions";

import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
// ... (resto de las importaciones)

// Helper function to call the schedule API
const getUpdatedSchedule = async (
  tasks: DayTask[],
  endOfDay: string
): Promise<{
  updatedTasks: DayTask[];
  freeTime: string | null;
  tip?: string;
}> => {
  try {
    // Obtener la hora actual del usuario en formato HH:mm
    const now = new Date();
    const userTime = now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const payload = { tasks, endOfDay, userTime };
    console.log("Enviando a /api/schedulexxxxx:", payload);
    const response = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error from /api/scheduleyyyyyy:", errorData);
      throw new Error("Failed to fetch updated schedule");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching updated schedule44:", error);
    throw error;
  }
};

// Eliminado fetchAiTip y el efecto asociado, ahora el tip se actualiza solo con syncWithAI
import Icon from "../components/Icon";
import TaskModal from "../components/AddTaskModal";
import ConfirmationModal from "../components/ConfirmationModal";
import NotificationToast from "../components/NotificationToast";
import TaskList from "../components/TaskList";
import AiTipCard from "../components/AiTipCard";
import FreeTimeCard from "../components/FreeTimeCard";
import FirebaseErrorScreen from "../components/FirebaseErrorScreen";

// Helper function to recalculate the 'isCurrent' flag for day tasks
const recalculateCurrentDayTask = (tasks: DayTask[]): DayTask[] => {
  const firstPendingIndex = tasks.findIndex((task) => !task.completed);
  return tasks.map((task, index) => ({
    ...task,
    isCurrent: index === firstPendingIndex,
  }));
};

const CurrentDate: React.FC = () => {
  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      const dateString = now.toLocaleDateString("es-ES", dateOptions);
      const timeString = now.toLocaleTimeString("es-ES", timeOptions);
      setDateTime(`${dateString} | ${timeString}`);
    }, 1000);

    return () => clearInterval(timer); // Cleanup on component unmount
  }, []);

  return <p className="text-sm text-slate-400">{dateTime}</p>;
};

const RemainingTime: React.FC<{ endOfDay: string }> = ({ endOfDay }) => {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const calculateRemaining = () => {
      const now = new Date();
      const end = new Date();
      const [hours, minutes] = endOfDay.split(":").map(Number);
      end.setHours(hours, minutes, 0, 0);

      if (end < now) {
        setRemaining("Día finalizado");
        return;
      }

      let diff = end.getTime() - now.getTime();

      const h = Math.floor(diff / (1000 * 60 * 60));
      diff -= h * 1000 * 60 * 60;
      const m = Math.floor(diff / (1000 * 60));

      setRemaining(`${h}h ${m}m`);
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [endOfDay]);

  return <p className="font-semibold text-slate-400">{remaining}</p>;
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(Page.Day);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<BaseTask | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<BaseTask | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [freeTime, setFreeTime] = useState<string | null>(null);
  const [tempEndOfDay, setTempEndOfDay] = useState<string>("");

  const router = useRouter();
  const lastSyncRef = useRef<Date | null>(null);

  useEffect(() => {
    if (userData) {
      setTempEndOfDay(userData.endOfDay);
    }
  }, [userData?.endOfDay]);

  const showNotification = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setNotification({ message, type });
    },
    []
  );

  const handleUpdateUserData = useCallback(
    async (newUserData: Partial<UserData>) => {
      if (user) {
        const prevUserData = userData ? ({ ...userData } as UserData) : null;
        // Immediately update the local state for a responsive UI
        const updatedData = { ...userData, ...newUserData } as UserData;
        setUserData(updatedData);
        try {
          // Then, persist the full updated data to Firestore
          await updateUserData(user.uid, updatedData);
        } catch (error) {
          if (prevUserData) setUserData(prevUserData);
          showNotification(
            "Error al actualizar los datos. No se guardó en la base de datos.",
            "error"
          );
          throw new Error("Error updating user data");
        }
      }
    },
    [user, userData, showNotification]
  );

  const syncWithAI = useCallback(
    async (options?: { endOfDay?: string; tasks?: DayTask[] }) => {
      if (!userData) return;

      const tasksForSync = options?.tasks || userData.dayTasks;
      // Usar SIEMPRE el valor más reciente de endOfDay
      const endOfDayForSync =
        options?.endOfDay ?? tempEndOfDay ?? userData.endOfDay;

      // Usar los campos correctos para enviar a la IA
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
        // Si todas las tareas están completadas, actualiza la DB con el endOfDay más reciente
        await handleUpdateUserData({
          ...userData,
          dayTasks: tasksForSync,
          endOfDay: endOfDayForSync,
        });
        setFreeTime(null); // O calcula el tiempo restante si es necesario
        return;
      }

      setIsSyncing(true);
      try {
        const {
          updatedTasks,
          freeTime: newFreeTime,
          tip,
        } = await getUpdatedSchedule(tasksToPlan, endOfDayForSync);

        // Mezcla la respuesta de la IA con los datos originales de las tareas para preservar todos los campos
        const mappedTasks = updatedTasks.map((aiTask) => {
          const originalTask = tasksToPlan.find((t) => t.id === aiTask.id);
          return {
            ...originalTask,
            ...aiTask,
          };
        });

        const completedOriginalTasks = tasksForSync.filter((t) => t.completed);
        const finalTasks = recalculateCurrentDayTask([
          ...completedOriginalTasks,
          ...mappedTasks,
        ]);

        const updatedUserData = {
          ...userData,
          dayTasks: finalTasks,
          endOfDay: endOfDayForSync,
        };

        await handleUpdateUserData(updatedUserData);
        setFreeTime(newFreeTime);
        setAiTip(tip || null); // <-- Ahora se establece el tip de IA correctamente
        showNotification("Horario actualizado con IA.", "success");
        lastSyncRef.current = new Date();
      } catch (error) {
        console.error("Error syncing with AI----240:", error);
        showNotification("Error al sincronizar con la IA.", "error");
        throw new Error("Error syncing with AI 244");
      } finally {
        setIsSyncing(false);
      }
    },
    [userData, handleUpdateUserData, tempEndOfDay, showNotification]
  );

  // Eliminada la función fetchAiTip, el tip se actualiza solo con syncWithAI

  useEffect(() => {
    if (firebaseInitializationError) {
      setLoading(false);
      return;
    }

    if (!auth) {
      // Handle the case where auth is not initialized
      setAuthError("Error de autenticación.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        try {
          const data = await getUserData(currentUser.uid);
          setUserData(data);
          if (data && data.dayTasks) {
            setFreeTime(null); // Reset free time on user load
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setAuthError("No se pudieron cargar los datos del usuario.");
          throw new Error("Error unsubscribe user data");
        }
      } else {
        setUser(null);
        setUserData(null);
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Eliminado el efecto automático de sincronización con IA para evitar reaparición de tareas eliminadas

  const handleSignOut = async () => {
    if (!auth) {
      console.error("Sign Out Error: Firebase auth is not initialized.");
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign Out Error:", error);
    }
  };

  // Actualiza el tiempo organizado por IA en la tarea y en la DB
  const handleUpdateAiDuration = useCallback(
    async (taskId: number, newAiDuration: string) => {
      if (!userData) return;
      const prevUserData = { ...userData };
      try {
        const updatedTasks = userData.dayTasks.map((t) =>
          t.id === taskId ? { ...t, aiDuration: newAiDuration } : t
        );
        const updatedUserData = { ...userData, dayTasks: updatedTasks };
        setUserData(updatedUserData);
        await updateUserData(userData.uid, updatedUserData);
      } catch (error) {
        console.error("Error en handleUpdateAiDuration:", error);
        setUserData(prevUserData);
        showNotification(
          "Error al actualizar el tiempo de IA. No se guardó en la base de datos.",
          "error"
        );
      }
    },
    [userData, showNotification]
  );

  const handleSaveTask = async (task: BaseTask | Omit<BaseTask, "id">) => {
    if (!userData) return;
    let updatedUserData: UserData;
    const prevUserData = { ...userData };
    try {
      if (currentPage === Page.Day) {
        const updatedTasks =
          "id" in task
            ? userData.dayTasks.map((t) =>
                t.id === (task as BaseTask).id ? { ...t, ...task } : t
              )
            : [
                ...userData.dayTasks,
                {
                  ...task,
                  id: Date.now(),
                  completed: false,
                  isCurrent: false,
                } as DayTask,
              ];
        updatedUserData = {
          ...userData,
          dayTasks: recalculateCurrentDayTask(updatedTasks as DayTask[]),
        };
        setUserData(updatedUserData);
      } else {
        const updatedTasks =
          "id" in task
            ? userData.generalTasks.map((t) =>
                t.id === (task as BaseTask).id ? { ...t, ...task } : t
              )
            : [
                ...userData.generalTasks,
                {
                  ...task,
                  id: Date.now(),
                  completed: false,
                  baseDuration: task.baseDuration || "",
                } as GeneralTask,
              ];
        updatedUserData = { ...userData, generalTasks: updatedTasks };
        setUserData(updatedUserData);
      }
      await handleUpdateUserData(updatedUserData);
      setModalOpen(false);
      setEditingTask(null);
      showNotification(
        "id" in task ? "Tarea actualizada." : "Tarea añadida correctamente.",
        "success"
      );
    } catch (error) {
      console.error("Error en handleSaveTask:", error);
      setUserData(prevUserData);
      showNotification(
        "Error al guardar la tarea. No se guardó en la base de datos.",
        "error"
      );
    }
  };

  const handleToggleComplete = async (taskId: number) => {
    if (!userData) return;
    const prevUserData = { ...userData };
    try {
      if (currentPage === Page.Day) {
        const updatedTasks = userData.dayTasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        const updatedUserData = {
          ...userData,
          dayTasks: recalculateCurrentDayTask(updatedTasks),
        };
        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
        showNotification("Estado de la tarea actualizado.", "success");
      } else {
        const updatedTasks = userData.generalTasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        const updatedUserData = { ...userData, generalTasks: updatedTasks };
        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
        showNotification("Estado de la tarea actualizado.", "success");
      }
    } catch (error) {
      console.error("Error en handleToggleComplete:", error);
      setUserData(prevUserData);
      showNotification(
        "Error al actualizar el estado de la tarea. No se guardó en la base de datos.",
        "error"
      );
    }
  };

  const handleDeleteTask = (taskId: number) => {
    const task = [
      ...(userData?.dayTasks || []),
      ...(userData?.generalTasks || []),
    ].find((t) => t.id === taskId);
    if (task) {
      setTaskToDelete(task);
      setShowConfirmation(true);
    }
  };

  const confirmDelete = async () => {
    if (!userData || !taskToDelete) return;
    const prevUserData = { ...userData };
    try {
      if (currentPage === Page.Day) {
        const updatedTasks = userData.dayTasks.filter(
          (t) => t.id !== taskToDelete.id
        );
        const updatedUserData = {
          ...userData,
          dayTasks: recalculateCurrentDayTask(updatedTasks),
        };
        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
        setShowConfirmation(false);
        setTaskToDelete(null);
        showNotification("Tarea eliminada.", "success");
      } else {
        const updatedTasks = userData.generalTasks.filter(
          (t) => t.id !== taskToDelete.id
        );
        const updatedUserData = { ...userData, generalTasks: updatedTasks };
        setUserData(updatedUserData);
        await handleUpdateUserData(updatedUserData);
        setShowConfirmation(false);
        setTaskToDelete(null);
        showNotification("Tarea eliminada.", "success");
      }
    } catch (error) {
      console.error("Error en confirmDelete:", error);
      setUserData(prevUserData);
      setShowConfirmation(false);
      setTaskToDelete(null);
      showNotification(
        "Error al eliminar la tarea. No se guardó en la base de datos.",
        "error"
      );
    }
  };

  const handleEditTask = (taskId: number) => {
    const task = [
      ...(userData?.dayTasks || []),
      ...(userData?.generalTasks || []),
    ].find((t) => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setModalOpen(true);
    }
  };

  const handleReorderTasks = async (
    reorderedTasks: (DayTask | GeneralTask)[]
  ) => {
    if (!userData) return;
    const prevUserData = { ...userData };
    try {
      let updatedUserData: UserData;
      if (currentPage === Page.Day) {
        updatedUserData = {
          ...userData,
          dayTasks: recalculateCurrentDayTask(reorderedTasks as DayTask[]),
        };
      } else {
        updatedUserData = {
          ...userData,
          generalTasks: reorderedTasks as GeneralTask[],
        };
      }
      setUserData(updatedUserData);
      await handleUpdateUserData(updatedUserData);
      // No mostramos notificación para que el reorden sea más fluido
    } catch (error) {
      console.error("Error en handleReorderTasks:", error);
      setUserData(prevUserData);
      showNotification(
        "Error al reordenar las tareas. No se guardó en la base de datos.",
        "error"
      );
    }
  };

  const handleSetEndOfDay = async () => {
    if (!userData || !tempEndOfDay) return;
    const prevUserData = { ...userData };
    try {
      const updatedUserData = { ...userData, endOfDay: tempEndOfDay };
      setUserData(updatedUserData);
      await handleUpdateUserData(updatedUserData);
      showNotification("Hora de fin del día actualizada.", "success");
      syncWithAI({ endOfDay: tempEndOfDay });
    } catch (error) {
      console.error("Error en handleSetEndOfDay:", error);
      setUserData(prevUserData);
      showNotification(
        "Error al actualizar la hora de fin del día. No se guardó en la base de datos.",
        "error"
      );
    }
  };

  const handleStartDay = () => {
    setShowConfirmation(true);
    setTaskToDelete(null); // No es una tarea específica, es para confirmar el inicio del día
  };

  const confirmStartDay = async () => {
    if (!userData) return;
    // Genera el plan del día usando la plantilla general
    const generalTasksAsDay: DayTask[] = userData.generalTasks.map((task) => ({
      ...task,
      completed: false,
      isCurrent: false,
      aiDuration: "",
    }));
    try {
      await syncWithAI({ tasks: generalTasksAsDay });
      setShowConfirmation(false);
      showNotification("Horario generado con IA.", "success");
    } catch (error: unknown) {
      console.log("🚀 ~ confirmStartDay ~ error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al generar el horario con IA.";
      showNotification(errorMessage, "error");
      setShowConfirmation(false);
    }
  };

  // Eliminado el efecto que llamaba a fetchAiTip, ahora el tip se actualiza solo con syncWithAI

  // Mensajes animados para el modal de IA
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

  if (firebaseInitializationError) {
    return <FirebaseErrorScreen />;
  }

  if (!user || !userData) {
    return null; // Or a loading spinner, while redirecting
  }

  return (
    <div className="max-w-2xl mx-auto pb-28">
      {currentPage === Page.Day && (
        <div>
          <header className="p-4 sm:p-6 space-y-4 sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-white">Mi Día</h1>
                  <CurrentDate />
                </div>
                <div className="text-right">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-1 sm:space-y-0">
                    <div>
                      <p className="text-xs text-slate-400">Fin del día</p>
                      <p className="font-semibold text-emerald-400">
                        {userData.endOfDay}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Tiempo restante</p>
                      <RemainingTime endOfDay={userData.endOfDay} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center items-center sm:space-x-3 gap-2">
              <button
                onClick={handleStartDay}
                disabled={isSyncing || userData.generalTasks.length === 0}
                className="flex-1 w-full bg-emerald-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clonar Horario General
              </button>
              <button
                onClick={() => syncWithAI()}
                disabled={isSyncing || userData.dayTasks.length === 0}
                className="flex-1 w-full text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 transition-transform transform disabled:opacity-50 disabled:cursor-not-allowed border-none animate-float animate-gradient"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  boxShadow:
                    "0 4px 16px 0 rgba(0, 212, 255, 0.15), 0 1.5px 6px 0 rgba(16, 185, 129, 0.12)",
                }}
              >
                <span
                  className="absolute inset-0 z-0 animate-gradient"
                  style={{
                    background:
                      "linear-gradient(270deg, #22d3ee, #34d399, #2563eb, #22d3ee)",
                    backgroundSize: "600% 600%",
                    filter: "blur(0.5px)",
                    opacity: 0.95,
                  }}
                />
                <span className="relative z-10">
                  {isSyncing ? "Calculando..." : "Organizar tiempos con IA"}
                </span>
              </button>
              <style jsx global>{`
                @keyframes float {
                  0% {
                    transform: translateY(0);
                  }
                  50% {
                    transform: translateY(-6px);
                  }
                  100% {
                    transform: translateY(0);
                  }
                }
                .animate-float {
                  animation: float 2.2s ease-in-out infinite;
                }
                @keyframes gradientMove {
                  0% {
                    background-position: 0% 50%;
                  }
                  50% {
                    background-position: 100% 50%;
                  }
                  100% {
                    background-position: 0% 50%;
                  }
                }
                .animate-gradient {
                  animation: gradientMove 20s ease-in-out infinite;
                }
              `}</style>
            </div>
          </header>
          <main className="px-4 sm:px-6 mt-4">
            {userData.dayTasks.length > 0 ? (
              <>
                {aiTip && (
                  <div className="mb-4">
                    <AiTipCard tip={aiTip} onDismiss={() => setAiTip(null)} />
                  </div>
                )}
                <TaskList
                  tasks={userData.dayTasks}
                  isDaily={true}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteTask}
                  onReorder={handleReorderTasks}
                  onEdit={handleEditTask}
                  onUpdateAiDuration={handleUpdateAiDuration}
                />
                {freeTime && <FreeTimeCard duration={freeTime} />}
              </>
            ) : userData.generalTasks.length > 0 ? (
              <div className="text-center py-16 px-6 bg-slate-800/50 rounded-lg border border-slate-700">
                <Icon
                  name="sunrise"
                  className="h-12 w-12 text-slate-500 mx-auto"
                />
                <h2 className="mt-4 text-xl font-bold text-white">
                  ¿Listo para empezar?
                </h2>
                <p className="mt-2 text-slate-400">
                  Haz clic en{" "}
                  <span className="font-semibold text-emerald-400">
                    &quot;Empezar Día&quot;
                  </span>{" "}
                  para usar tu plantilla de &apos;Horario General&apos; y
                  generar tu plan de hoy con IA.
                </p>
              </div>
            ) : (
              <div className="text-center py-16 px-6 bg-slate-800/50 rounded-lg border border-slate-700">
                <Icon
                  name="clipboard-list"
                  className="h-12 w-12 text-slate-500 mx-auto"
                />
                <h2 className="mt-4 text-xl font-bold text-white">
                  Crea tu plantilla primero
                </h2>
                <p className="mt-2 text-slate-400">
                  Para poder generar un horario, primero necesitas crear una
                  plantilla de tareas en la sección &apos;General&apos;.
                </p>
                <button
                  onClick={() => setCurrentPage(Page.General)}
                  className="mt-6 bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-emerald-700"
                >
                  Ir a General para crear plantilla
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {currentPage === Page.General && (
        <div>
          <header className="p-4 sm:p-6 space-y-4 sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
            <div>
              <h1 className="text-2xl font-bold text-white">Horario General</h1>
              <p className="text-sm text-slate-400">
                Plantilla de tareas y configuración
              </p>
            </div>
          </header>
          <main className="px-4 sm:px-6 mt-4">
            <div className="mb-6 p-4 bg-slate-800 rounded-lg">
              <label
                htmlFor="end-of-day"
                className="block text-base font-semibold text-white mb-2"
              >
                Hora de finalización del día
              </label>
              <p className="text-sm text-slate-400 mb-3">
                La IA usará esta hora como límite para organizar tus tareas
                diarias.
              </p>
              <p className="text-xs text-slate-500 mb-3">
                Máximo se puede poner las 23:59.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="time"
                  id="end-of-day"
                  value={tempEndOfDay}
                  onChange={(e) => setTempEndOfDay(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleSetEndOfDay}
                  className="bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-emerald-700"
                >
                  Actualizar
                </button>
              </div>
            </div>
            <TaskList
              tasks={userData.generalTasks}
              isDaily={false}
              onDelete={handleDeleteTask}
              onReorder={handleReorderTasks}
              onEdit={handleEditTask}
              onToggleComplete={handleToggleComplete}
            />
          </main>
        </div>
      )}

      {currentPage === Page.Profile && (
        <div>
          <header className="p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-white">Perfil</h1>
          </header>
          <main className="px-4 sm:px-6 mt-4 space-y-6">
            {user && (
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-400">Sesión iniciada como:</p>
                <p className="font-semibold text-white truncate">
                  {user.email}
                </p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="w-full bg-rose-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-75 transition-colors"
            >
              Cerrar Sesión
            </button>
          </main>
        </div>
      )}

      {currentPage !== Page.Profile && (
        <>
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
        </>
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
          onConfirm={confirmStartDay}
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
