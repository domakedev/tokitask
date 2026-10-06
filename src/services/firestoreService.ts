import { doc, getDoc, setDoc, updateDoc, deleteDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { UserData, WeekDay, GeneralTask, DayTask, InboxTask } from "../types";
import { FirebaseError, ErrorLogger, withErrorHandling } from "../utils/errorHandler";

// Interfaz temporal para migración de datos
interface LegacyUserData {
  uid: string;
  email: string | null;
  endOfDay: string;
  generalTasks: GeneralTask[];
  dayTasks: DayTask[];
  weeklyTasks?: Record<WeekDay, GeneralTask[]>;
  calendarTasks?: GeneralTask[];
  taskCompletionsByProgressId?: Record<string, string[]>;
  onboardingCompleted?: boolean;
  aiPlanner?: UserData["aiPlanner"];
  inboxTasks?: unknown;
}

/** Bandeja general leída de Firestore: siempre un arreglo de objetos (un documento viejo no la tiene). */
export const asInboxTasks = (value: unknown): InboxTask[] =>
  Array.isArray(value)
    ? (value.filter((item) => item && typeof item === "object" && typeof (item as InboxTask).id === "string") as InboxTask[])
    : [];

const removeUndefinedFields = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedFields(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, entry]) => {
      if (entry === undefined) return acc;
      acc[key] = removeUndefinedFields(entry);
      return acc;
    }, {}) as T;
  }

  return value;
};

export const getUserData = async (uid: string): Promise<UserData | null> => {
  return withErrorHandling(async () => {
    if (!db) {
      throw new FirebaseError("Firebase database not initialized", undefined, {
        component: 'FirestoreService',
        operation: 'getUserData',
        uid
      });
    }

    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      // Adaptar los datos para asegurar que las tareas tengan los nuevos campos
      const data = docSnap.data() as LegacyUserData;
      let needsUpdate = false;

      if (data) {
        // Limpiar campos undefined
        if (data.calendarTasks === undefined) {
          data.calendarTasks = [];
          needsUpdate = true;
        }
        if (data.taskCompletionsByProgressId === undefined) {
          data.taskCompletionsByProgressId = {};
          needsUpdate = true;
        }
        if (data.onboardingCompleted === undefined) {
          data.onboardingCompleted = false;
          needsUpdate = true;
        }
        if (data.aiPlanner === undefined) {
          data.aiPlanner = { days: {} };
          needsUpdate = true;
        } else if (!data.aiPlanner.days) {
          data.aiPlanner = { ...data.aiPlanner, days: {} };
          needsUpdate = true;
        }

        // Migrar datos antiguos si no tienen weeklyTasks
        if (!data.weeklyTasks) {
          (data as UserData).weeklyTasks = {
            all: [],
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          };
          needsUpdate = true;
        }

        // Migrar weeklyTasks para agregar flexibleTime
        if (data.weeklyTasks) {
          Object.keys(data.weeklyTasks).forEach((day) => {
            if (Array.isArray(data.weeklyTasks![day as WeekDay])) {
              const originalTasks = data.weeklyTasks![day as WeekDay];
              data.weeklyTasks![day as WeekDay] = data.weeklyTasks![day as WeekDay].map((t) => ({
                ...t,
                baseDuration: t.baseDuration || "",
                flexibleTime: t.flexibleTime ?? true,
              }));
              if (data.weeklyTasks![day as WeekDay].some((t, i) => t !== originalTasks[i])) {
                needsUpdate = true;
              }
            }
          });
        }

        if (Array.isArray(data.generalTasks)) {
          const originalTasks = data.generalTasks;
          data.generalTasks = data.generalTasks.map((t) => ({
            ...t,
            baseDuration: t.baseDuration || "",
            flexibleTime: t.flexibleTime ?? true,
          }));
          if (data.generalTasks.some((t, i) => t !== originalTasks[i])) {
            needsUpdate = true;
          }
        }
        if (Array.isArray(data.dayTasks)) {
          const originalTasks = data.dayTasks;
          data.dayTasks = data.dayTasks.map((t) => ({
            ...t,
            baseDuration: t.baseDuration || "",
            aiDuration: t.aiDuration || "",
            flexibleTime: t.flexibleTime ?? true,
          }));
          if (data.dayTasks.some((t, i) => t !== originalTasks[i])) {
            needsUpdate = true;
          }
        }

        // Si se hicieron cambios, actualizar el documento. La bandeja NO se escribe aquí: se
        // normaliza después en memoria (si faltaba, no hace falta crear el campo).
        if (needsUpdate) {
          const { inboxTasks: _inbox, ...toSave } = data;
          void _inbox;
          await setDoc(userDocRef, removeUndefinedFields(toSave), { merge: true });
        }
        data.inboxTasks = asInboxTasks(data.inboxTasks);
      }
      return data as UserData;
    } else {
      return null;
    }
  }, { component: 'FirestoreService', operation: 'getUserData', uid });
};

export const createUserDocument = async (userData: UserData) => {
  return withErrorHandling(async () => {
    if (!db) {
      throw new FirebaseError("Firebase database not initialized", undefined, {
        component: 'FirestoreService',
        operation: 'createUserDocument',
        uid: userData.uid
      });
    }

    const userDocRef = doc(db, "users", userData.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      // Asegurar que weeklyTasks esté inicializado
      const userDataToSave = {
        ...userData,
        weeklyTasks: userData.weeklyTasks || {
          all: [],
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        },
        generalTasks: userData.generalTasks.map(t => ({ ...t })),
        dayTasks: userData.dayTasks.map(t => ({ ...t })),
      };
      await setDoc(userDocRef, removeUndefinedFields(userDataToSave));
    }
  }, { component: 'FirestoreService', operation: 'createUserDocument', uid: userData.uid });
};

export const createDefaultUserDocument = async (uid: string, email: string | null) => {
  return withErrorHandling(async () => {
    console.log("🚀 ~ createDefaultUserDocument ~ string:", {uid,email})
    const defaultUserData: UserData = {
      uid,
      email,
      endOfDay: "22:00",
      generalTasks: [],
      dayTasks: [],
      weeklyTasks: {
        all: [],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      },
      calendarTasks: [],
        taskCompletionsByProgressId: {},
        onboardingCompleted: false,
        aiPlanner: { days: {} },
        inboxTasks: []
    };

    await createUserDocument(defaultUserData);
    return defaultUserData;
  }, { component: 'FirestoreService', operation: 'createDefaultUserDocument', uid });
};

export const updateUserData = async (uid: string, data: Partial<UserData>) => {
  return withErrorHandling(async () => {
    if (!db) {
      throw new FirebaseError("Firebase database not initialized", undefined, {
        component: 'FirestoreService',
        operation: 'updateUserData',
        uid
      });
    }

    const userDocRef = doc(db, "users", uid);
    // Solo incluir campos que se están actualizando para evitar sobrescribir con undefined
    const dataToUpdate: Partial<UserData> = {};

    if (data.weeklyTasks !== undefined) {
      dataToUpdate.weeklyTasks = data.weeklyTasks;
    }
    if (data.generalTasks !== undefined) {
      dataToUpdate.generalTasks = data.generalTasks.map(t => ({ ...t }));
    }
    if (data.dayTasks !== undefined) {
      dataToUpdate.dayTasks = data.dayTasks.map(t => ({ ...t }));
    }
    if (data.calendarTasks !== undefined) {
      dataToUpdate.calendarTasks = data.calendarTasks.map(t => ({ ...t }));
    }
    if (data.taskCompletionsByProgressId !== undefined) {
      dataToUpdate.taskCompletionsByProgressId = data.taskCompletionsByProgressId;
    }
    if (data.onboardingCompleted !== undefined) {
      dataToUpdate.onboardingCompleted = data.onboardingCompleted;
    }
    if (data.phoneNumber !== undefined) {
      dataToUpdate.phoneNumber = data.phoneNumber;
    }
    if (data.whatsappConfigured !== undefined) {
      dataToUpdate.whatsappConfigured = data.whatsappConfigured;
    }
    if (data.whatsappConfiguredAt !== undefined) {
      dataToUpdate.whatsappConfiguredAt = data.whatsappConfiguredAt;
    }
    if (data.endOfDay !== undefined) {
      dataToUpdate.endOfDay = data.endOfDay;
    }
    if (data.email !== undefined) {
      dataToUpdate.email = data.email;
    }
    if (data.aiPlanner !== undefined) {
      dataToUpdate.aiPlanner = removeUndefinedFields(data.aiPlanner);
    }
    if (data.aiUsage !== undefined) {
      dataToUpdate.aiUsage = data.aiUsage;
    }
    // inboxTasks NO va aquí a propósito: casi todas las llamadas pasan el userData entero (posiblemente
    // viejo) y pisarían lo que agregó otra app a la bandeja. Se escribe solo con mutateInboxTasks.

    await setDoc(userDocRef, removeUndefinedFields(dataToUpdate), { merge: true });
  }, { component: 'FirestoreService', operation: 'updateUserData', uid });
};

/**
 * Bandeja general: lee el documento FRESCO dentro de una transacción, aplica `updater` a la lista
 * actual y escribe SOLO el campo inboxTasks. Así no se pierde lo que otra app (Kami) agregó mientras
 * la web estaba abierta. Devuelve la lista guardada (para actualizar el estado local).
 */
export const mutateInboxTasks = async (
  uid: string,
  updater: (current: InboxTask[]) => InboxTask[]
): Promise<InboxTask[]> => {
  return withErrorHandling(async () => {
    if (!db) {
      throw new FirebaseError("Firebase database not initialized", undefined, {
        component: 'FirestoreService',
        operation: 'mutateInboxTasks',
        uid
      });
    }
    const userDocRef = doc(db, "users", uid);
    return runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userDocRef);
      const current = snap.exists() ? asInboxTasks(snap.data().inboxTasks) : [];
      const next = removeUndefinedFields(updater(current));
      if (snap.exists()) {
        transaction.update(userDocRef, { inboxTasks: next });
      } else {
        transaction.set(userDocRef, { inboxTasks: next }, { merge: true });
      }
      return next;
    });
  }, { component: 'FirestoreService', operation: 'mutateInboxTasks', uid });
};

/**
 * Plan IA y bandeja recién leídos (al abrir el Plan IA: Kami pudo agregar, asignar o cambiar algo
 * mientras la web tenía cargado el estado del login). aiPlanner falta si el documento no lo tiene.
 */
export const getPlanIaFresh = async (
  uid: string
): Promise<{ aiPlanner?: UserData["aiPlanner"]; inboxTasks: InboxTask[] }> => {
  return withErrorHandling(async () => {
    if (!db) {
      throw new FirebaseError("Firebase database not initialized", undefined, {
        component: 'FirestoreService',
        operation: 'getPlanIaFresh',
        uid
      });
    }
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { inboxTasks: [] };
    const data = snap.data();
    const planner = data.aiPlanner as UserData["aiPlanner"] | undefined;
    return {
      ...(planner && typeof planner === "object"
        ? { aiPlanner: { ...planner, days: planner.days && typeof planner.days === "object" ? planner.days : {} } }
        : {}),
      inboxTasks: asInboxTasks(data.inboxTasks),
    };
  }, { component: 'FirestoreService', operation: 'getPlanIaFresh', uid });
};

// Funciones para manejar tokens FCM
export const saveFCMToken = async (uid: string, token: string) => {
  return withErrorHandling(async () => {
    if (!db) {
      throw new FirebaseError("Firebase database not initialized", undefined, {
        component: 'FirestoreService',
        operation: 'saveFCMToken',
        uid
      });
    }

    const userTokensRef = doc(db, "userTokens", uid);
    const tokenDoc = await getDoc(userTokensRef);

    if (tokenDoc.exists()) {
      const existingTokens = tokenDoc.data().fcmTokens || [];
      // Agregar token si no existe ya
      if (!existingTokens.includes(token)) {
        await updateDoc(userTokensRef, {
          fcmTokens: [...existingTokens, token],
          lastUpdated: new Date().toISOString()
        });
      }
    } else {
      // Crear nuevo documento de tokens
      await setDoc(userTokensRef, {
        fcmTokens: [token],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }
  }, { component: 'FirestoreService', operation: 'saveFCMToken', uid });
};

export const removeFCMToken = async (uid: string, token: string) => {
  return withErrorHandling(async () => {
    if (!db) {
      throw new FirebaseError("Firebase database not initialized", undefined, {
        component: 'FirestoreService',
        operation: 'removeFCMToken',
        uid
      });
    }

    const userTokensRef = doc(db, "userTokens", uid);
    const tokenDoc = await getDoc(userTokensRef);

    if (tokenDoc.exists()) {
      const existingTokens = tokenDoc.data().fcmTokens || [];
      const updatedTokens = existingTokens.filter((t: string) => t !== token);

      if (updatedTokens.length === 0) {
        // Si no quedan tokens, eliminar el documento
        await deleteDoc(userTokensRef);
      } else {
        await updateDoc(userTokensRef, {
          fcmTokens: updatedTokens,
          lastUpdated: new Date().toISOString()
        });
      }
    }
  }, { component: 'FirestoreService', operation: 'removeFCMToken', uid });
};

export const getUserFCMTokens = async (uid: string): Promise<string[]> => {
  return withErrorHandling(async () => {
    if (!db) {
      throw new FirebaseError("Firebase database not initialized", undefined, {
        component: 'FirestoreService',
        operation: 'getUserFCMTokens',
        uid
      });
    }

    const userTokensRef = doc(db, "userTokens", uid);
    const tokenDoc = await getDoc(userTokensRef);

    if (tokenDoc.exists()) {
      return tokenDoc.data().fcmTokens || [];
    }

    return [];
  }, { component: 'FirestoreService', operation: 'getUserFCMTokens', uid });
};
