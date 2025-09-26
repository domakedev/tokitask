import { GoogleGenAI, Type } from "@google/genai";
import { DayTask } from "../../../types";
import { NextResponse } from "next/server";
import "dotenv/config";

// Helper function to get the AI client on demand.
const getAiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "API_KEY for Gemini is not configured in environment variables."
    );
  }
  return new GoogleGenAI({ apiKey });
};

// Schema for the response object
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    advice: {
      type: Type.STRING,
      description: "Consejo breve y útil para el usuario en español, motivacional o de productividad, basado en las tareas del día.",
    },
  },
  required: ["advice"],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tasks } = body;

    // Validaciones
    if (!tasks) {
      return NextResponse.json(
        { error: "Missing tasks in request body" },
        { status: 400 }
      );
    }

    // Validar que tasks sea un array
    if (!Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "Tasks must be an array" },
        { status: 400 }
      );
    }

    if (tasks.length === 0) {
      return NextResponse.json({
        advice: "¡Excelente! No tienes tareas pendientes hoy. Disfruta de tu tiempo libre o planea algo productivo.",
      });
    }

    //limpiar taras para solo enviar: name, isHabit, completed, aiDuration, priority
    const cleanedTasks = tasks.map((task: DayTask) => ({
      name: task.name,
      isHabit: task.isHabit,
      completed: task.completed,
      aiDuration: task.aiDuration,
      priority: task.priority,
    }));

    const prompt = `
    Eres un asistente de productividad experto. Analiza las tareas del día del usuario y genera un consejo breve, útil y motivacional en español.

    Tareas del día:
    ${JSON.stringify(cleanedTasks, null, 2)}

    Instrucciones:
    - El consejo debe ser breve (máximo 2-3 oraciones).
    - Debe ser motivacional y positivo.
    - Sugiere cómo optimizar el día, manejar prioridades (0 baja, 1 media, 2 alta) o mantener el enfoque.
    - Si hay muchas tareas, sugiere cuales priorizar.
    - Si hay tareas pendientes, anima a empezar.
    - Devuelve el nombre de las tareas tal cual lo recibes, con emojis, etc.

    Devuelve solo el consejo en la clave 'advice'.
    `;

    console.log("Enviando prompt a Gemini para consejoooooooo:", prompt);

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest", // Modelo más rápido
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const textResponse = response?.text?.trim() || "";
    const parsed = JSON.parse(textResponse);
    console.log("🍖🍖🍖Respuesta de Gemini (consejo):", parsed);

    return NextResponse.json({
      advice: parsed.advice,
    });
  } catch (error) {
    console.error("Error in /api/advice:", error);
    return NextResponse.json(
      { error: "Failed to get advice." },
      { status: 500 }
    );
  }
}