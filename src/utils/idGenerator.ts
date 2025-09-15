// Utilidad para generar IDs únicos usando UUID v4
import { v4 as uuidv4 } from 'uuid';

/**
 * Genera un ID único usando UUID v4
 * Garantiza unicidad global y evita colisiones
 */
export const generateUniqueId = (): string => {
  return uuidv4();
};

/**
 * Genera un ID único para tareas
 * Alias de generateUniqueId para claridad semántica
 */
export const generateTaskId = (): string => {
  return generateUniqueId();
};

/**
 * Genera múltiples IDs únicos
 * Útil para operaciones batch
 */
export const generateMultipleIds = (count: number): string[] => {
  return Array.from({ length: count }, () => generateUniqueId());
};

/**
 * Valida si un string es un UUID válido
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};