"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  auth,
  firebaseInitializationError,
} from "../services/firebase";
import {
  getUserData,
  updateUserData,
} from "../services/firestoreService";
import {
  Page,
  DayTask,
  GeneralTask,
  BaseTask,
  UserData,
} from "../types";
// import { getUpdatedSchedule, getAiTip } from "./actions";

import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
// ... (resto de las importaciones)

// Helper function to call the schedule API
const getUpdatedSchedule = async (
  tasks: DayTask[],
  endOfDay: string
): Promise<{ updatedTasks: DayTask[]; freeTime: string | null }> => {
  const response = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, endOfDay }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Error from /api/schedule:", errorData);
    throw new Error("Failed to fetch updated schedule");
  }
  return response.json();
};

// Helper function to call the tip API
const getAiTip = async (tasks: DayTask[]): Promise<string> => {
  const response = await fetch("/api/tip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks }),
  });
  if (!response.ok) {
    return "Recuerda tomar pequeños descansos para mantenerte enfocado y con energía.";
  }
  const data = await response.json();
  return data.tip;
};
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

  const showNotification = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setNotification({ message, type });
  };

  const handleUpdateUserData = useCallback(
    async (newUserData: Partial<UserData>) => {
      if (user) {
        // Immediately update the local state for a responsive UI
        const updatedData = { ...userData, ...newUserData } as UserData;
        setUserData(updatedData);
        // Then, persist the full updated data to Firestore
        await updateUserData(user.uid, updatedData);
      }
    },
    [user, userData] // Add userData to dependencies
  );

  const syncWithAI = useCallback(
    async (options?: { endOfDay?: string; tasks?: DayTask[] }) => {
      if (!userData) return;

  const tasksForSync = options?.tasks || userData.dayTasks;
      const endOfDayForSync = options?.endOfDay || userData.endOfDay;

      // Usar los campos correctos para enviar a la IA
      const tasksToPlan: DayTask[] = tasksForSync.length > 0
        ? tasksForSync.filter((t) => !t.completed).map(t => ({
            ...t,
            baseDuration: t.baseDuration,
            aiDuration: t.aiDuration ?? "",
          }))
        : [];

      if (tasksToPlan.length === 0) {
        // If all tasks are completed, just update the DB with the current state
        await handleUpdateUserData({ ...userData, dayTasks: tasksForSync });
        setFreeTime(null); // Or calculate remaining time if needed
        return;
      }

      setIsSyncing(true);
      try {
        const { updatedTasks, freeTime: newFreeTime } =
          await getUpdatedSchedule(tasksToPlan, endOfDayForSync);

        // Merge AI response with original task data to preserve all fields
        const mappedTasks = updatedTasks.map(aiTask => {
          const originalTask = tasksToPlan.find(t => t.id === aiTask.id);
          return {
            ...originalTask, // Keep all original properties like title, completed status etc.
            ...aiTask,       // Overwrite with new values from AI like startTime and aiDuration
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
        showNotification("Horario actualizado con IA.", "success");
        lastSyncRef.current = new Date();
      } catch (error) {
        console.error("Error syncing with AI:", error);
        showNotification("Error al sincronizar con la IA.", "error");
      } finally {
        setIsSyncing(false);
      }
    },
    [userData, handleUpdateUserData]
  );

  const fetchAiTip = useCallback(async () => {
    if (!userData || !userData.dayTasks || userData.dayTasks.length === 0) {
      setAiTip(null);
      return;
    }
    try {
      const tip = await getAiTip(userData.dayTasks);
      setAiTip(tip);
    } catch (error) {
      console.error("Error fetching AI tip:", error);
    }
  }, [userData]);

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

  const handleSaveTask = async (task: BaseTask | Omit<BaseTask, "id">) => {
    if (!userData) return;

    let updatedUserData: UserData;

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
      await handleUpdateUserData(updatedUserData);
      setModalOpen(false);
      setEditingTask(null);
      showNotification(
        "id" in task ? "Tarea actualizada." : "Tarea añadida correctamente.",
        "success"
      );
      // Sincroniza con IA si se añadió una nueva tarea en Mi Día
      // if (!("id" in task)) {
      //   setIsSyncing(true);
      //   try {
      //     const { updatedTasks, freeTime: newFreeTime } = await getUpdatedSchedule(updatedUserData.dayTasks, userData.endOfDay);
      //     setUserData({ ...userData, dayTasks: updatedTasks });
      //     setFreeTime(newFreeTime);
      //   } catch (error) {
      //     console.error("Error actualizando horario con IA tras añadir tarea:", error);
      //   } finally {
      //     setIsSyncing(false);
      //   }
      // }
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
                baseDuration: task.baseDuration || ""
              } as GeneralTask,
            ];
      updatedUserData = { ...userData, generalTasks: updatedTasks };
    }

    await handleUpdateUserData(updatedUserData);
    setModalOpen(false);
    setModalOpen(false);
    setEditingTask(null);
    showNotification(
      "id" in task ? "Tarea actualizada." : "Tarea añadida correctamente.",
      "success"
    );

    if (currentPage === Page.Day) {
    }
  };

  const handleToggleComplete = async (taskId: number) => {
    if (!userData) return;

    if (currentPage === Page.Day) {
      const updatedTasks = userData.dayTasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      // Actualiza el estado local y la DB
      const updatedUserData = {
        ...userData,
        dayTasks: recalculateCurrentDayTask(updatedTasks),
      };
      setUserData(updatedUserData);
      await handleUpdateUserData(updatedUserData);
      showNotification("Estado de la tarea actualizado.", "success");
      // No llamar a la IA
    } else {
      // For general tasks, just update the state and DB
      const updatedTasks = userData.generalTasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      const updatedUserData = { ...userData, generalTasks: updatedTasks };
      await handleUpdateUserData(updatedUserData);
      showNotification("Estado de la tarea actualizado.", "success");
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

    if (currentPage === Page.Day) {
      const updatedTasks = userData.dayTasks.filter(
        (t) => t.id !== taskToDelete.id
      );
      // Actualiza el estado local y la DB, pero NO sincroniza con IA
      const updatedUserData = {
        ...userData,
        dayTasks: recalculateCurrentDayTask(updatedTasks),
      };
      await handleUpdateUserData(updatedUserData);
      setShowConfirmation(false);
      setTaskToDelete(null);
      showNotification("Tarea eliminada.", "success");
      // NO llamar a syncWithAI
    } else {
      const updatedTasks = userData.generalTasks.filter(
        (t) => t.id !== taskToDelete.id
      );
      await handleUpdateUserData({ ...userData, generalTasks: updatedTasks });
      setShowConfirmation(false);
      setTaskToDelete(null);
      showNotification("Tarea eliminada.", "success");
      // NO llamar a syncWithAI
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

    await handleUpdateUserData(updatedUserData);
    // No mostramos notificación para que el reorden sea más fluido
  };

  const handleSetEndOfDay = async () => {
    if (!userData || !tempEndOfDay) return;
    const updatedUserData = { ...userData, endOfDay: tempEndOfDay };
    // Optimistically update UI
    setUserData(updatedUserData);
    showNotification("Hora de fin del día actualizada.", "success");
    syncWithAI({ endOfDay: tempEndOfDay });
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
    await syncWithAI({ tasks: generalTasksAsDay });
    setShowConfirmation(false);
    showNotification("Horario generado con IA.", "success");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Icon
          name="loader"
          className="h-12 w-12 animate-spin text-emerald-400"
        />
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
            <div className="flex items-center space-x-3">
              <button
                onClick={handleStartDay}
                disabled={isSyncing || userData.generalTasks.length === 0}
                className="flex-1 bg-emerald-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Empezar Día
              </button>
              <button
                onClick={() => syncWithAI()}
                disabled={isSyncing || userData.dayTasks.length === 0}
                className="flex-1 bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? "Calculando..." : "Organizar Horario con IA"}
              </button>
            </div>
          </header>
          <main className="px-4 sm:px-6 mt-4">
            {userData.dayTasks.length > 0 ? (
              <>
                {aiTip && (
                  <AiTipCard tip={aiTip} onDismiss={() => setAiTip(null)} />
                )}
                <TaskList
                  tasks={userData.dayTasks}
                  isDaily={true}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteTask}
                  onReorder={handleReorderTasks}
                  onEdit={handleEditTask}
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
                  para usar tu plantilla de &apos;Horario General&apos; y generar tu plan
                  de hoy con IA.
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
        <button
          onClick={() => setModalOpen(true)}
          className="fixed bottom-24 right-6 bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75 transition-transform transform hover:scale-110 z-20"
        >
          <Icon name="plus" />
        </button>
      )}

      <BottomNav activePage={currentPage} onNavigate={setCurrentPage} />

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
          <Icon name="loader" className="h-16 w-16 animate-spin text-emerald-400 mb-6" />
          <p className="text-lg text-white font-semibold">Procesando tu horario con IA...</p>
          <p className="text-sm text-slate-300 mt-2">Esto puede tardar unos segundos.</p>
        </div>
      )}
    </div>
  );
}
