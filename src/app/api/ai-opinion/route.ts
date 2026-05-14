import { GoogleGenAI, Type } from "@google/genai";
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
    opinion: {
      type: Type.STRING,
      description:
        "Opinión detallada sobre el horario general del usuario, incluyendo análisis, sugerencias de mejora, adiciones o eliminaciones recomendadas. Debe ser en español, útil y motivacional.",
    },
  },
  required: ["opinion"],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { generalTasks, weeklyTasks, calendarTasks } = body;

    // Validaciones
    if (!generalTasks || !Array.isArray(generalTasks)) {
      return NextResponse.json(
        { error: "Missing or invalid generalTasks in request body" },
        { status: 400 }
      );
    }

    if (!weeklyTasks || typeof weeklyTasks !== 'object') {
      return NextResponse.json(
        { error: "Missing or invalid weeklyTasks in request body" },
        { status: 400 }
      );
    }

    if (!calendarTasks || !Array.isArray(calendarTasks)) {
      return NextResponse.json(
        { error: "Missing or invalid calendarTasks in request body" },
        { status: 400 }
      );
    }

    const prompt = `
Eres un asistente de productividad experto. Analiza el horario general del usuario y proporciona una opinión detallada y útil.

EXPLICACIÓN DE LOS DATOS:
- generalTasks: Son las tareas que se repiten todos los días como una base horaria. Representan la rutina diaria fija.
- weeklyTasks: Son tareas específicas para cada día de la semana. Cada día (monday, tuesday, etc.) tiene su propio conjunto de tareas únicas.
- calendarTasks: Son tareas programadas para fechas específicas, como eventos únicos o citas.

INSTRUCCIONES:
1. Analiza el equilibrio entre generalTasks (rutina base), weeklyTasks (variaciones diarias) y calendarTasks (eventos específicos).
2. Evalúa si el horario es realista, equilibrado y productivo.
3. Identifica posibles sobrecargas, tiempos libres excesivos o desequilibrios.
4. Sugiere mejoras específicas: ajustes de tiempos, reordenamientos, adiciones de tareas útiles (como ejercicio, descanso, hobbies) o eliminaciones de tareas innecesarias.
5. Considera aspectos como salud, trabajo, ocio, familia, etc.
6. Proporciona consejos motivacionales y prácticos para optimizar el horario.
7. Responde en español, de manera amigable y constructiva.
8. Si el horario está vacío o muy básico, sugiere una estructura inicial.

DATOS DEL HORARIO:
- generalTasks: ${JSON.stringify(generalTasks, null, 2)}
- weeklyTasks: ${JSON.stringify(weeklyTasks, null, 2)}
- calendarTasks: ${JSON.stringify(calendarTasks, null, 2)}

Proporciona tu opinión en la clave 'opinion' del JSON.
`;

    console.log("Enviando prompt a Gemini para opinión del horario:", prompt);

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      // model: "gemini-2.5-pro",
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const textResponse = response?.text?.trim() || "";
    const parsed = JSON.parse(textResponse);
    console.log("🍖🍖🍖Respuesta de Gemini (opinión):", parsed);

    return NextResponse.json({ opinion: parsed.opinion });
  } catch (error) {
    console.error("Error in /api/ai-opinion:", error);
    return NextResponse.json(
      { error: "Failed to get AI opinion." },
      { status: 500 }
    );
  }
}