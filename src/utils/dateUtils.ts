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