import { GoogleGenAI, Type } from "@google/genai";
import { DayTask, Priority } from "../../../types";
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

// Schema for a single task
const taskSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    baseDuration: { type: Type.STRING }, // Nuevo campo
    aiDuration: { type: Type.STRING }, // Nuevo campo
    priority: {
      type: Type.STRING,
      enum: [
        Priority.High.toString(),
        Priority.Medium.toString(),
        Priority.Low.toString(),
      ],
    },
    progressId: { type: Type.STRING },
    completed: { type: Type.BOOLEAN },
    isCurrent: { type: Type.BOOLEAN },
    flexibleTime: { type: Type.BOOLEAN },
    startTime: { type: Type.STRING }, 
    endTime: { type: Type.STRING }, 
    scheduledDate: { type: Type.STRING }, 
  },
  required: [
    "id",
    "name",
    "baseDuration",
    "aiDuration",
    "priority",
    "completed",
    "progressId",
    "isCurrent",
    "flexibleTime",
    "startTime",
    "endTime",
    "scheduledDate",
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
    tip: {
      type: Type.STRING,
      description:
        "Consejo breve y útil para el usuario en español, motivacional o de productividad, generado en base a las tareas y el horario.",
    },
  },
  required: ["updatedTasks", "freeTime", "tip"],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tasks, endOfDay, userTime } = body;

    // Validaciones más detalladas
    if (!tasks) {
      return NextResponse.json(
        { error: "Missing tasks in request body" },
        { status: 400 }
      );
    }

    if (!endOfDay) {
      return NextResponse.json(
        { error: "Missing endOfDay in request body" },
        { status: 400 }
      );
    }

    if (!userTime) {
      return NextResponse.json(
        { error: "Missing userTime in request body" },
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

    const completedTasks = tasks.filter((t: DayTask) => t.completed);
    const pendingTasks = tasks.filter((t: DayTask) => !t.completed);

    if (pendingTasks.length === 0) {
      return NextResponse.json({
        updatedTasks: completedTasks,
        freeTime: null,
      });
    }

    // Usar la hora enviada por el usuario
    const now = userTime;

    // const prompt = `
    //   Eres un asistente de productividad experto. Tu tarea es crear un horario detallado desde ahora (${now}) hasta el final del día (${endOfDay}).
    //   Cada tarea tiene un campo "baseDuration" (el tiempo estimado por el usuario) y debes asignar un campo "aiDuration" (el tiempo que tú organizas para la tarea).

    //   Reglas:
    //   0. Las prioridades son: "2 (alta)", "1 (media)" y "0 (baja)". No debes modificar las prioridades.
    //   0.1 No debes cambiar: baseDuration, progressId, id, completed.
    //   0.2 Solo para tareas con flexibleTime: false, mantén exactamente la baseDuration para el tiempo asignado por la IA en aiDuration sin modificaciones.
    //   0.2.1 Si una tarea tiene flexibleTime: true, puedes ajustar aiDuration según lo consideres necesario.
    //   1. Prioriza las tareas de prioridad "2 (alta)".
    //   2. No modifiques el orden de las tareas.
    //   3. El campo "aiDuration" NUNCA puede ser mayor que "baseDuration". Si sobra tiempo, asígnalo a "freeTime".
    //   4. Si la suma de "aiDuration" es menor al tiempo disponible, asigna el tiempo sobrante a "freeTime".
    //   5. Solo cuando una tarea tiene prioridad "0 (baja)" y queda poco tiempo, márcala como no realizable añadiendo el texto entre paréntesis y asigna "aiDuration" a "0min", para las demas tareas con prioridades diferentes debes asignarles un tiempo proporcional a su prioridad y tiempo base pero nunca "0".
    //   6. Marca solo la primera tarea de la lista como 'isCurrent: true'. El resto debe ser 'isCurrent: false'.
    //   7. No modifiques las tareas completadas. El resultado solo debe contener las tareas pendientes, ajustadas y reordenadas.
    //   8. Si hay varias tareas y el tiempo no sobra, reparte el tiempo disponible proporcionalmente entre todas las tareas considerando su "baseDuration" y la prioridad de cada una.
    //   9. Los tiempos asignados por la IA ("aiDuration") para cada tarea deben ser múltiplos de 5 minutos.
    //   10. Si una tarea no tiene "startTime" o "endTime" no se los asignes.
    //   11. Si una tarea tiene definido "startTime" y "endTime" y tiene flexibleTime: false, no modifiques esos horarios, pero si tiene flexibleTime: true, puedes ajustarlos si es necesario.
    //   12. Los horarios(startTime, endTime) deben ser consecutivos sin solapamientos entre las tareas.
    //   13. Si una tarea tiene definido solo "startTime" o solo "endTime", calcula si tiene flexibleTime: true y asigna valores a "startTime" o solo "endTime" en base al aiDuration que asignes, pero si flexibleTime: false respeta a baseDuration para calcular los tiempos de inicio o fin.
    //   13.1 Si una tarea tiene "startTime" o "endTime", debes completar el otro que falta.
    //   14. Devuelve un objeto JSON con tres claves: 'updatedTasks' (la lista de tareas pendientes ajustadas), 'freeTime' y 'tip'.
    //   15. También debes entender el nombre de la tarea entender de que trata y en base a eso asignar un tiempo adecuado, por ejemplo si es comer no le pongas que no se puede o 1 minuto, o si es bañarse no le pongas 3 minutos, pero si es por ej jugar o mirar serie o comprar un dulce o cosas asi de simples si puedes poner un tiempo bajo, debes mantener cierta coherencia realista para el tiempo mínimo.
    //   16. Además, analiza el horario y las tareas y genera un consejo breve y útil para el usuario en español, motivacional o de productividad, que ayude a mejorar su día. El consejo debe ir en la clave 'tip' del objeto JSON.
    //   Tareas pendientes para planificar:
    //   ${JSON.stringify(pendingTasks, null, 2)}
    // `;

    const prompt = `
    Eres un asistente de productividad experto. Tu tarea es organizar un horario desde ahora (${now}) hasta el final del día (${endOfDay}).

    INSTRUCCIONES CRÍTICAS:
    - DEVUELVE TODAS las tareas pendientes en updatedTasks, NO SOLO UNA.
    - Cada tarea debe tener startTime y endTime asignados basados en el horario acumulado.
    - Los horarios deben ser consecutivos sin solapamientos.

    Reglas principales:
    1. Prioridades: "2 (alta)", "1 (media)", "0 (baja)". No cambies baseDuration, progressId, id ni completed, ni scheduledDate.
    2. Duraciones:
       - flexibleTime: false → aiDuration = baseDuration.
       - flexibleTime: true → ajusta aiDuration (máx. = baseDuration).
       - Siempre múltiplos de 5 min.       
       - aiDuration nunca > baseDuration.
    3. Distribución:
       - Prioriza tareas de prioridad 2.
       - No cambies el orden.
       - Si falta tiempo, reparte proporcional según baseDuration + prioridad.
       - Prioridad 0 puede ser 0min (con "Nombre + (no realizable)"), las demás nunca 0min.
    4. Horarios:
       - PARA CADA TAREA: asigna startTime y endTime basados en el horario acumulado desde ${now}.
       - Respeta startTime/endTime existentes si flexibleTime: false.
       - Si flexibleTime: true puedes ajustarlos.
       - Horarios consecutivos sin solapamientos.      
       - Tiempo que sobra ->Tiempo que queda - suma total de tareas(startTime-endTime) → freeTime.
    5. Otras reglas:
       - Solo la primera tarea → isCurrent: true, el resto false.
       - No modifiques tareas completadas.
       - Salida: TODAS las tareas pendientes ajustadas con sus horarios.
    6. Coherencia realista:
       - Usa tiempos mínimos razonables (ej. comer >10min, bañarse >30min, pero mirar serie/jugar sí puede ser bajo).

    IMPORTANTE: Asegúrate de que updatedTasks contenga TODAS las tareas de la lista original, cada una con startTime y endTime asignados.

    Tareas pendientes para planificar:
    ${JSON.stringify(pendingTasks, null, 2)}
    `;

    console.log("Enviando prompt a Gemini para actualizar horario:", prompt);

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
    const parsed = JSON.parse(textResponse);
    console.log("🍖🍖🍖Respuesta de Gemini (horario):", parsed);
    let foundCurrent = false;
    const finalPendingTasks = parsed.updatedTasks.map((task: DayTask) => {
      const convertedTask = {
        ...task,
        priority: Number(task.priority) as Priority,
        startTime: task.startTime || undefined,
        endTime: task.endTime || undefined,
        scheduledDate: task.scheduledDate || undefined,
      };
      if (convertedTask.isCurrent && !foundCurrent) {
        foundCurrent = true;
        return convertedTask;
      }
      return { ...convertedTask, isCurrent: false };
    });

    if (!foundCurrent && finalPendingTasks.length > 0) {
      finalPendingTasks[0].isCurrent = true;
    }

    const responsePayload = {
      updatedTasks: [...completedTasks, ...finalPendingTasks],
      freeTime: parsed.freeTime,
      tip: parsed.tip ?? null,
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
