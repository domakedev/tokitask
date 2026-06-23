// Configuración central de límites de uso de IA (anti-abuso).
// El contador real vive en Firestore (`users/{uid}.aiUsage`) para que no sea
// editable desde el cliente como lo sería localStorage. La caché de respuestas
// sí va en localStorage (ver `src/services/aiResponseCache.ts`).

// Cada "función" que llama a la IA tiene su propio contador diario.
export type AiFeature = "schedule" | "advice" | "opinion" | "planner";

export const AI_FEATURES: AiFeature[] = ["schedule", "advice", "opinion", "planner"];

// Etiquetas legibles para mostrar en mensajes al usuario.
export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  schedule: "Organizar con IA",
  advice: "Consejo de IA",
  opinion: "Opinión del horario",
  planner: "Planificador con IA",
};

// Límite diario por cada función de IA.
export const AI_DAILY_LIMIT_PER_FEATURE = 3;

// Tope diario global, sumando todas las funciones de IA.
export const AI_DAILY_LIMIT_TOTAL = 30;
