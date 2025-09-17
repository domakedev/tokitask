import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
    // Asegurar que weeklyTasks esté incluido si se está actualizando
    const dataToUpdate = {
      ...data,
      weeklyTasks: data.weeklyTasks,
      generalTasks: data.generalTasks?.map(t => ({ ...t })),
      dayTasks: data.dayTasks?.map(t => ({ ...t })),
    };
    await updateDoc(userDocRef, dataToUpdate);
  }, { component: 'FirestoreService', operation: 'updateUserData', uid });
};
