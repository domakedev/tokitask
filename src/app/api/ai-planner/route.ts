import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import "dotenv/config";

const getAiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY for Gemini is not configured in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const microtaskSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Microtarea concreta, breve y accionable en espanol.",
    },
    estimatedMinutes: {
      type: Type.NUMBER,
      description: "Minutos estimados para completar la microtarea.",
    },
  },
  required: ["title", "estimatedMinutes"],
};

const taskSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Titulo claro de la tarea principal en espanol.",
    },
    priority: {
      type: Type.STRING,
      enum: ["high", "medium", "low"],
      description: "Prioridad de la tarea.",
    },
    estimatedMinutes: {
      type: Type.NUMBER,
      description: "Minutos estimados para la tarea completa.",
    },
    aiReason: {
      type: Type.STRING,
      description: "Razon breve de por que esta tarea va en esa posicion.",
    },
    microtasks: {
      type: Type.ARRAY,
      items: microtaskSchema,
    },
  },
  required: ["title", "priority", "estimatedMinutes", "aiReason", "microtasks"],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      items: taskSchema,
    },
    coachMessages: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "Mensajes breves de guia o motivacion para el dia.",
    },
  },
  required: ["tasks", "coachMessages"],
};

const clampMinutes = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(Math.round(parsed), 5), 480);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      text,
      currentDate,
      today,
      tomorrow,
      currentTime,
      endOfDay,
      existingTasks,
      mode,
    } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing text in request body" },
        { status: 400 }
      );
    }

    const prompt = `
Eres un asistente de productividad para TokiTask. Convierte el texto libre del usuario en una lista ordenada de tareas y microtareas para avanzar durante el dia.

Contexto:
- Fecha seleccionada: ${currentDate}
- Hoy: ${today}
- Manana: ${tomorrow}
- Hora actual del usuario: ${currentTime}
- Fin del dia configurado: ${endOfDay}
- Tareas existentes en este plan: ${JSON.stringify(existingTasks || [], null, 2)}
- Modo de generacion: ${mode || "create"}

Texto del usuario:
${text.trim()}

Reglas:
1. Responde solo JSON segun el schema.
2. Divide ideas grandes en tareas principales y microtareas pequenas.
3. Ordena por impacto, urgencia, dependencias y energia mental.
4. Usa prioridades: high, medium, low.
5. Cada tarea debe tener de 2 a 6 microtareas, salvo tareas muy simples.
6. Las microtareas deben ser verificables y accionables, no consejos abstractos.
7. No inventes fechas externas ni mezcles esto con el horario general.
8. Si el texto es ambiguo, crea un plan razonable y practico.
9. Mantente realista con el tiempo disponible hasta el fin del dia.
10. Incluye 2 o 3 coachMessages breves, utiles y con tono motivador.
11. Si el modo es "append", usa las tareas existentes como contexto y evita duplicar tareas que ya esten representadas en el plan actual; devuelve solo tareas nuevas o complementarias.
12. Si el modo es "replace" o "create", puedes reorganizar el texto completo en un nuevo conjunto de tareas.
`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const textResponse = response?.text?.trim() || "";
    const parsed = JSON.parse(textResponse);

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks
          .filter((task: { title?: unknown }) => typeof task.title === "string" && task.title.trim())
          .slice(0, 12)
          .map(
            (
              task: {
                title: string;
                priority?: string;
                estimatedMinutes?: unknown;
                aiReason?: unknown;
                microtasks?: Array<{ title?: unknown; estimatedMinutes?: unknown }>;
              },
              index: number
            ) => {
              const microtasks = Array.isArray(task.microtasks)
                ? task.microtasks
                    .filter((microtask) => typeof microtask.title === "string" && microtask.title.trim())
                    .slice(0, 8)
                    .map((microtask) => ({
                      title: String(microtask.title).trim(),
                      estimatedMinutes: clampMinutes(microtask.estimatedMinutes, 10),
                    }))
                : [];

              return {
                title: task.title.trim(),
                priority: ["high", "medium", "low"].includes(task.priority || "")
                  ? task.priority
                  : index < 2
                  ? "high"
                  : "medium",
                estimatedMinutes: clampMinutes(task.estimatedMinutes, 30),
                aiReason:
                  typeof task.aiReason === "string" && task.aiReason.trim()
                    ? task.aiReason.trim()
                    : "Ordenada por prioridad y facilidad de avance.",
                microtasks,
              };
            }
          )
      : [];

    const coachMessages = Array.isArray(parsed.coachMessages)
      ? parsed.coachMessages
          .filter((message: unknown) => typeof message === "string" && message.trim())
          .slice(0, 3)
      : [];

    return NextResponse.json({
      tasks,
      coachMessages:
        coachMessages.length > 0
          ? coachMessages
          : ["Empieza por la primera microtarea y evita renegociar el plan a mitad del bloque."],
    });
  } catch (error) {
    console.error("Error in /api/ai-planner:", error);
    return NextResponse.json(
      { error: "Failed to generate AI plan." },
      { status: 500 }
    );
  }
}
