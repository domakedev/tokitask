import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { UserData, WeekDay, GeneralTask, DayTask } from "../types";
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
}

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

        // Si se hicieron cambios, actualizar el documento
        if (needsUpdate) {
          await setDoc(userDocRef, data, { merge: true });
        }
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
      await setDoc(userDocRef, userDataToSave);
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
      onboardingCompleted: false
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

    await setDoc(userDocRef, dataToUpdate, { merge: true });
  }, { component: 'FirestoreService', operation: 'updateUserData', uid });
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
