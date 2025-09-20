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
      if (data) {
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
        }

        // Migrar weeklyTasks para agregar flexibleTime
        if (data.weeklyTasks) {
          Object.keys(data.weeklyTasks).forEach((day) => {
            if (Array.isArray(data.weeklyTasks![day as WeekDay])) {
              data.weeklyTasks![day as WeekDay] = data.weeklyTasks![day as WeekDay].map((t) => ({
                ...t,
                baseDuration: t.baseDuration || "",
                flexibleTime: t.flexibleTime ?? true,
              }));
            }
          });
        }

        if (Array.isArray(data.generalTasks)) {
          data.generalTasks = data.generalTasks.map((t) => ({
            ...t,
            baseDuration: t.baseDuration || "",
            flexibleTime: t.flexibleTime ?? true,
          }));
        }
        if (Array.isArray(data.dayTasks)) {
          data.dayTasks = data.dayTasks.map((t) => ({
            ...t,
            baseDuration: t.baseDuration || "",
            aiDuration: t.aiDuration || "",
            flexibleTime: t.flexibleTime ?? true,
          }));
        }
      }
      return data as UserData;
    } else {
      ErrorLogger.log(
        new FirebaseError("User document not found", undefined, {
          component: 'FirestoreService',
          operation: 'getUserData',
          uid
        })
      );
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
    // Asegurar que weeklyTasks y calendarTasks estén incluidos si se están actualizando
    const dataToUpdate = {
      ...data,
      weeklyTasks: data.weeklyTasks,
      generalTasks: data.generalTasks?.map(t => ({ ...t })),
      dayTasks: data.dayTasks?.map(t => ({ ...t })),
      calendarTasks: data.calendarTasks?.map(t => ({ ...t })),
    };
    await updateDoc(userDocRef, dataToUpdate);
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
