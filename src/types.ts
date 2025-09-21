export enum Priority {
    Low = 0,
    Medium = 1,
    High = 2,
}

export function getPriorityLabel(priority: Priority): string {
    switch (priority) {
        case Priority.Low:
            return 'Opcional';
        case Priority.Medium:
            return 'Importante';
        case Priority.High:
            return 'Muy importante';
        default:
            return 'Desconocido';
    }
}

export enum Page {
    Day = 'day',
    General = 'general',
    Profile = 'profile',
    Progress = 'progress'
}

export enum WeekDay {
    All = 'all',
    Monday = 'monday',
    Tuesday = 'tuesday',
    Wednesday = 'wednesday',
    Thursday = 'thursday',
    Friday = 'friday',
    Saturday = 'saturday',
    Sunday = 'sunday'
}

export const WEEKDAY_LABELS: Record<WeekDay, string> = {
    [WeekDay.All]: 'Todos los días',
    [WeekDay.Monday]: 'Lunes',
    [WeekDay.Tuesday]: 'Martes',
    [WeekDay.Wednesday]: 'Miércoles',
    [WeekDay.Thursday]: 'Jueves',
    [WeekDay.Friday]: 'Viernes',
    [WeekDay.Saturday]: 'Sábado',
    [WeekDay.Sunday]: 'Domingo'
};

export const WEEKDAY_ORDER: WeekDay[] = [
    WeekDay.All,
    WeekDay.Monday,
    WeekDay.Tuesday,
    WeekDay.Wednesday,
    WeekDay.Thursday,
    WeekDay.Friday,
    WeekDay.Saturday,
    WeekDay.Sunday
];

export interface BaseTask {
    id: string; // Cambiado a string para usar UUID v4
    name: string;
    baseDuration: string; // Duración original definida por el usuario
    priority: Priority;
    progressId: string; // UUID único para tracking de progreso (persiste a través de clones)
    flexibleTime: boolean; // Indica si la IA puede modificar la duración
    isHabit: boolean; // Indica si la tarea es un hábito
    startTime?: string; // Hora de inicio opcional (formato HH:MM)
    endTime?: string; // Hora de fin opcional (formato HH:MM)
    scheduledDate?: string; // Fecha específica opcional (formato YYYY-MM-DD)
    order?: number; // Para mantener el orden original que el usuario definió
}

export interface DayTask extends BaseTask {
    completed: boolean;
    isCurrent: boolean;
    aiDuration: string; // Duración asignada por la IA
}

export interface GeneralTask extends BaseTask {
    completed: boolean;
}

export interface UserData {
    uid: string;
    email: string | null;
    endOfDay: string;
    generalTasks: GeneralTask[];
    dayTasks: DayTask[];
    weeklyTasks: Record<WeekDay, GeneralTask[]>;
    calendarTasks?: GeneralTask[]; // Tareas programadas específicamente para fechas
    taskCompletionsByProgressId?: Record<string, string[]>; // progressId -> array of completion dates (ISO strings) - PERSISTENT
    onboardingCompleted?: boolean;
    phoneNumber?: string; // Número de teléfono para WhatsApp
    whatsappConfigured?: boolean; // Si WhatsApp está configurado
    whatsappConfiguredAt?: Date; // Fecha de configuración
}