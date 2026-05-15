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

const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Titulo breve de la recomendacion.",
    },
    detail: {
      type: Type.STRING,
      description: "Detalle practico y accionable de la recomendacion.",
    },
    priority: {
      type: Type.STRING,
      enum: ["alta", "media", "baja"],
      description: "Prioridad visual de la recomendacion.",
    },
  },
  required: ["title", "detail", "priority"],
};

// Schema for the response object
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    headline: {
      type: Type.STRING,
      description: "Titulo breve y amigable para encabezar el analisis.",
    },
    overview: {
      type: Type.STRING,
      description:
        "Resumen de 1 o 2 frases sobre el estado general del horario.",
    },
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "Fortalezas concretas del horario.",
    },
    concerns: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "Riesgos, sobrecargas o desequilibrios detectados.",
    },
    recommendations: {
      type: Type.ARRAY,
      items: recommendationSchema,
      description: "Mejoras concretas para optimizar el horario.",
    },
    closingTip: {
      type: Type.STRING,
      description: "Consejo final breve, util y motivacional.",
    },
  },
  required: [
    "headline",
    "overview",
    "strengths",
    "concerns",
    "recommendations",
    "closingTip",
  ],
};

type RecommendationPriority = "alta" | "media" | "baja";

interface StructuredAiOpinion {
  headline: string;
  overview: string;
  strengths: string[];
  concerns: string[];
  recommendations: {
    title: string;
    detail: string;
    priority: RecommendationPriority;
  }[];
  closingTip: string;
}

const getString = (value: unknown, fallback: string) => {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const getStringArray = (value: unknown, maxItems: number) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
};

const getPriority = (value: unknown): RecommendationPriority => {
  if (value === "alta" || value === "media" || value === "baja") {
    return value;
  }

  return "media";
};

const normalizeOpinion = (value: unknown): StructuredAiOpinion => {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawRecommendations = Array.isArray(raw.recommendations)
    ? raw.recommendations
    : [];

  return {
    headline: getString(raw.headline, "Opinion de la IA sobre tu horario"),
    overview: getString(
      raw.overview,
      "La IA analizo tu horario y encontro oportunidades para hacerlo mas claro y sostenible."
    ),
    strengths: getStringArray(raw.strengths, 4),
    concerns: getStringArray(raw.concerns, 3),
    recommendations: rawRecommendations
      .map((item) => {
        const recommendation =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};

        return {
          title: getString(recommendation.title, "Ajuste recomendado"),
          detail: getString(
            recommendation.detail,
            "Revisa este punto para mejorar el equilibrio de tu horario."
          ),
          priority: getPriority(recommendation.priority),
        };
      })
      .slice(0, 4),
    closingTip: getString(
      raw.closingTip,
      "Haz ajustes pequenos y revisa como te sientes al final del dia."
    ),
  };
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

    if (!weeklyTasks || typeof weeklyTasks !== "object") {
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
Eres un asistente de productividad experto. Analiza el horario general del usuario y proporciona una opinion detallada, util y facil de mostrar en una UI compacta.

EXPLICACION DE LOS DATOS:
- generalTasks: Son las tareas que se repiten todos los dias como una base horaria. Representan la rutina diaria fija.
- weeklyTasks: Son tareas especificas para cada dia de la semana. Cada dia (monday, tuesday, etc.) tiene su propio conjunto de tareas unicas.
- calendarTasks: Son tareas programadas para fechas especificas, como eventos unicos o citas.

INSTRUCCIONES:
1. Analiza el equilibrio entre generalTasks (rutina base), weeklyTasks (variaciones diarias) y calendarTasks (eventos especificos).
2. Evalua si el horario es realista, equilibrado y productivo.
3. Identifica posibles sobrecargas, tiempos libres excesivos o desequilibrios.
4. Sugiere mejoras especificas: ajustes de tiempos, reordenamientos, adiciones de tareas utiles (como ejercicio, descanso, hobbies) o eliminaciones de tareas innecesarias.
5. Considera aspectos como salud, trabajo, ocio, familia, etc.
6. Proporciona consejos motivacionales y practicos para optimizar el horario.
7. Responde en espanol, de manera amigable y constructiva.
8. Si el horario esta vacio o muy basico, sugiere una estructura inicial.
9. Devuelve solo JSON segun el schema. No uses Markdown dentro de los textos.
10. Manten cada texto breve: headline maximo 70 caracteres, overview 1 o 2 frases, strengths 2 a 4 items, concerns 0 a 3 items, recommendations 2 a 4 items y closingTip 1 frase.
11. Cada recomendacion debe tener title, detail y priority. Usa priority exactamente como "alta", "media" o "baja".

DATOS DEL HORARIO:
- generalTasks: ${JSON.stringify(generalTasks, null, 2)}
- weeklyTasks: ${JSON.stringify(weeklyTasks, null, 2)}
- calendarTasks: ${JSON.stringify(calendarTasks, null, 2)}

Estructura requerida:
{
  "headline": string,
  "overview": string,
  "strengths": string[],
  "concerns": string[],
  "recommendations": [
    { "title": string, "detail": string, "priority": "alta" | "media" | "baja" }
  ],
  "closingTip": string
}
`;

    console.log("Enviando prompt a Gemini para opinion del horario:", prompt);

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
    const opinion = normalizeOpinion(parsed);
    console.log("Respuesta de Gemini (opinion):", opinion);

    return NextResponse.json({ opinion });
  } catch (error) {
    console.error("Error in /api/ai-opinion:", error);
    return NextResponse.json(
      { error: "Failed to get AI opinion." },
      { status: 500 }
    );
  }
}
