import { GoogleGenAI } from "@google/genai";
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

export async function POST(request: Request) {
  const defaultTip =
    "Recuerda tomar pequeños descansos para mantenerte enfocado y con energía.";
  try {
    const { tasks } = await request.json();

    if (!tasks) {
      return NextResponse.json(
        { error: "Missing tasks in request body" },
        { status: 400 }
      );
    }

    const ai = getAiClient();
    const highPriorityCount = tasks.filter(
      (t: DayTask) => t.priority === Priority.High && !t.completed
    ).length;

    const taskDetails = tasks
      .map((t: DayTask) => {
      return `Nombre: ${t.name}, Prioridad: ${t.priority}, Completada: ${t.completed ? "Sí" : "No"}`;
      })
      .join("; ");

    const prompt = `
      Eres un coach de productividad motivacional. Basado en este resumen de tareas del día, da un consejo corto, útil y amigable en español.
      Detalles de las tareas de hoy: ${taskDetails}.
      Reglas:
      1. No des palabras con asteriscos porque no las puedo presentar bien.
      2. No repitas consejos comunes.
      3. Mantén el consejo en menos de 20 palabras.
      4. Sé positivo y alentador.
      Ejemplos: 
      - "Si haces X tarea muy pronto seras Y"
      - "Esta tarea X solo te tomara Y minutos, ¡puedes hacerlo!"
      - "Hacer lo difícil primero te hará el resto del día más fácil, que tal si haces X tarea ahora?"

    `;
    console.log("Enviando prompt a Gemini para obtener consejo:", prompt);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
    });
    const tip = response.text?.trim() ?? defaultTip;
    console.log("Respuesta de Gemini (consejo):", tip);
    return NextResponse.json({ tip });
  } catch (error) {
    console.error("Error in /api/tip:", error);
    return NextResponse.json({ tip: defaultTip });
  }
}
