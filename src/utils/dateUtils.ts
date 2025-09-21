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
 * Verifica si una hora es válida
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
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
 * Soporta formatos como "30 min", "1 hora", "2 horas", "45 minutos", "1h", "30m", "1:30 h"
 */
export const parseDurationToMinutes = (duration: string): number => {
  const trimmed = duration.trim().toLowerCase();

  // Manejar formato "1:30 h" o "1:30"
  const timeMatch = trimmed.match(/^(\d+):(\d+)\s*(h|hora|horas?)?$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    return hours * 60 + minutes;
  }

  // Manejar formato simple "30 min", "1 hora", etc.
  const match = trimmed.match(/^(\d+)\s*(min|minutos|m|hora|horas?|h)?$/);
  if (!match) {
    console.log('No match for duration:', trimmed);
    return 0;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  console.log('Parsed duration:', { value, unit });

  if (!unit || unit === 'min' || unit === 'minutos' || unit === 'm') {
    return value;
  } else if (unit === 'hora' || unit === 'horas' || unit === 'h') {
    return value * 60;
  }

  console.log('Unknown unit:', unit);
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