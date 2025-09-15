export enum Priority {
    Low = 'Baja',
    Medium = 'Media',
    High = 'Alta',
}

export enum Page {
    Day = 'day',
    General = 'general',
    Profile = 'profile'
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
}