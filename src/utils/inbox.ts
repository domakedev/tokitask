// Bandeja general: pendientes sin día. Helpers puros (sin Firebase ni React) para crear un
// pendiente y para convertirlo en tarea del Plan IA o del calendario al asignarle un día.
import {
  AiPlannerPriority,
  AiPlannerTask,
  GeneralTask,
  InboxTask,
  Priority,
} from "../types";
import { generateTaskId } from "./idGenerator";

export const INBOX_MAX_TITLE = 120;

/** Minutos como el Plan IA: 5..480, redondeado; si no es un número, `fallback`. */
export const clampInboxMinutes = (value: unknown, fallback = 30) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(Math.round(parsed), 5), 480);
};

const normalizeName = (value: string) => value.trim().toLowerCase();

/** Pendientes activos (sin completar), en el orden en que se agregaron. */
export const pendingInbox = (items: InboxTask[]) => items.filter((item) => !item.completed);
export const completedInbox = (items: InboxTask[]) => items.filter((item) => item.completed);

/** true si ya hay un pendiente activo con ese título (sin distinguir mayúsculas ni espacios). */
export const inboxHasTitle = (items: InboxTask[], title: string) =>
  pendingInbox(items).some((item) => normalizeName(item.title) === normalizeName(title));

export const buildInboxTask = (
  input: { title: string; priority?: AiPlannerPriority; estimatedMinutes?: number; notes?: string },
  nowIso: string,
  id: string = generateTaskId()
): InboxTask => ({
  id,
  title: input.title.trim().slice(0, INBOX_MAX_TITLE),
  priority: input.priority ?? "medium",
  estimatedMinutes: clampInboxMinutes(input.estimatedMinutes, 30),
  ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  completed: false,
  createdAt: nowIso,
  updatedAt: nowIso,
  source: "web",
});

/** Marca o desmarca un pendiente (estado final explícito). */
export const setInboxCompleted = (items: InboxTask[], id: string, completed: boolean, nowIso: string) =>
  items.map((item) =>
    item.id === id
      ? { ...item, completed, completedAt: completed ? nowIso : undefined, updatedAt: nowIso }
      : item
  );

/**
 * Tarea del Plan IA para `date` a partir de un pendiente (misma forma que buildPlannerTask de
 * ai-plan/page.tsx: sin microtareas → una con el título y los minutos de la tarea).
 */
export const inboxToPlannerTask = (
  item: InboxTask,
  date: string,
  order: number,
  nowIso: string,
  newId: () => string = generateTaskId
): AiPlannerTask => ({
  id: newId(),
  title: item.title.trim(),
  priority: item.priority,
  estimatedMinutes: clampInboxMinutes(item.estimatedMinutes, 30),
  order,
  completed: false,
  startedDate: date,
  assignedDate: date,
  movedFromDates: [],
  microtasks: [
    {
      id: newId(),
      title: item.title.trim(),
      estimatedMinutes: clampInboxMinutes(item.estimatedMinutes, 30),
      order: 0,
      completed: false,
    },
  ],
  aiReason: "Viene de tu Bandeja general.",
  createdAt: nowIso,
  updatedAt: nowIso,
});

const PRIORITY_TO_TASK: Record<AiPlannerPriority, Priority> = {
  high: Priority.High,
  medium: Priority.Medium,
  low: Priority.Low,
};

/** "HH:MM" de una duración en minutos, en múltiplos de 10 (mínimo 00:10, como AddTaskModal). */
export const minutesToDuration = (minutes: number) => {
  const rounded = Math.min(1430, Math.max(10, Math.round(minutes / 10) * 10));
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
};

/** Tarea del calendario (calendarTasks) en `date`, con la forma de AddTaskModal + handleSaveTask. */
export const inboxToCalendarTask = (
  item: InboxTask,
  date: string,
  newId: () => string = generateTaskId
): GeneralTask => ({
  id: newId(),
  progressId: newId(),
  name: item.title.trim(),
  baseDuration: minutesToDuration(item.estimatedMinutes),
  priority: PRIORITY_TO_TASK[item.priority] ?? Priority.Medium,
  flexibleTime: true,
  isHabit: false,
  startTime: "",
  endTime: "",
  scheduledDate: date,
  completed: false,
});

/** Lo que se le manda a /api/ai-planner como candidatos (solo pendientes activos). */
export interface InboxCandidate {
  id: string;
  title: string;
  priority: AiPlannerPriority;
  estimatedMinutes: number;
  selected: boolean;
}

export const inboxCandidates = (items: InboxTask[], selectedIds: Set<string>): InboxCandidate[] =>
  pendingInbox(items).map((item) => ({
    id: item.id,
    title: item.title,
    priority: item.priority,
    estimatedMinutes: item.estimatedMinutes,
    selected: selectedIds.has(item.id),
  }));
