import { GoogleGenAI, Type } from "@google/genai";
import { DayTask, Priority } from "../../../types";
import { NextResponse } from "next/server";
import "dotenv/config";

// Helper function to get the AI client on demand.
const getAiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("🚀 ~ getAiClient ~ apiKey:", apiKey);
  if (!apiKey) {
    throw new Error(
      "API_KEY for Gemini is not configured in environment variables."
    );
  }
  return new GoogleGenAI({ apiKey });
};

// Schema for a single task
const taskSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.NUMBER },
    name: { type: Type.STRING },
    baseDuration: { type: Type.STRING }, // Nuevo campo
    aiDuration: { type: Type.STRING }, // Nuevo campo
    priority: {
      type: Type.STRING,
      enum: [Priority.High, Priority.Medium, Priority.Low],
    },
    completed: { type: Type.BOOLEAN },
    isCurrent: { type: Type.BOOLEAN },
  },
  required: [
    "id",
    "name",
    "baseDuration",
    "aiDuration",
    "priority",
    "completed",
    "isCurrent",
  ],
};

// Schema for the entire response object
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    updatedTasks: {
      type: Type.ARRAY,
      items: taskSchema,
    },
    freeTime: {
      type: Type.STRING,
      description:
        "Una cadena que representa el tiempo libre restante, ej: '1h 15min', o null si no hay tiempo libre.",
      nullable: true,
    },
  },
  required: ["updatedTasks", "freeTime"],
};

export async function POST(request: Request) {
  try {
    const { tasks, endOfDay } = await request.json();

    if (!tasks || !endOfDay) {
      return NextResponse.json(
        { error: "Missing tasks or endOfDay in request body" },
        { status: 400 }
      );
    }

    const completedTasks = tasks.filter((t: DayTask) => t.completed);
    const pendingTasks = tasks.filter((t: DayTask) => !t.completed);

    if (pendingTasks.length === 0) {
      return NextResponse.json({
        updatedTasks: completedTasks,
        freeTime: null,
      });
    }

    const now = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const prompt = `
      Eres un asistente de productividad experto. Tu tarea es crear un horario detallado desde ahora (${now}) hasta el final del día (${endOfDay}).
      Cada tarea tiene un campo "baseDuration" (el tiempo estimado por el usuario) y debes asignar un campo "aiDuration" (el tiempo que tú organizas para la tarea).
      Reglas:
      1. Prioriza las tareas de 'Alta' prioridad.
      2. No modifiques el orden de las tareas.
      3. El campo "aiDuration" NUNCA puede ser mayor que "baseDuration". Si sobra tiempo, asígnalo a "freeTime".
      4. Si la suma de "aiDuration" es menor al tiempo disponible, asigna el tiempo sobrante a "freeTime".
      5. Cuando una tarea tiene prioridad "baja" y queda poco tiempo, márcala como no realizable añadiendo el texto entre paréntesis y asigna "aiDuration" a "0min".
      6. Marca solo la primera tarea de la lista como 'isCurrent: true'. El resto debe ser 'isCurrent: false'.
      7. No modifiques las tareas completadas. El resultado solo debe contener las tareas pendientes, ajustadas y reordenadas.
      8. Si hay varias tareas y el tiempo no sobra, reparte el tiempo disponible proporcionalmente entre todas las tareas considerando su "baseDuration" y la prioridad de cada una.
      9. Los tiempos asignados por la IA ("aiDuration") para cada tarea deben ser múltiplos de 5 minutos.
      10. Devuelve un objeto JSON con dos claves: 'updatedTasks' (la lista de tareas pendientes ajustadas) y 'freeTime'.
      Tareas pendientes para planificar:
      ${JSON.stringify(pendingTasks, null, 2)}
    `;

    console.log("Enviando prompt a Gemini para actualizar horario:", prompt);

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const textResponse = response?.text?.trim() || "";
    console.log("Respuesta de Gemini (horario):", JSON.parse(textResponse));
    const result: { updatedTasks: DayTask[]; freeTime: string | null } =
      JSON.parse(textResponse);

    let foundCurrent = false;
    const finalPendingTasks = result.updatedTasks.map((task) => {
      if (task.isCurrent && !foundCurrent) {
        foundCurrent = true;
        return task;
      }
      return { ...task, isCurrent: false };
    });

    if (!foundCurrent && finalPendingTasks.length > 0) {
      finalPendingTasks[0].isCurrent = true;
    }

    const responsePayload = {
      updatedTasks: [...completedTasks, ...finalPendingTasks],
      freeTime: result.freeTime,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Error in /api/schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule." },
      { status: 500 }
    );
  }
}
