import { GoogleGenAI, Type } from "@google/genai";
import { DayTask, Priority } from "../types";

const getAiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("🚀 ~ getAiClient ~ apiKey:", apiKey)

  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "GEMINI_API_KEY no está configurada correctamente. " +
      "Por favor, verifica que esté en tu archivo .env.local sin comillas:\n" +
      "GEMINI_API_KEY=tu_api_key_aqui"
    );
  }

  try {
    const trimmedApiKey = apiKey.trim();
    return new GoogleGenAI({ apiKey: trimmedApiKey });
  } catch (error) {
    console.error("Error initializing Google Gemini client:", error);
    throw new Error("Error al inicializar el cliente de Gemini. Verifica que la API key sea válida.");
  }
};

const taskSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.NUMBER },
    name: { type: Type.STRING },
    baseDuration: { type: Type.STRING },
    aiDuration: { type: Type.STRING },
    priority: { type: Type.STRING, enum: [Priority.High, Priority.Medium, Priority.Low] },
    completed: { type: Type.BOOLEAN },
    isCurrent: { type: Type.BOOLEAN },
  },
  required: ["id", "name", "baseDuration", "aiDuration", "priority", "completed", "isCurrent"],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    updatedTasks: {
      type: Type.ARRAY,
      items: taskSchema,
    },
    freeTime: {
      type: Type.STRING,
      description: "Una cadena que representa el tiempo libre restante, ej: '1h 15min', o null si no hay tiempo libre.",
      nullable: true,
    },
    tip: {
      type: Type.STRING,
      description: "Consejo breve y útil para el usuario en español, motivacional o de productividad.",
    },
  },
  required: ["updatedTasks", "freeTime", "tip"],
};

export const getScheduleWithAI = async (
  tasks: DayTask[],
  endOfDay: string,
  userTime: string
): Promise<{ updatedTasks: DayTask[], freeTime: string | null, tip: string | null }> => {
  const completedTasks = tasks.filter(t => t.completed);
  const pendingTasks = tasks.filter(t => !t.completed);

  if (pendingTasks.length === 0) {
    return { updatedTasks: completedTasks, freeTime: null, tip: null };
  }

  const prompt = `
    Eres un asistente de productividad experto. Tu tarea es crear un horario detallado desde ahora (${userTime}) hasta el final del día (${endOfDay}).
    Cada tarea tiene un campo "baseDuration" (el tiempo estimado por el usuario) y debes asignar un campo "aiDuration" (el tiempo que tú organizas para la tarea).
    Reglas:
    1. Prioriza las tareas de 'Alta' prioridad.
    2. No modifiques el orden de las tareas.
    3. El campo "aiDuration" NUNCA puede ser mayor que "baseDuration". Si sobra tiempo, asígnalo a "freeTime".
    4. Si la suma de "aiDuration" es menor al tiempo disponible, asigna el tiempo sobrante a "freeTime".
    5. Si una tarea tiene prioridad "baja" y queda poco tiempo, márcala como no realizable añadiendo el texto entre paréntesis y asigna "aiDuration" a "0min", para las demas tareas con prioridades diferentes debes asignarles un tiempo proporcional a su prioridad y tiempo base pero nunca "0".
    6. Marca solo la primera tarea de la lista como 'isCurrent: true'. El resto debe ser 'isCurrent: false'.
    7. No modifiques las tareas completadas. El resultado solo debe contener las tareas pendientes, ajustadas y reordenadas.
    8. Si hay varias tareas y el tiempo no sobra, reparte el tiempo disponible proporcionalmente entre todas las tareas considerando su "baseDuration" y la prioridad de cada una.
    9. Los tiempos asignados por la IA ("aiDuration") para cada tarea deben ser múltiplos de 5 minutos.
    10. Devuelve un objeto JSON con tres claves: 'updatedTasks' (la lista de tareas pendientes ajustadas), 'freeTime' y 'tip'.
    11. También debes entender el nombre de la tarea entender de que trata y en base a eso asignar un tiempo adecuado, por ejemplo si es comer no le pongas que no se puede o 1 minuto, o si es bañarse no le pongas 3 minutos, pero si es por ej jugar o mirar serie o comprar un dulce o cosas asi de simples si puedes poner un tiempo bajo, debes mantener cierta coherencia realista para el tiempo mínimo.
    12. Además, analiza el horario y las tareas y genera un consejo breve y útil para el usuario en español, motivacional o de productividad, que ayude a mejorar su día. El consejo debe ir en la clave 'tip' del objeto JSON.
    Tareas pendientes para planificar:
    ${JSON.stringify(pendingTasks, null, 2)}
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const textResponse = response?.text?.trim() || "";
    const result = JSON.parse(textResponse);

    let foundCurrent = false;
    const finalPendingTasks = result.updatedTasks.map((task: DayTask) => {
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
      freeTime: result.freeTime,
      tip: result.tip,
    };
  } catch (error) {
    console.error("Error in GeminiService:", error);
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
    });
    const tip = response.text?.trim() ?? defaultTip;
    return tip;
  } catch (error) {
    console.error("Error getting AI tip:", error);
    return defaultTip;
  }
};