import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { UserData, Priority } from "../types";

export const getUserData = async (uid: string): Promise<UserData | null> => {
  if (!db) return null;
  const userDocRef = doc(db, "users", uid);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
  // Adaptar los datos para asegurar que las tareas tengan los nuevos campos
  const data = docSnap.data() as UserData;
  if (data) {
    if (Array.isArray(data.generalTasks)) {
      data.generalTasks = data.generalTasks.map(t => ({
        ...t,
        baseDuration: t.baseDuration || "",
      }));
    }
    if (Array.isArray(data.dayTasks)) {
      data.dayTasks = data.dayTasks.map(t => ({
        ...t,
        baseDuration: t.baseDuration || "",
        aiDuration: t.aiDuration || "",
      }));
    }
  }
  return data;
  } else {
    console.log("No such document for user, creating one.");
    return null;
  }
};

export const createUserDocument = async (userData: UserData) => {
  if (!db) return;
  const userDocRef = doc(db, "users", userData.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) {
    try {
    // Elimina el campo duration y usa los nuevos campos
    const userDataToSave = {
      ...userData,
      generalTasks: userData.generalTasks.map(t => ({ ...t })),
      dayTasks: userData.dayTasks.map(t => ({ ...t })),
    };
    await setDoc(userDocRef, userDataToSave);
    } catch (error) {
      console.error("Error creating user document: ", error);
    }
  }
};

export const updateUserData = async (uid: string, data: Partial<UserData>) => {
  if (!db) return;
  const userDocRef = doc(db, "users", uid);
  try {
  // Elimina el campo duration y usa los nuevos campos
  const dataToUpdate = {
    ...data,
    generalTasks: data.generalTasks?.map(t => ({ ...t })),
    dayTasks: data.dayTasks?.map(t => ({ ...t })),
  };
  await updateDoc(userDocRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating user data: ", error);
  }
};
