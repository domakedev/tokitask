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

export interface BaseTask {
    id: number;
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
}