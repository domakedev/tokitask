"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import AiSyncOverlay from "../../../components/AiSyncOverlay";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Icon from "../../../components/Icon";
import LoadingScreen from "../../../components/LoadingScreen";
import { updateUserData } from "../../../services/firestoreService";
import { useAuthStore } from "../../../stores/authStore";
import { useScheduleStore } from "../../../stores/scheduleStore";
import {
  AiPlannerDay,
  AiPlannerMicrotask,
  AiPlannerPriority,
  AiPlannerState,
  AiPlannerTask,
  Page,
} from "../../../types";
import { generateTaskId } from "../../../utils/idGenerator";

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: BrowserSpeechRecognitionResult;
  };
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

interface AiPlannerApiTask {
  title: string;
  priority: AiPlannerPriority;
  estimatedMinutes: number;
  aiReason?: string;
  microtasks: Array<{
    title: string;
    estimatedMinutes: number;
  }>;
}

interface EditingTaskDraft {
  taskId: string;
  title: string;
  priority: AiPlannerPriority;
  estimatedMinutes: string;
  aiReason: string;
}

interface EditingMicrotaskDraft {
  taskId: string;
  microtaskId: string;
  title: string;
  estimatedMinutes: string;
}

interface NewMicrotaskDraft {
  taskId: string;
  title: string;
  estimatedMinutes: string;
}

type DeleteTarget =
  | { type: "task"; taskId: string; title: string }
  | { type: "microtask"; taskId: string; microtaskId: string; title: string };

type GeneratePlanMode = "create" | "append" | "replace";

const todayString = () => new Date().toLocaleDateString("en-CA");

const dateFromString = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (value: string, days: number) => {
  const date = dateFromString(value);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
};

const formatFullDate = (value: string) =>
  dateFromString(value).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatShortDate = (value: string) =>
  dateFromString(value).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

const formatDayTab = (value: string) =>
  dateFromString(value).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
  });

const getCurrentTime = () =>
  new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const getWeekDates = (anchorDate: string) => {
  const anchor = dateFromString(anchorDate);
  const dayIndex = anchor.getDay();
  const mondayOffset = (dayIndex + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date.toLocaleDateString("en-CA");
  });
};

const getRemainingLabel = (endOfDay: string) => {
  const now = new Date();
  const end = new Date();
  const [hours, minutes] = endOfDay.split(":").map(Number);
  end.setHours(hours || 0, minutes || 0, 0, 0);

  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Dia finalizado";

  const totalMinutes = Math.floor(diff / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
};

const isPastEndOfDay = (date: string, endOfDay: string) => {
  const today = todayString();
  if (date < today) return true;
  if (date > today) return false;
  return getRemainingLabel(endOfDay) === "Dia finalizado";
};

const getEmptyPlanner = (): AiPlannerState => ({ days: {} });

const getPendingTasks = (day?: AiPlannerDay) =>
  (day?.tasks || []).filter(
    (task) => !task.completed && !task.movedToDate && !task.archivedAt
  );

const isHistoricalTask = (task: AiPlannerTask) =>
  Boolean(task.movedToDate || task.archivedAt);

const isActivePendingTask = (task: AiPlannerTask) =>
  !task.completed && !isHistoricalTask(task);

const getProgress = (day?: AiPlannerDay) => {
  const tasks = day?.tasks || [];
  const totals = tasks.reduce(
    (acc, task) => {
      if (task.microtasks.length === 0) {
        acc.total += 1;
        if (task.completed) acc.done += 1;
        return acc;
      }

      acc.total += task.microtasks.length;
      acc.done += task.microtasks.filter((microtask) => microtask.completed).length;
      return acc;
    },
    { done: 0, total: 0 }
  );

  return {
    ...totals,
    percent: totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0,
  };
};

const normalizePriority = (priority: string | undefined): AiPlannerPriority => {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return "medium";
};

const priorityLabel: Record<AiPlannerPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const priorityClasses: Record<AiPlannerPriority, string> = {
  high: "bg-red-500/20 text-red-300 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-sky-500/20 text-sky-300 border-sky-500/30",
};

const parseEditableMinutes = (value: string, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(Math.round(parsed), 5), 480);
};

const reindexTasks = (tasks: AiPlannerTask[]) =>
  tasks.map((task, index) => ({ ...task, order: index }));

const reindexMicrotasks = (microtasks: AiPlannerMicrotask[]) =>
  microtasks.map((microtask, index) => ({ ...microtask, order: index }));

const buildPlannerTask = (
  task: AiPlannerApiTask,
  index: number,
  selectedDate: string,
  nowIso: string
): AiPlannerTask => {
  const microtasks = task.microtasks.length > 0
    ? task.microtasks
    : [{ title: task.title, estimatedMinutes: task.estimatedMinutes }];

  return {
    id: generateTaskId(),
    title: task.title.trim(),
    priority: normalizePriority(task.priority),
    estimatedMinutes: Math.max(5, Math.round(Number(task.estimatedMinutes) || 30)),
    order: index,
    completed: false,
    startedDate: selectedDate,
    assignedDate: selectedDate,
    movedFromDates: [],
    microtasks: microtasks.map((microtask, microtaskIndex) => ({
      id: generateTaskId(),
      title: microtask.title.trim(),
      estimatedMinutes: Math.max(5, Math.round(Number(microtask.estimatedMinutes) || 10)),
      order: microtaskIndex,
      completed: false,
    })),
    aiReason: task.aiReason,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

export default function AiPlanPage() {
  const user = useAuthStore((state) => state.user);
  const userData = useAuthStore((state) => state.userData);
  const setUserData = useAuthStore((state) => state.setUserData);
  const setCurrentPage = useScheduleStore((state) => state.setCurrentPage);

  const [selectedDate, setSelectedDate] = useState(todayString());
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [rolloverSourceDate, setRolloverSourceDate] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskDraft, setEditingTaskDraft] = useState<EditingTaskDraft | null>(null);
  const [editingMicrotaskDraft, setEditingMicrotaskDraft] = useState<EditingMicrotaskDraft | null>(null);
  const [newMicrotaskDraft, setNewMicrotaskDraft] = useState<NewMicrotaskDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [planActionPromptOpen, setPlanActionPromptOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [, setNowTick] = useState(0);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const planner = useMemo<AiPlannerState>(
    () => userData?.aiPlanner || getEmptyPlanner(),
    [userData?.aiPlanner]
  );

  const selectedDay = planner.days[selectedDate];
  const selectedTask = selectedDay?.tasks.find((task) => task.id === selectedTaskId) || null;
  const progress = useMemo(() => getProgress(selectedDay), [selectedDay]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const pendingRolloverCount = rolloverSourceDate
    ? getPendingTasks(planner.days[rolloverSourceDate]).length
    : 0;

  useEffect(() => {
    setCurrentPage(Page.AiPlan);
  }, [setCurrentPage]);

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick((value) => value + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userData) return;
    const initialDate = userData.aiPlanner?.selectedDate || todayString();
    setSelectedDate(initialDate);
  }, [userData]);

  useEffect(() => {
    setInputText(selectedDay?.sourceText || "");
  }, [selectedDate, selectedDay?.sourceText]);

  useEffect(() => {
    if (!userData?.aiPlanner?.days) return;

    const nextRollover = Object.values(userData.aiPlanner.days)
      .filter((day) => {
        const hasPending = getPendingTasks(day).length > 0;
        return hasPending && !day.rolloverPromptSeenAt && isPastEndOfDay(day.date, day.endOfDay);
      })
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    setRolloverSourceDate(nextRollover?.date || null);
  }, [userData?.aiPlanner]);

  const stopVoiceMeter = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setVoiceLevel(0);
  }, []);

  const startVoiceMeter = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      analyser.fftSize = 256;
      source.connect(analyser);
      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;

      const updateLevel = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let index = 0; index < dataArray.length; index += 1) {
          const value = (dataArray[index] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setVoiceLevel(Math.min(1, rms * 7));
        animationFrameRef.current = window.requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.warn("Voice meter unavailable:", error);
      setVoiceLevel(0.35);
    }
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopVoiceMeter();
    };
  }, [stopVoiceMeter]);

  const persistPlanner = useCallback(
    async (nextPlanner: AiPlannerState, successMessage?: string) => {
      if (!user || !userData) return;

      const previousUserData = userData;
      const updatedUserData = {
        ...userData,
        aiPlanner: nextPlanner,
      };

      setUserData(updatedUserData);

      try {
        await updateUserData(user.uid, { aiPlanner: nextPlanner });
        if (successMessage) toast.success(successMessage);
      } catch (error) {
        console.error("Error saving AI planner:", error);
        setUserData(previousUserData);
        toast.error("No se pudo guardar el Plan IA.");
      }
    },
    [setUserData, user, userData]
  );

  const handleSelectDate = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      setSelectedTaskId(null);
      setEditingTaskDraft(null);
      setEditingMicrotaskDraft(null);
      setNewMicrotaskDraft(null);
      setDeleteTarget(null);
      setPlanActionPromptOpen(false);
      setReplaceConfirmOpen(false);
      await persistPlanner({ ...planner, selectedDate: date });
    },
    [persistPlanner, planner]
  );

  const handleToggleListening = useCallback(() => {
    if (!speechSupported) {
      toast.info("Tu navegador no soporta dictado por microfono.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimTranscript("");
      stopVoiceMeter();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript("");
        startVoiceMeter();
      };
      recognition.onresult = (event) => {
        let transcript = "";
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const resultText = result?.[0]?.transcript?.trim();
          if (!resultText) continue;

          if (result.isFinal) {
            transcript += ` ${resultText}`;
          } else {
            interim += ` ${resultText}`;
          }
        }

        if (transcript.trim()) {
          setInputText((current) =>
            `${current}${current.trim() ? " " : ""}${transcript.trim()}`.trimStart()
          );
        }
        setInterimTranscript(interim.trim());
      };
      recognition.onerror = (event) => {
        const message =
          event.error === "not-allowed"
            ? "Permiso de microfono rechazado."
            : "No se pudo usar el microfono.";
        toast.error(message);
        setIsListening(false);
        setInterimTranscript("");
        stopVoiceMeter();
      };
      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
        stopVoiceMeter();
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Speech recognition error:", error);
      toast.error("No se pudo iniciar el dictado.");
      setIsListening(false);
      setInterimTranscript("");
      stopVoiceMeter();
    }
  }, [isListening, speechSupported, startVoiceMeter, stopVoiceMeter]);

  const generateAiPlan = useCallback(async (mode: GeneratePlanMode) => {
    if (!userData) return;
    const trimmedText = inputText.trim();

    if (!trimmedText) {
      toast.error("Escribe o dicta lo que tienes que hacer primero.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai-planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmedText,
          currentDate: selectedDate,
          today: todayString(),
          tomorrow: addDays(todayString(), 1),
          currentTime: getCurrentTime(),
          endOfDay: userData.endOfDay,
          existingTasks: selectedDay?.tasks || [],
          mode,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Error al generar el plan.";
        try {
          const errorData = JSON.parse(errorText) as { error?: string };
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (errorText.trim()) errorMessage = errorText.trim();
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const apiTasks = Array.isArray(data.tasks) ? (data.tasks as AiPlannerApiTask[]) : [];

      if (apiTasks.length === 0) {
        toast.error("La IA no devolvio tareas. Prueba con mas contexto.");
        return;
      }

      const nowIso = new Date().toISOString();
      const existingTasks = selectedDay?.tasks || [];
      const preservedTasks =
        mode === "replace"
          ? existingTasks.filter((task) => task.completed || isHistoricalTask(task))
          : mode === "append"
          ? existingTasks
          : [];
      const generatedTasks = apiTasks.map((task, index) =>
        buildPlannerTask(task, preservedTasks.length + index, selectedDate, nowIso)
      );
      const nextTasks = reindexTasks([...preservedTasks, ...generatedTasks]);
      const nextCoachMessages = Array.isArray(data.coachMessages)
        ? data.coachMessages.slice(0, 3)
        : [];

      const nextDay: AiPlannerDay = {
        date: selectedDate,
        sourceText: trimmedText,
        createdAt: selectedDay?.createdAt || nowIso,
        updatedAt: nowIso,
        endOfDay: userData.endOfDay,
        tasks: nextTasks,
        coachMessages:
          mode === "append"
            ? [...(selectedDay?.coachMessages || []), ...nextCoachMessages].slice(-3)
            : nextCoachMessages,
        rolloverPromptSeenAt: selectedDay?.rolloverPromptSeenAt,
      };

      setEditingTaskDraft(null);
      setEditingMicrotaskDraft(null);
      setNewMicrotaskDraft(null);
      setPlanActionPromptOpen(false);
      setReplaceConfirmOpen(false);
      await persistPlanner(
        {
          ...planner,
          selectedDate,
          days: {
            ...planner.days,
            [selectedDate]: nextDay,
          },
        },
        mode === "append"
          ? "Tareas agregadas al Plan IA."
          : mode === "replace"
          ? "Pendientes rehechos con IA."
          : "Plan IA generado."
      );
    } catch (error) {
      console.error("Error generating AI plan:", error);
      toast.error("No se pudo generar el plan con IA.");
    } finally {
      setIsGenerating(false);
    }
  }, [inputText, persistPlanner, planner, selectedDate, selectedDay, userData]);

  const handleGeneratePlan = useCallback(() => {
    if (!inputText.trim()) {
      toast.error("Escribe o dicta lo que tienes que hacer primero.");
      return;
    }

    if (selectedDay?.tasks.length) {
      setPlanActionPromptOpen(true);
      return;
    }

    void generateAiPlan("create");
  }, [generateAiPlan, inputText, selectedDay?.tasks.length]);

  const updateSelectedDay = useCallback(
    async (updater: (day: AiPlannerDay) => AiPlannerDay, successMessage?: string) => {
      if (!selectedDay) return;
      const nextDay = updater(selectedDay);
      await persistPlanner(
        {
          ...planner,
          days: {
            ...planner.days,
            [selectedDate]: nextDay,
          },
        },
        successMessage
      );
    },
    [persistPlanner, planner, selectedDate, selectedDay]
  );

  const startEditingTask = useCallback((task: AiPlannerTask) => {
    setEditingMicrotaskDraft(null);
    setNewMicrotaskDraft(null);
    setEditingTaskDraft({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      estimatedMinutes: String(task.estimatedMinutes),
      aiReason: task.aiReason || "",
    });
  }, []);

  const handleSaveTaskEdit = useCallback(async () => {
    if (!editingTaskDraft) return;

    const title = editingTaskDraft.title.trim();
    if (!title) {
      toast.error("La tarea necesita un titulo.");
      return;
    }

    const nowIso = new Date().toISOString();
    const estimatedMinutes = parseEditableMinutes(editingTaskDraft.estimatedMinutes, 30);
    await updateSelectedDay(
      (day) => ({
        ...day,
        updatedAt: nowIso,
        tasks: day.tasks.map((task) => {
          if (task.id !== editingTaskDraft.taskId || task.movedToDate || task.archivedAt) return task;

          return {
            ...task,
            title,
            priority: editingTaskDraft.priority,
            estimatedMinutes,
            aiReason: editingTaskDraft.aiReason.trim() || undefined,
            updatedAt: nowIso,
          };
        }),
      }),
      "Tarea actualizada."
    );
    setEditingTaskDraft(null);
  }, [editingTaskDraft, updateSelectedDay]);

  const startEditingMicrotask = useCallback((taskId: string, microtask: AiPlannerMicrotask) => {
    setEditingTaskDraft(null);
    setNewMicrotaskDraft(null);
    setEditingMicrotaskDraft({
      taskId,
      microtaskId: microtask.id,
      title: microtask.title,
      estimatedMinutes: String(microtask.estimatedMinutes),
    });
  }, []);

  const handleSaveMicrotaskEdit = useCallback(async () => {
    if (!editingMicrotaskDraft) return;

    const title = editingMicrotaskDraft.title.trim();
    if (!title) {
      toast.error("La microtarea necesita un titulo.");
      return;
    }

    const nowIso = new Date().toISOString();
    const estimatedMinutes = parseEditableMinutes(editingMicrotaskDraft.estimatedMinutes, 10);
    await updateSelectedDay(
      (day) => ({
        ...day,
        updatedAt: nowIso,
        tasks: day.tasks.map((task) => {
          if (task.id !== editingMicrotaskDraft.taskId || task.movedToDate || task.archivedAt) return task;

          return {
            ...task,
            updatedAt: nowIso,
            microtasks: task.microtasks.map((microtask) =>
              microtask.id === editingMicrotaskDraft.microtaskId
                ? {
                    ...microtask,
                    title,
                    estimatedMinutes,
                  }
                : microtask
            ),
          };
        }),
      }),
      "Microtarea actualizada."
    );
    setEditingMicrotaskDraft(null);
  }, [editingMicrotaskDraft, updateSelectedDay]);

  const startAddingMicrotask = useCallback((taskId: string) => {
    setEditingTaskDraft(null);
    setEditingMicrotaskDraft(null);
    setNewMicrotaskDraft({
      taskId,
      title: "",
      estimatedMinutes: "10",
    });
  }, []);

  const handleAddMicrotask = useCallback(async () => {
    if (!newMicrotaskDraft) return;

    const title = newMicrotaskDraft.title.trim();
    if (!title) {
      toast.error("La microtarea necesita un titulo.");
      return;
    }

    const nowIso = new Date().toISOString();
    const estimatedMinutes = parseEditableMinutes(newMicrotaskDraft.estimatedMinutes, 10);
    await updateSelectedDay(
      (day) => ({
        ...day,
        updatedAt: nowIso,
        tasks: day.tasks.map((task) => {
          if (task.id !== newMicrotaskDraft.taskId || task.movedToDate || task.archivedAt) return task;

          return {
            ...task,
            completed: false,
            completedAt: undefined,
            updatedAt: nowIso,
            microtasks: [
              ...task.microtasks,
              {
                id: generateTaskId(),
                title,
                estimatedMinutes,
                order: task.microtasks.length,
                completed: false,
              },
            ],
          };
        }),
      }),
      "Microtarea agregada."
    );
    setNewMicrotaskDraft(null);
  }, [newMicrotaskDraft, updateSelectedDay]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const target = deleteTarget;
    const nowIso = new Date().toISOString();
    setDeleteTarget(null);

    if (target.type === "task") {
      await updateSelectedDay(
        (day) => ({
          ...day,
          updatedAt: nowIso,
          tasks: reindexTasks(day.tasks.filter((task) => task.id !== target.taskId)),
        }),
        "Tarea eliminada."
      );
      if (selectedTaskId === target.taskId) setSelectedTaskId(null);
      if (editingTaskDraft?.taskId === target.taskId) setEditingTaskDraft(null);
      if (newMicrotaskDraft?.taskId === target.taskId) setNewMicrotaskDraft(null);
      if (editingMicrotaskDraft?.taskId === target.taskId) setEditingMicrotaskDraft(null);
      return;
    }

    await updateSelectedDay(
      (day) => ({
        ...day,
        updatedAt: nowIso,
        tasks: day.tasks.map((task) => {
          if (task.id !== target.taskId || task.movedToDate || task.archivedAt) return task;

          const nextMicrotasks = reindexMicrotasks(
            task.microtasks.filter((microtask) => microtask.id !== target.microtaskId)
          );
          const completed = nextMicrotasks.length > 0
            ? nextMicrotasks.every((microtask) => microtask.completed)
            : task.completed;

          return {
            ...task,
            microtasks: nextMicrotasks,
            completed,
            completedAt: completed ? task.completedAt || nowIso : undefined,
            updatedAt: nowIso,
          };
        }),
      }),
      "Microtarea eliminada."
    );
    if (editingMicrotaskDraft?.microtaskId === target.microtaskId) setEditingMicrotaskDraft(null);
  }, [
    deleteTarget,
    editingMicrotaskDraft,
    editingTaskDraft,
    newMicrotaskDraft,
    selectedTaskId,
    updateSelectedDay,
  ]);

  const handleToggleMicrotask = useCallback(
    async (taskId: string, microtaskId: string) => {
      const nowIso = new Date().toISOString();
      await updateSelectedDay((day) => ({
        ...day,
        updatedAt: nowIso,
        tasks: day.tasks.map((task) => {
          if (task.id !== taskId || task.movedToDate || task.archivedAt) return task;

          const nextMicrotasks = task.microtasks.map((microtask) =>
            microtask.id === microtaskId
              ? {
                  ...microtask,
                  completed: !microtask.completed,
                  completedAt: !microtask.completed ? nowIso : undefined,
                }
              : microtask
          );
          const completed = nextMicrotasks.length > 0 && nextMicrotasks.every((microtask) => microtask.completed);

          return {
            ...task,
            microtasks: nextMicrotasks,
            completed,
            completedAt: completed ? task.completedAt || nowIso : undefined,
            updatedAt: nowIso,
          };
        }),
      }));
    },
    [updateSelectedDay]
  );

  const handleToggleTask = useCallback(
    async (taskId: string) => {
      const nowIso = new Date().toISOString();
      await updateSelectedDay((day) => ({
        ...day,
        updatedAt: nowIso,
        tasks: day.tasks.map((task) => {
          if (task.id !== taskId || task.movedToDate || task.archivedAt) return task;

          const completed = !task.completed;
          return {
            ...task,
            completed,
            completedAt: completed ? nowIso : undefined,
            updatedAt: nowIso,
            microtasks: task.microtasks.map((microtask) => ({
              ...microtask,
              completed,
              completedAt: completed ? microtask.completedAt || nowIso : undefined,
            })),
          };
        }),
      }));
    },
    [updateSelectedDay]
  );

  const handleConfirmRollover = useCallback(async () => {
    if (!rolloverSourceDate) return;
    const sourceDay = planner.days[rolloverSourceDate];
    if (!sourceDay) return;

    const targetDate = addDays(rolloverSourceDate, 1);
    const targetDay = planner.days[targetDate];
    const nowIso = new Date().toISOString();
    const pendingTasks = getPendingTasks(sourceDay);
    const pendingIds = new Set(pendingTasks.map((task) => task.id));

    const movedTasks: AiPlannerTask[] = pendingTasks.map((task, taskIndex) => {
      const pendingMicrotasks = task.microtasks.filter((microtask) => !microtask.completed);
      const microtasksToMove = pendingMicrotasks.length > 0 ? pendingMicrotasks : task.microtasks;
      const copiedMicrotasks: AiPlannerMicrotask[] = microtasksToMove.map((microtask, index) => ({
        id: generateTaskId(),
        title: microtask.title,
        estimatedMinutes: microtask.estimatedMinutes,
        order: index,
        completed: false,
      }));

      const estimatedMinutes = copiedMicrotasks.length > 0
        ? copiedMicrotasks.reduce((sum, microtask) => sum + microtask.estimatedMinutes, 0)
        : task.estimatedMinutes;

      return {
        ...task,
        id: generateTaskId(),
        assignedDate: targetDate,
        movedFromDates: [...task.movedFromDates, rolloverSourceDate],
        movedToDate: undefined,
        archivedAt: undefined,
        completed: false,
        completedAt: undefined,
        microtasks: copiedMicrotasks,
        estimatedMinutes,
        order: (targetDay?.tasks.length || 0) + taskIndex,
        updatedAt: nowIso,
        createdAt: nowIso,
      };
    });

    const nextSourceDay: AiPlannerDay = {
      ...sourceDay,
      updatedAt: nowIso,
      rolloverPromptSeenAt: nowIso,
      tasks: sourceDay.tasks.map((task) =>
        pendingIds.has(task.id)
          ? {
              ...task,
              movedToDate: targetDate,
              updatedAt: nowIso,
            }
          : task
      ),
    };

    const nextTargetDay: AiPlannerDay = {
      date: targetDate,
      sourceText: targetDay?.sourceText || sourceDay.sourceText,
      createdAt: targetDay?.createdAt || nowIso,
      updatedAt: nowIso,
      endOfDay: targetDay?.endOfDay || sourceDay.endOfDay,
      tasks: [...(targetDay?.tasks || []), ...movedTasks],
      coachMessages: [
        ...(targetDay?.coachMessages || []),
        "Pendientes movidos con historial conservado. Empieza por el primer check pequeno.",
      ].slice(-3),
      rolloverPromptSeenAt: targetDay?.rolloverPromptSeenAt,
    };

    const nextPlanner = {
      ...planner,
      selectedDate: targetDate,
      days: {
        ...planner.days,
        [rolloverSourceDate]: nextSourceDay,
        [targetDate]: nextTargetDay,
      },
    };

    setSelectedDate(targetDate);
    setRolloverSourceDate(null);
    await persistPlanner(nextPlanner, "Pendientes pasados al dia siguiente.");
  }, [persistPlanner, planner, rolloverSourceDate]);

  const handleArchiveRollover = useCallback(async () => {
    if (!rolloverSourceDate) return;
    const sourceDay = planner.days[rolloverSourceDate];
    if (!sourceDay) return;

    const nowIso = new Date().toISOString();
    const pendingIds = new Set(getPendingTasks(sourceDay).map((task) => task.id));
    const nextSourceDay: AiPlannerDay = {
      ...sourceDay,
      updatedAt: nowIso,
      rolloverPromptSeenAt: nowIso,
      tasks: sourceDay.tasks.map((task) =>
        pendingIds.has(task.id)
          ? {
              ...task,
              archivedAt: nowIso,
              updatedAt: nowIso,
            }
          : task
      ),
    };

    setRolloverSourceDate(null);
    await persistPlanner(
      {
        ...planner,
        days: {
          ...planner.days,
          [rolloverSourceDate]: nextSourceDay,
        },
      },
      "Pendientes archivados sin mover."
    );
  }, [persistPlanner, planner, rolloverSourceDate]);

  if (!userData) {
    return <LoadingScreen message="Cargando Plan IA..." />;
  }

  const hasTasks = Boolean(selectedDay?.tasks.length);
  const activePendingCount = selectedDay?.tasks.filter(isActivePendingTask).length || 0;
  const coachMessage =
    selectedDay?.coachMessages?.[0] ||
    (progress.done > 0
      ? "Buen avance. Sigue con una microtarea pequena antes de cambiar de contexto."
      : "Empieza por el primer check. La parte dificil es abrir el camino.");

  return (
    <div className="max-w-2xl mx-auto pb-28">
      <header className="p-3 md:p-4 space-y-3 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Icon name="sparkles" className="h-5 w-5 text-emerald-300" />
              Plan IA
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Hoy: {formatFullDate(todayString())}
            </p>
            <p className="text-xs md:text-sm text-emerald-300">
              Viendo: {formatFullDate(selectedDate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Tiempo restante</p>
            <p className="font-semibold text-slate-200">
              {selectedDate === todayString() ? getRemainingLabel(userData.endOfDay) : "Historial"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekDates.map((date) => {
            const day = planner.days[date];
            const dayProgress = getProgress(day);
            const isSelected = date === selectedDate;
            const isToday = date === todayString();

            return (
              <button
                key={date}
                onClick={() => handleSelectDate(date)}
                className={`min-w-[76px] rounded-lg border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-500/15 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <span className="block text-xs font-semibold capitalize">{formatDayTab(date)}</span>
                <span className="block text-[10px] text-slate-400">
                  {isToday ? "Hoy" : day ? `${dayProgress.percent}%` : "Sin plan"}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-3 md:px-6 space-y-4">
        <section className="rounded-lg border border-slate-700 bg-slate-800 p-3 md:p-4">
          <label htmlFor="ai-plan-input" className="block text-sm font-semibold text-white mb-2">
            Que tienes que hacer?
          </label>
          <div className="relative overflow-hidden rounded-lg border border-slate-600 bg-slate-900 transition-colors focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/25">
            <textarea
              id="ai-plan-input"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              rows={5}
              className="min-h-[148px] w-full resize-none bg-transparent px-3 py-3 pb-14 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none"
              placeholder="Ej: terminar informe, estudiar una hora, llamar al cliente, ordenar pendientes..."
            />
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
              {isListening ? (
                <div className="min-w-0 flex-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-100 shadow-sm shadow-emerald-500/10">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                    </span>
                    <span className="truncate">
                      {interimTranscript ? `Escuchando: "${interimTranscript}"` : "Escuchando..."}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="truncate text-xs text-slate-500">
                  Escribe o dicta tu lista inicial
                </span>
              )}
              <div className="flex shrink-0 items-center gap-2">
                {inputText.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setInputText("")}
                    className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white"
                    title="Limpiar texto"
                    aria-label="Limpiar texto"
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleListening}
                  disabled={!speechSupported}
                  title={
                    speechSupported
                      ? isListening
                        ? "Detener dictado"
                        : "Dictar con microfono"
                      : "Dictado no soportado en este navegador"
                  }
                  className={`pointer-events-auto flex h-10 shrink-0 items-center justify-center rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
                    isListening
                      ? "w-[92px] border-emerald-300/70 bg-emerald-400/15 text-emerald-100 shadow-lg shadow-emerald-500/10"
                      : "w-10 border-slate-600 bg-slate-800 text-slate-200 hover:border-emerald-400/60 hover:bg-slate-700 hover:text-emerald-100"
                  }`}
                >
                  {isListening ? (
                    <span className="flex items-center gap-2" aria-hidden="true">
                      <span className="flex h-6 items-end gap-1">
                        {[0.55, 0.8, 1].map((multiplier, index) => (
                          <span
                            key={index}
                            className="w-1 rounded-full bg-emerald-200 transition-all duration-100"
                            style={{
                              height: `${8 + Math.round(voiceLevel * 14 * multiplier)}px`,
                              opacity: 0.5 + voiceLevel * 0.5,
                            }}
                          />
                        ))}
                      </span>
                      <Icon name="stopsquare" className="h-4 w-4 text-emerald-50" />
                    </span>
                  ) : (
                    <Icon name="mic" className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          {!speechSupported && (
            <p className="mt-2 text-xs text-slate-500">
              El dictado funciona en navegadores compatibles como Chrome o Edge.
            </p>
          )}
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {hasTasks ? "Actualizar Plan IA" : "Ordenar mis tareas con IA"}
          </button>
        </section>

        {hasTasks && (
          <section className="rounded-lg border border-slate-700 bg-slate-800 p-3 md:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Progreso del dia</h2>
                <p className="text-xs text-slate-400">
                  {progress.done}/{progress.total} checks completados
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                {progress.percent}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-300">{coachMessage}</p>
          </section>
        )}

        {!hasTasks ? (
          <section className="rounded-lg border border-dashed border-slate-600 bg-slate-800/50 p-6 text-center">
            <Icon name="clipboardList" className="mx-auto h-10 w-10 text-slate-500" />
            <h2 className="mt-3 text-lg font-semibold text-white">Sin plan para este dia</h2>
            <p className="mt-1 text-sm text-slate-400">
              Escribe o dicta tus pendientes y deja que la IA los convierta en pasos pequenos.
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {selectedDay.tasks
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((task, index) => {
                const locked = Boolean(task.movedToDate || task.archivedAt);
                const isEditingTask = editingTaskDraft?.taskId === task.id;
                const isAddingMicrotask = newMicrotaskDraft?.taskId === task.id;
                return (
                  <article
                    key={task.id}
                    className={`rounded-lg border p-3 md:p-4 ${
                      task.completed
                        ? "border-emerald-700 bg-emerald-950/30"
                        : locked
                        ? "border-slate-700 bg-slate-800/60 opacity-80"
                        : "border-slate-700 bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        disabled={locked}
                        className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-500 bg-slate-900 disabled:cursor-not-allowed"
                        aria-label={task.completed ? "Marcar pendiente" : "Marcar completada"}
                      >
                        {task.completed && <Icon name="check" className="h-4 w-4 text-emerald-300" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 text-sm font-semibold text-white md:text-base">
                            <span className="text-slate-400">#{index + 1}</span> {task.title}
                          </h3>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${priorityClasses[task.priority]}`}>
                              {priorityLabel[task.priority]}
                            </span>
                            {!locked && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditingTask(task)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-slate-300 transition-colors hover:border-emerald-400/60 hover:text-emerald-200"
                                  title="Editar tarea"
                                  aria-label="Editar tarea"
                                >
                                  <Icon name="pencil" className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget({ type: "task", taskId: task.id, title: task.title })}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-slate-300 transition-colors hover:border-red-400/60 hover:text-red-200"
                                  title="Eliminar tarea"
                                  aria-label="Eliminar tarea"
                                >
                                  <Icon name="trash2" className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isEditingTask && editingTaskDraft && (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void handleSaveTaskEdit();
                            }}
                            className="mt-3 space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2"
                          >
                            <input
                              value={editingTaskDraft.title}
                              onChange={(event) =>
                                setEditingTaskDraft((draft) =>
                                  draft ? { ...draft, title: event.target.value } : draft
                                )
                              }
                              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                              placeholder="Titulo de la tarea"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editingTaskDraft.priority}
                                onChange={(event) =>
                                  setEditingTaskDraft((draft) =>
                                    draft
                                      ? { ...draft, priority: event.target.value as AiPlannerPriority }
                                      : draft
                                  )
                                }
                                className="rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                              >
                                <option value="high">Alta</option>
                                <option value="medium">Media</option>
                                <option value="low">Baja</option>
                              </select>
                              <input
                                type="number"
                                min={5}
                                max={480}
                                step={5}
                                value={editingTaskDraft.estimatedMinutes}
                                onChange={(event) =>
                                  setEditingTaskDraft((draft) =>
                                    draft ? { ...draft, estimatedMinutes: event.target.value } : draft
                                  )
                                }
                                className="rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                                aria-label="Minutos estimados"
                              />
                            </div>
                            <textarea
                              value={editingTaskDraft.aiReason}
                              onChange={(event) =>
                                setEditingTaskDraft((draft) =>
                                  draft ? { ...draft, aiReason: event.target.value } : draft
                                )
                              }
                              rows={2}
                              className="w-full resize-none rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                              placeholder="Motivo o nota de IA opcional"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingTaskDraft(null)}
                                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                              >
                                Guardar
                              </button>
                            </div>
                          </form>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-slate-300">
                            {task.estimatedMinutes} min
                          </span>
                          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-blue-300">
                            Iniciada {formatShortDate(task.startedDate)}
                          </span>
                          {task.movedFromDates.length > 0 && (
                            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-yellow-300">
                              Movida desde {formatShortDate(task.movedFromDates[task.movedFromDates.length - 1])}
                            </span>
                          )}
                          {task.movedToDate && (
                            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-300">
                              Movida a {formatShortDate(task.movedToDate)}
                            </span>
                          )}
                          {task.archivedAt && (
                            <span className="rounded-full border border-slate-500/30 bg-slate-700 px-2 py-0.5 text-slate-300">
                              Archivada sin mover
                            </span>
                          )}
                          {task.completed && (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                              Completada
                            </span>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          {task.microtasks.map((microtask) => {
                            const isEditingMicrotask =
                              editingMicrotaskDraft?.taskId === task.id &&
                              editingMicrotaskDraft.microtaskId === microtask.id;

                            return (
                              <div
                                key={microtask.id}
                                className="rounded-md bg-slate-900/70 px-2 py-2 text-sm text-slate-200"
                              >
                                {isEditingMicrotask && editingMicrotaskDraft ? (
                                  <form
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      void handleSaveMicrotaskEdit();
                                    }}
                                    className="space-y-2"
                                  >
                                    <div className="grid grid-cols-[1fr_82px] gap-2">
                                      <input
                                        value={editingMicrotaskDraft.title}
                                        onChange={(event) =>
                                          setEditingMicrotaskDraft((draft) =>
                                            draft ? { ...draft, title: event.target.value } : draft
                                          )
                                        }
                                        className="min-w-0 rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
                                        placeholder="Microtarea"
                                      />
                                      <input
                                        type="number"
                                        min={5}
                                        max={480}
                                        step={5}
                                        value={editingMicrotaskDraft.estimatedMinutes}
                                        onChange={(event) =>
                                          setEditingMicrotaskDraft((draft) =>
                                            draft
                                              ? { ...draft, estimatedMinutes: event.target.value }
                                              : draft
                                          )
                                        }
                                        className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
                                        aria-label="Minutos de microtarea"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingMicrotaskDraft(null)}
                                        className="rounded-md border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="submit"
                                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                                      >
                                        Guardar
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      checked={microtask.completed}
                                      disabled={locked}
                                      onChange={() => handleToggleMicrotask(task.id, microtask.id)}
                                      className="mt-1 h-4 w-4 rounded border-slate-500 accent-emerald-500"
                                    />
                                    <span
                                      className={`min-w-0 flex-1 ${
                                        microtask.completed ? "line-through text-slate-500" : ""
                                      }`}
                                    >
                                      {microtask.title}
                                      <span className="ml-2 text-xs text-slate-500">
                                        {microtask.estimatedMinutes} min
                                      </span>
                                    </span>
                                    {!locked && (
                                      <div className="flex shrink-0 gap-1">
                                        <button
                                          type="button"
                                          onClick={() => startEditingMicrotask(task.id, microtask)}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-emerald-200"
                                          title="Editar microtarea"
                                          aria-label="Editar microtarea"
                                        >
                                          <Icon name="pencil" className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeleteTarget({
                                              type: "microtask",
                                              taskId: task.id,
                                              microtaskId: microtask.id,
                                              title: microtask.title,
                                            })
                                          }
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-red-200"
                                          title="Eliminar microtarea"
                                          aria-label="Eliminar microtarea"
                                        >
                                          <Icon name="trash2" className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {isAddingMicrotask && newMicrotaskDraft ? (
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                void handleAddMicrotask();
                              }}
                              className="rounded-md border border-emerald-500/25 bg-emerald-500/5 p-2"
                            >
                              <div className="grid grid-cols-[1fr_82px] gap-2">
                                <input
                                  value={newMicrotaskDraft.title}
                                  onChange={(event) =>
                                    setNewMicrotaskDraft((draft) =>
                                      draft ? { ...draft, title: event.target.value } : draft
                                    )
                                  }
                                  className="min-w-0 rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
                                  placeholder="Nueva microtarea"
                                />
                                <input
                                  type="number"
                                  min={5}
                                  max={480}
                                  step={5}
                                  value={newMicrotaskDraft.estimatedMinutes}
                                  onChange={(event) =>
                                    setNewMicrotaskDraft((draft) =>
                                      draft ? { ...draft, estimatedMinutes: event.target.value } : draft
                                    )
                                  }
                                  className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
                                  aria-label="Minutos de nueva microtarea"
                                />
                              </div>
                              <div className="mt-2 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setNewMicrotaskDraft(null)}
                                  className="rounded-md border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                                >
                                  Agregar
                                </button>
                              </div>
                            </form>
                          ) : (
                            !locked && (
                              <button
                                type="button"
                                onClick={() => startAddingMicrotask(task.id)}
                                className="flex items-center gap-1 rounded-md border border-dashed border-slate-600 px-2 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-emerald-400/60 hover:text-emerald-200"
                              >
                                <Icon name="plus" className="h-3.5 w-3.5" />
                                Microtarea
                              </button>
                            )
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                            className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
                          >
                            Ver detalle
                          </button>
                          {!locked && (
                            <span className="text-[11px] text-slate-500">
                              Editable sin regenerar con IA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
          </section>
        )}
      </main>

      <PlanActionModal
        isOpen={planActionPromptOpen}
        activePendingCount={activePendingCount}
        onAppend={() => {
          setPlanActionPromptOpen(false);
          void generateAiPlan("append");
        }}
        onReplace={() => {
          setPlanActionPromptOpen(false);
          setReplaceConfirmOpen(true);
        }}
        onCancel={() => setPlanActionPromptOpen(false)}
      />

      <ConfirmationModal
        isOpen={replaceConfirmOpen}
        title="Rehacer pendientes"
        message={`Se reemplazaran ${activePendingCount} tareas pendientes activas de ${formatShortDate(selectedDate)}. Las completadas, movidas y archivadas se conservaran.`}
        onCancel={() => setReplaceConfirmOpen(false)}
        confirmLabel="Rehacer pendientes"
        cancelLabel="Cancelar"
        confirmClassName="bg-amber-600 hover:bg-amber-500"
        onConfirm={() => {
          setReplaceConfirmOpen(false);
          void generateAiPlan("replace");
        }}
      />

      <ConfirmationModal
        isOpen={Boolean(rolloverSourceDate)}
        title="Quedaron tareas pendientes"
        message={
          rolloverSourceDate
            ? `El dia ${formatShortDate(rolloverSourceDate)} termino y hay ${pendingRolloverCount} tareas pendientes. Puedes pasarlas a ${formatShortDate(addDays(rolloverSourceDate, 1))} manteniendo historial.`
            : ""
        }
        onConfirm={handleConfirmRollover}
        onCancel={handleArchiveRollover}
        confirmLabel="Pasar pendientes"
        cancelLabel="No, archivar"
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === "task" ? "Eliminar tarea" : "Eliminar microtarea"}
        message={
          deleteTarget
            ? `Esto eliminara "${deleteTarget.title}" del plan de ${formatShortDate(selectedDate)}.`
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        confirmClassName="bg-red-600 hover:bg-red-500"
      />

      {selectedTask && selectedDay && (
        <TaskDetailModal
          task={selectedTask}
          day={selectedDay}
          onClose={() => setSelectedTaskId(null)}
          onEdit={() => {
            startEditingTask(selectedTask);
            setSelectedTaskId(null);
          }}
          onDelete={() => {
            setDeleteTarget({ type: "task", taskId: selectedTask.id, title: selectedTask.title });
            setSelectedTaskId(null);
          }}
        />
      )}

      <AiSyncOverlay
        isVisible={isGenerating}
        messages={[
          "Leyendo tus pendientes...",
          "Separando tareas y microtareas...",
          "Ordenando por impacto y energia...",
          "Preparando tu plan del dia...",
        ]}
        loaderText="La IA esta organizando tu plan."
        showJarvis={true}
      />
    </div>
  );
}

function PlanActionModal({
  isOpen,
  activePendingCount,
  onAppend,
  onReplace,
  onCancel,
}: {
  isOpen: boolean;
  activePendingCount: number;
  onAppend: () => void;
  onReplace: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 px-3 py-4 backdrop-blur-sm md:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Que hacemos con este texto?</h2>
            <p className="mt-1 text-sm text-slate-400">
              Este dia ya tiene un plan. Elige si quieres sumar tareas nuevas o rehacer solo lo pendiente.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={onAppend}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-left transition-colors hover:bg-emerald-500/15"
          >
            <span className="block text-sm font-semibold text-emerald-200">
              Agregar al plan
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Convierte el texto actual en tareas nuevas y las suma sin borrar lo existente.
            </span>
          </button>

          <button
            type="button"
            onClick={onReplace}
            disabled={activePendingCount === 0}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-left transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/70 disabled:opacity-60"
          >
            <span className="block text-sm font-semibold text-amber-200">
              Rehacer pendientes
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Reemplaza {activePendingCount} pendientes activos y conserva completadas e historial.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskDetailModal({
  task,
  day,
  onClose,
  onEdit,
  onDelete,
}: {
  task: AiPlannerTask;
  day: AiPlannerDay;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const completedMicrotasks = task.microtasks.filter((microtask) => microtask.completed);
  const locked = Boolean(task.movedToDate || task.archivedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 px-3 py-4 backdrop-blur-sm md:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Detalle de tarea</h2>
            <p className="text-sm text-slate-400">{formatFullDate(day.date)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!locked && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-emerald-200"
                  aria-label="Editar tarea"
                  title="Editar tarea"
                >
                  <Icon name="pencil" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-200"
                  aria-label="Eliminar tarea"
                  title="Eliminar tarea"
                >
                  <Icon name="trash2" className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Cerrar detalle"
            >
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <section className="rounded-lg border border-slate-700 bg-slate-800 p-3">
            <h3 className="font-semibold text-white">{task.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full border px-2 py-0.5 ${priorityClasses[task.priority]}`}>
                Prioridad {priorityLabel[task.priority]}
              </span>
              <span className="rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-slate-300">
                {task.estimatedMinutes} min estimados
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                {task.completed ? "Completada" : "Pendiente"}
              </span>
            </div>
            {task.aiReason && (
              <p className="mt-3 text-sm text-slate-300">{task.aiReason}</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-700 bg-slate-800 p-3">
            <h3 className="font-semibold text-white">Texto original</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
              {day.sourceText}
            </p>
          </section>

          <section className="rounded-lg border border-slate-700 bg-slate-800 p-3">
            <h3 className="font-semibold text-white">Timeline</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-300">
              <li>Iniciada: {formatFullDate(task.startedDate)}</li>
              <li>Asignada a: {formatFullDate(task.assignedDate)}</li>
              {task.movedFromDates.map((date) => (
                <li key={date}>Movida desde: {formatFullDate(date)}</li>
              ))}
              {task.movedToDate && <li>Movida a: {formatFullDate(task.movedToDate)}</li>}
              {task.archivedAt && <li>Archivada sin mover: {new Date(task.archivedAt).toLocaleString("es-ES")}</li>}
              {task.completedAt && <li>Completada: {new Date(task.completedAt).toLocaleString("es-ES")}</li>}
              {completedMicrotasks.map((microtask) => (
                <li key={microtask.id}>
                  Microtarea completada: {microtask.completedAt ? new Date(microtask.completedAt).toLocaleString("es-ES") : microtask.title}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-slate-700 bg-slate-800 p-3">
            <h3 className="font-semibold text-white">Microtareas</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-300">
              {task.microtasks.map((microtask) => (
                <li key={microtask.id} className="flex items-start gap-2">
                  <span className="mt-0.5">
                    {microtask.completed ? "[x]" : "[ ]"}
                  </span>
                  <span className={microtask.completed ? "line-through text-slate-500" : ""}>
                    {microtask.title} ({microtask.estimatedMinutes} min)
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
