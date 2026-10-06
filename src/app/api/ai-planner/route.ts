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
    inboxId: {
      type: Type.STRING,
      description:
        "Solo si la tarea corresponde a un pendiente de la Bandeja general: su id exacto. Si no, vacio.",
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

interface InboxCandidate {
  id: string;
  title: string;
  priority?: string;
  estimatedMinutes?: number;
  selected?: boolean;
}

/** Candidatos de la Bandeja general que manda la web (solo id/titulo validos, max 30). */
const parseInboxCandidates = (value: unknown): InboxCandidate[] =>
  Array.isArray(value)
    ? value
        .filter(
          (item): item is InboxCandidate =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as InboxCandidate).id === "string" &&
            typeof (item as InboxCandidate).title === "string" &&
            (item as InboxCandidate).title.trim().length > 0
        )
        .slice(0, 30)
        .map((item) => ({
          id: item.id,
          title: item.title.trim().slice(0, 120),
          priority: item.priority,
          estimatedMinutes: item.estimatedMinutes,
          selected: item.selected === true,
        }))
    : [];

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
    const inboxTasks = parseInboxCandidates(body.inboxTasks);
    const selectedInbox = inboxTasks.filter((item) => item.selected);
    const otherInbox = inboxTasks.filter((item) => !item.selected);
    const userText = typeof text === "string" ? text.trim() : "";

    if (!userText && selectedInbox.length === 0) {
      return NextResponse.json(
        { error: "Missing text in request body" },
        { status: 400 }
      );
    }

    const prompt = `
Eres un asistente de productividad para TokiTask. Tu trabajo es tomar las tareas u objetivos que el usuario escribio y dividirlos en microtareas accionables para lograrlos.

La entrada del usuario es la unica fuente de verdad. No eres un creador de planes nuevos: eres un descomponedor de tareas.

Contexto:
- Fecha seleccionada: ${currentDate}
- Hoy: ${today}
- Manana: ${tomorrow}
- Hora actual del usuario: ${currentTime}
- Fin del dia configurado: ${endOfDay}
- Tareas existentes en este plan: ${JSON.stringify(existingTasks || [], null, 2)}
- Modo de generacion: ${mode || "create"}

Texto del usuario:
${userText || "(sin texto: planifica solo los pendientes elegidos de la Bandeja general)"}

Pendientes de la Bandeja general que el usuario ELIGIO para este dia (son tan explicitos como el texto; inclúyelos todos, cada uno como una tarea con su inboxId):
${selectedInbox.length ? JSON.stringify(selectedInbox.map(({ id, title, priority, estimatedMinutes }) => ({ id, title, priority, estimatedMinutes })), null, 2) : "(ninguno)"}

Otros pendientes de su Bandeja general (NO elegidos; solo sirven para reconocerlos si el texto los menciona):
${otherInbox.length ? JSON.stringify(otherInbox.map(({ id, title }) => ({ id, title })), null, 2) : "(ninguno)"}

Reglas:
1. Responde solo JSON segun el schema.
2. Devuelve solo tareas principales que correspondan a una tarea u objetivo explicito del texto del usuario.
3. No agregues tareas, objetivos, habitos, fechas, llamadas, descansos, reuniones ni pendientes que el usuario no menciono.
4. Usa prioridades: high, medium, low.
5. Puedes ordenar las tareas por impacto, urgencia, dependencias y energia mental, pero no cambies su alcance.
6. Cada tarea debe tener de 2 a 6 microtareas, salvo tareas muy simples.
7. Las microtareas deben ser pasos directos para completar la tarea principal. No deben ser consejos abstractos ni recomendaciones externas.
8. Las microtareas pueden aclarar pasos razonables, pero solo cuando se infieren directamente de la tarea mencionada.
9. Si algo es ambiguo, conserva el texto original como tarea principal y divide solo lo que se pueda inferir directamente. No rellenes huecos con tareas nuevas.
10. Mantente realista con el tiempo disponible hasta el fin del dia sin recortar ni ampliar el objetivo del usuario.
11. Incluye 1 a 3 coachMessages breves y genericos sobre ejecucion del plan. No sugieras tareas nuevas dentro de coachMessages.
12. Si el modo es "append", usa las tareas existentes solo para evitar duplicados; devuelve unicamente tareas explicitamente nuevas en el texto del usuario.
13. Si el modo es "replace" o "create", puedes reorganizar solo las tareas explicitas del texto completo.
14. El titulo de cada tarea debe ser fiel al texto del usuario. No lo conviertas en un objetivo mas amplio.
15. Bandeja general: cada pendiente elegido va como UNA tarea con inboxId = su id exacto (titulo fiel, puedes mantener su prioridad y minutos). Si el texto del usuario menciona algo que ya esta en "Otros pendientes", usa esa tarea con su inboxId en vez de crear otra. Nunca agregues pendientes no elegidos que el texto no mencione. Si una tarea no viene de la bandeja, deja inboxId vacio.
`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const textResponse = response?.text?.trim() || "";
    const parsed = JSON.parse(textResponse);

    const inboxIds = new Set(inboxTasks.map((item) => item.id));
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
                inboxId?: unknown;
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

              const inboxId =
                typeof task.inboxId === "string" && inboxIds.has(task.inboxId.trim())
                  ? task.inboxId.trim()
                  : undefined;

              return {
                ...(inboxId ? { inboxId } : {}),
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
