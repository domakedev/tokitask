"use server";
import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";
import { DayTask, Priority } from "../types";

// Helper function to get the AI client on demand.
const getAiClient = (): GoogleGenAI => {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("🚀 ~ getAiClient ~ apiKey:", apiKey)
    if (!apiKey) {
        throw new Error("API_KEY for Gemini is not configured in environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

// Schema for a single task
const taskSchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.NUMBER },
      name: { type: Type.STRING },
      duration: { type: Type.STRING },
      priority: { type: Type.STRING, enum: [Priority.High, Priority.Medium, Priority.Low] },
      completed: { type: Type.BOOLEAN },
      isCurrent: { type: Type.BOOLEAN },
    },
    required: ["id", "name", "duration", "priority", "completed", "isCurrent"],
};

// Schema for the entire response object
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        updatedTasks: {
            type: Type.ARRAY,
            items: taskSchema
        },
        freeTime: {
            type: Type.STRING,
            description: "Una cadena que representa el tiempo libre restante, ej: '1h 15min', o null si no hay tiempo libre.",
            nullable: true,
        }
    },
    required: ["updatedTasks", "freeTime"]
};


export const getUpdatedSchedule = async (tasks: DayTask[], endOfDay: string): Promise<{ updatedTasks: DayTask[], freeTime: string | null }> => {
    const completedTasks = tasks.filter(t => t.completed);
    const pendingTasks = tasks.filter(t => !t.completed);

    if (pendingTasks.length === 0) {
        return { updatedTasks: completedTasks, freeTime: null };
    }
    
    const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

    const prompt = `
        Eres un asistente de productividad experto. Tu tarea es crear un horario detallado desde ahora (${now}) hasta el final del día (${endOfDay}).
        A continuación, se muestra una lista de tareas pendientes. Debes reorganizarlas y, lo más importante, RECALCULAR la duración de cada una para que encajen en el tiempo disponible.
        
        Reglas:
        1. Prioriza las tareas de 'Alta' prioridad.
        2. La duración de las tareas debe ser realista. No asignes duraciones demasiado cortas o largas a menos que sea necesario para encajar todo.
        3. Marca solo la primera tarea de la lista recalculada como 'isCurrent: true'. El resto debe ser 'isCurrent: false'.
        4. Si después de asignar tiempo a todas las tareas queda tiempo libre hasta las ${endOfDay}, calcula ese tiempo y devuélvelo en el campo 'freeTime'. Si no hay tiempo libre, 'freeTime' debe ser null.
        5. No modifiques las tareas completadas. El resultado solo debe contener las tareas pendientes, ajustadas y reordenadas.
        6. Devuelve un objeto JSON con dos claves: 'updatedTasks' (la lista de tareas pendientes ajustadas) y 'freeTime'.

        Tareas pendientes para planificar:
        ${JSON.stringify(pendingTasks, null, 2)}
    `;

    console.log(" Enviando prompt a Gemini para actualizar horario:", prompt);

    try {
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
        console.log("Respuesta de Gemini (horario):", textResponse);
        const result: { updatedTasks: DayTask[], freeTime: string | null } = JSON.parse(textResponse);
        
        // Ensure only one task is current
        let foundCurrent = false;
        const finalPendingTasks = result.updatedTasks.map(task => {
            if (task.isCurrent && !foundCurrent) {
                foundCurrent = true;
                return task;
            }
            return { ...task, isCurrent: false };
        });

        if (!foundCurrent && finalPendingTasks.length > 0) {
            finalPendingTasks[0].isCurrent = true;
        }

        return {
            updatedTasks: [...completedTasks, ...finalPendingTasks],
            freeTime: result.freeTime
        };

    } catch (error) {
        console.error("Error updating schedule with Gemini:", error);
        throw new Error("No se pudo actualizar el horario. Revisa la configuración de la API.");
    }
};

export const getAiTip = async (tasks: DayTask[]): Promise<string> => {
    const defaultTip = "Recuerda tomar pequeños descansos para mantenerte enfocado y con energía.";
    try {
        const ai = getAiClient();
        const highPriorityCount = tasks.filter(t => t.priority === Priority.High && !t.completed).length;
        const prompt = `
            Eres un coach de productividad motivacional. Basado en este resumen de tareas del día, da un consejo corto, útil y amigable en español.
            Resumen: Hay ${tasks.length} tareas en total. ${highPriorityCount} de ellas son de alta prioridad y no están completadas.
            Ejemplo de respuesta: "Parece que tienes varias tareas de 'Alta' prioridad. ¡Intenta empezar por la más difícil para coger impulso!"
        `;
        console.log("Enviando prompt a Gemini para obtener consejo:", prompt);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        const tip = response.text?.trim() ?? defaultTip;
        console.log("Respuesta de Gemini (consejo):", tip);
        return tip;
    } catch (error) {
        console.error("Error getting AI tip:", error);
        return defaultTip;
    }
};
