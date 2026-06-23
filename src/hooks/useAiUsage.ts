import { useCallback, useMemo } from "react";
import { useAuthStore } from "../stores/authStore";
import { updateUserData } from "../services/firestoreService";
import { AiUsageState } from "../types";
import {
  AiFeature,
  AI_FEATURE_LABELS,
  AI_DAILY_LIMIT_PER_FEATURE,
  AI_DAILY_LIMIT_TOTAL,
} from "../config/aiLimits";
import {
  getCachedAiResponse,
  setCachedAiResponse,
  hashAiInput,
} from "../services/aiResponseCache";

// Día local en formato YYYY-MM-DD (mismo criterio que el resto de la app).
const today = (): string => new Date().toLocaleDateString("en-CA");

// Normaliza el contador al día de hoy: si el guardado es de otro día (o no
// existe), arranca en cero. Así el reseteo diario es automático sin cron.
const normalizeUsage = (raw?: AiUsageState): AiUsageState => {
  const day = today();
  if (raw && raw.date === day) {
    return {
      date: day,
      total: typeof raw.total === "number" ? raw.total : 0,
      byFeature: raw.byFeature || {},
    };
  }
  return { date: day, total: 0, byFeature: {} };
};

export type AiGuardReason = "no-user" | "limit-feature" | "limit-total";

export interface AiGuardResult<T> {
  ok: boolean;
  data?: T;
  fromCache: boolean;
  reason?: AiGuardReason;
  message?: string;
  // Usos restantes hoy tras esta llamada (solo cuando ok y no vino de caché).
  remaining?: { feature: number; total: number };
}

export interface RunGuardedAiOptions<T> {
  feature: AiFeature;
  // Datos que definen la petición. Se usan para la huella de caché: si no
  // cambian, una nueva llamada (sin force) reutiliza la respuesta guardada.
  input: unknown;
  // Si es true se ignora la caché y se fuerza una nueva petición (botón
  // "intentar de nuevo"). Consume cuota igual que cualquier petición real.
  force?: boolean;
  // Ejecuta la petición real a la IA y devuelve la respuesta a cachear.
  // Solo se invoca si hay cuota disponible. Si lanza, no se consume cuota.
  request: () => Promise<T>;
}

/**
 * Hook anti-abuso para las funciones de IA.
 *
 * - Límite por función: AI_DAILY_LIMIT_PER_FEATURE usos/día.
 * - Tope global: AI_DAILY_LIMIT_TOTAL usos/día.
 * - El contador vive en Firestore (`users/{uid}.aiUsage`), no en localStorage.
 * - Cachea la última respuesta por función en localStorage para no repetir
 *   peticiones idénticas (ver aiResponseCache).
 */
export const useAiUsage = () => {
  const userData = useAuthStore((s) => s.userData);

  const usageToday = useMemo(
    () => normalizeUsage(userData?.aiUsage),
    [userData?.aiUsage]
  );

  // Usos restantes hoy para una función concreta y a nivel global.
  const getRemaining = useCallback(
    (feature: AiFeature) => {
      const usedFeature = usageToday.byFeature[feature] ?? 0;
      return {
        feature: Math.max(0, AI_DAILY_LIMIT_PER_FEATURE - usedFeature),
        total: Math.max(0, AI_DAILY_LIMIT_TOTAL - usageToday.total),
      };
    },
    [usageToday]
  );

  const runGuardedAi = useCallback(
    async <T,>(opts: RunGuardedAiOptions<T>): Promise<AiGuardResult<T>> => {
      const { feature, input, force, request } = opts;

      // Leer el estado más fresco del store (no el del closure) para no pisar
      // mutaciones concurrentes ni usar contadores obsoletos.
      const store = useAuthStore.getState();
      const fresh = store.userData;
      if (!fresh) {
        return {
          ok: false,
          fromCache: false,
          reason: "no-user",
          message: "Inicia sesión para usar la IA.",
        };
      }

      const uid = fresh.uid;
      const inputHash = hashAiInput(input);

      // 1) Caché: si el input no cambió y no se fuerza, reutilizar respuesta.
      if (!force) {
        const cached = getCachedAiResponse<T>(uid, feature, inputHash);
        if (cached !== null) {
          return { ok: true, data: cached, fromCache: true };
        }
      }

      // 2) Límites (contador de Firestore, normalizado a hoy).
      const usage = normalizeUsage(fresh.aiUsage);
      const usedFeature = usage.byFeature[feature] ?? 0;
      const label = AI_FEATURE_LABELS[feature];

      if (usedFeature >= AI_DAILY_LIMIT_PER_FEATURE) {
        return {
          ok: false,
          fromCache: false,
          reason: "limit-feature",
          message: `Alcanzaste el límite de ${AI_DAILY_LIMIT_PER_FEATURE} usos diarios de "${label}". Inténtalo de nuevo mañana.`,
        };
      }
      if (usage.total >= AI_DAILY_LIMIT_TOTAL) {
        return {
          ok: false,
          fromCache: false,
          reason: "limit-total",
          message: `Alcanzaste el límite diario de ${AI_DAILY_LIMIT_TOTAL} usos de IA. Inténtalo de nuevo mañana.`,
        };
      }

      // 3) Petición real. Si lanza, no consumimos cuota (se propaga el error).
      const data = await request();

      // 4) Consumir cuota: incrementar contadores y persistir SOLO aiUsage
      //    (releyendo el store por si el request modificó otros campos).
      const newUsage: AiUsageState = {
        date: usage.date,
        total: usage.total + 1,
        byFeature: { ...usage.byFeature, [feature]: usedFeature + 1 },
      };
      const afterRequest = useAuthStore.getState().userData ?? fresh;
      store.setUserData({ ...afterRequest, aiUsage: newUsage });
      try {
        await updateUserData(uid, { aiUsage: newUsage });
      } catch (error) {
        console.error("No se pudo persistir el contador de IA:", error);
      }

      // 5) Cachear la respuesta para futuros clics idénticos.
      setCachedAiResponse(uid, feature, inputHash, data);

      return {
        ok: true,
        data,
        fromCache: false,
        remaining: {
          feature: Math.max(
            0,
            AI_DAILY_LIMIT_PER_FEATURE - (newUsage.byFeature[feature] ?? 0)
          ),
          total: Math.max(0, AI_DAILY_LIMIT_TOTAL - newUsage.total),
        },
      };
    },
    []
  );

  return { usageToday, getRemaining, runGuardedAi };
};
