// Caché de respuestas de IA en localStorage.
//
// Objetivo: si el usuario vuelve a pedir lo mismo (mismo input) no se gasta una
// nueva petición ni cuota — se devuelve la última respuesta guardada. El usuario
// puede forzar una regeneración ("intentar de nuevo"), que ignora la caché.
//
// La caché NO es la fuente de verdad de los límites (eso vive en Firestore); solo
// evita peticiones redundantes. Que sea editable en localStorage no es un riesgo:
// como mucho el usuario se quedaría sin caché y gastaría una petición real, que sí
// está limitada server-friendly por el contador de Firestore.

import { AiFeature } from "../config/aiLimits";

interface CacheEntry<T> {
  inputHash: string; // huella del input; si cambia, la caché no aplica
  response: T; // respuesta de la IA tal cual se usó
  createdAt: string; // ISO de cuándo se guardó (para depurar / futuras expiraciones)
}

const STORAGE_PREFIX = "tokitask:ai-cache";

const buildKey = (uid: string, feature: AiFeature): string =>
  `${STORAGE_PREFIX}:${uid}:${feature}`;

// Hash estable y barato (djb2) de cualquier payload serializable. Sirve para
// detectar si el input cambió respecto a la última respuesta cacheada.
export const hashAiInput = (payload: unknown): string => {
  const json = JSON.stringify(payload ?? null);
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = (hash * 33) ^ json.charCodeAt(i);
  }
  // >>> 0 para tratarlo como entero sin signo
  return (hash >>> 0).toString(36);
};

const isBrowser = (): boolean => typeof window !== "undefined";

// Devuelve la respuesta cacheada solo si el input coincide con el guardado.
export const getCachedAiResponse = <T>(
  uid: string,
  feature: AiFeature,
  inputHash: string
): T | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(buildKey(uid, feature));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.inputHash !== inputHash) return null;
    return entry.response;
  } catch {
    return null;
  }
};

export const setCachedAiResponse = <T>(
  uid: string,
  feature: AiFeature,
  inputHash: string,
  response: T
): void => {
  if (!isBrowser()) return;
  try {
    const entry: CacheEntry<T> = {
      inputHash,
      response,
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(buildKey(uid, feature), JSON.stringify(entry));
  } catch {
    // Sin espacio o storage deshabilitado: la caché es best-effort, ignorar.
  }
};

export const clearCachedAiResponse = (uid: string, feature: AiFeature): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(buildKey(uid, feature));
  } catch {
    // ignorar
  }
};
