// Utilidades para trabajar con fechas y días de la semana

import { WeekDay, WEEKDAY_LABELS } from '../types';

/**
 * Obtiene el día de la semana actual
 */
export const getCurrentWeekDay = (): WeekDay => {
  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Domingo, 1 = Lunes, etc.

  // Convertir de índice de JavaScript (0=Domingo) a nuestro enum (monday=0)
  const weekDayMap: Record<number, WeekDay> = {
    1: WeekDay.Monday,
    2: WeekDay.Tuesday,
    3: WeekDay.Wednesday,
    4: WeekDay.Thursday,
    5: WeekDay.Friday,
    6: WeekDay.Saturday,
    0: WeekDay.Sunday
  };

  return weekDayMap[dayIndex];
};

/**
 * Obtiene el nombre del día de la semana actual
 */
export const getCurrentWeekDayName = (): string => {
  const currentDay = getCurrentWeekDay();
  return WEEKDAY_LABELS[currentDay];
};

/**
 * Obtiene la fecha actual formateada
 */
export const getCurrentDateFormatted = (): string => {
  const now = new Date();
  return now.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Convierte un índice de día de la semana a WeekDay enum
 */
export const indexToWeekDay = (index: number): WeekDay => {
  const weekDayMap: Record<number, WeekDay> = {
    0: WeekDay.Monday,
    1: WeekDay.Tuesday,
    2: WeekDay.Wednesday,
    3: WeekDay.Thursday,
    4: WeekDay.Friday,
    5: WeekDay.Saturday,
    6: WeekDay.Sunday
  };

  return weekDayMap[index] || WeekDay.Monday;
};

/**
 * Convierte WeekDay enum a índice
 */
export const weekDayToIndex = (weekDay: WeekDay): number => {
  const indexMap: Record<WeekDay, number> = {
    [WeekDay.All]: -1, // "Todos los días" no tiene índice específico
    [WeekDay.Monday]: 0,
    [WeekDay.Tuesday]: 1,
    [WeekDay.Wednesday]: 2,
    [WeekDay.Thursday]: 3,
    [WeekDay.Friday]: 4,
    [WeekDay.Saturday]: 5,
    [WeekDay.Sunday]: 6
  };

  return indexMap[weekDay];
};

/**
 * Obtiene el siguiente día de la semana
 */
export const getNextWeekDay = (currentDay: WeekDay): WeekDay => {
  const currentIndex = weekDayToIndex(currentDay);
  const nextIndex = (currentIndex + 1) % 7;
  return indexToWeekDay(nextIndex);
};

/**
 * Verifica si un día está seleccionado en una lista de días
 */
export const isDaySelected = (day: WeekDay, selectedDays: WeekDay[]): boolean => {
  return selectedDays.includes(day);
};

/**
 * Alterna la selección de un día en una lista
 */
export const toggleDaySelection = (day: WeekDay, selectedDays: WeekDay[]): WeekDay[] => {
  if (isDaySelected(day, selectedDays)) {
    return selectedDays.filter(d => d !== day);
  } else {
    return [...selectedDays, day];
  }
};

/**
 * Obtiene todos los días de la semana
 */
export const getAllWeekDays = (): WeekDay[] => {
  return [
    WeekDay.Monday,
    WeekDay.Tuesday,
    WeekDay.Wednesday,
    WeekDay.Thursday,
    WeekDay.Friday,
    WeekDay.Saturday,
    WeekDay.Sunday
  ];
};

/**
 * Formatea una hora en formato HH:MM
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Normaliza cualquier formato de tiempo a HH:MM (24 horas)
 * Maneja formatos como "14:30", "2:30 PM", "14:30:00", etc.
 */
export const normalizeTime = (time: string): string => {
  if (!time || time.trim() === '') return '';

  const trimmed = time.trim().toLowerCase();

  // Si ya está en formato HH:MM, validarlo y devolverlo
  const hhmmRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (hhmmRegex.test(trimmed)) {
    return trimmed;
  }

  // Manejar formato HH:MM:SS
  const hhmmssRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  if (hhmmssRegex.test(trimmed)) {
    return trimmed.substring(0, 5);
  }

  // Manejar formato 12 horas con AM/PM
  const time12Regex = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i;
  const match12 = trimmed.match(time12Regex);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = match12[2];
    const period = match12[3]?.toLowerCase();

    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  // Manejar formato "14h 30min" o similar (extraer primera hora encontrada)
  const hourMinRegex = /(\d{1,2}):(\d{2})/;
  const hourMinMatch = trimmed.match(hourMinRegex);
  if (hourMinMatch) {
    const hour = parseInt(hourMinMatch[1], 10);
    const minute = hourMinMatch[2];
    if (hour >= 0 && hour <= 23 && parseInt(minute, 10) >= 0 && parseInt(minute, 10) <= 59) {
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }
  }

  // Manejar formato "14h 30min" o "30 min" usando parseDurationToMinutes
  const durationMinutes = parseDurationToMinutes(trimmed);
  if (durationMinutes > 0 && durationMinutes < 1440) { // Menos de 24 horas
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }


  // Si no se puede parsear, devolver vacío
  console.warn(`No se pudo normalizar el tiempo: "${time}"`);
  return '';
};

/**
 * Verifica si una hora es válida (formato HH:MM)
 */
export const isValidTime = (time: string): boolean => {
  const normalized = normalizeTime(time);
  if (!normalized) return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(normalized);
};

/**
 * Formatea una hora en formato HH:MM a formato 12 horas con AM/PM
 */
export const formatTimeTo12Hour = (time: string): string => {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12; // Convierte 0 a 12 para medianoche
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
};

/**
 * Convierte una duración en string a minutos
 * Soporta formatos como "30 min", "1 hora", "2 horas", "45 minutos", "1h", "30m", "1:30 h", "90", "1h 30m", etc.
 */
export const parseDurationToMinutes = (duration: string): number => {
  if (!duration || duration.trim() === '') return 0;

  const trimmed = duration.trim().toLowerCase();

  // Manejar formato "1:30 h" o "1:30"
  const timeMatch = trimmed.match(/^(\d+):(\d+)\s*(h|hora|horas?)?$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    return hours * 60 + minutes;
  }

  // Buscar horas
  const hourMatch = trimmed.match(/(\d+)\s*h/);
  let total = 0;
  if (hourMatch) {
    total += parseInt(hourMatch[1], 10) * 60;
  }

  // Buscar minutos
  const minuteMatch = trimmed.match(/(\d+)\s*min/);
  if (minuteMatch) {
    total += parseInt(minuteMatch[1], 10);
  }

  if (total > 0) return total;

  // Si no encuentra formato específico, intentar parsear como número directo
  const directMatch = trimmed.match(/(\d+)/);
  if (directMatch) {
    return parseInt(directMatch[1]);
  }

  return 0;
};

/**
 * Calcula la diferencia en minutos entre dos horas (formato HH:MM)
 */
export const calculateTimeDifferenceInMinutes = (startTime: string, endTime: string): number => {
  const start = startTime.split(':').map(Number);
  const end = endTime.split(':').map(Number);

  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];

  return endMinutes - startMinutes;
};

/**
 * Formatea una fecha en formato YYYY-MM-DD como fecha local
 * Trata la fecha como UTC para evitar problemas de zona horaria
 */
export const formatDateString = (dateString: string, locale: string = 'es-ES'): string => {
  if (!dateString) return '';

  // Añadir tiempo UTC explícito para evitar interpretación local
  const utcDate = new Date(dateString + 'T00:00:00.000Z');

  return utcDate.toLocaleDateString(locale);
};


/**
 * Redondea un número al múltiplo de 5 más cercano.
 */
export const roundToNearest5 = (num: number): number => {
  return Math.round(num / 5) * 5;
};


/**
 * Suma minutos a una hora en formato "HH:MM".
 */
export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  
  const newHours = date.getHours().toString().padStart(2, '0');
  const newMinutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${newHours}:${newMinutes}`;
};

/**
 * Formatea una duración en formato HH:MM a lenguaje humano.
 * Ej: "01:00" -> "1 hora", "01:10" -> "1 hora 10 minutos", "00:30" -> "30 minutos"
 */
export const formatDurationToHuman = (duration: string): string => {
  const minutes = parseDurationToMinutes(duration);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} hora${hours > 1 ? 's' : ''} ${mins} minuto${mins > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hora${hours > 1 ? 's' : ''}`;
  } else {
    return `${mins} minuto${mins > 1 ? 's' : ''}`;
  }
};