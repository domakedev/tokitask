import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, firebaseInitializationError } from "../services/firebase";
import { getUserData } from "../services/firestoreService";
import { UserData } from "../types";
import { useAuthStore } from "../stores/authStore";
import { useScheduleStore } from "../stores/scheduleStore";
import { useProgressStore } from "../stores/progressStore";

export const useAuth = () => {
  const { user, userData, loading, authError, setUser, setUserData, setLoading, setAuthError, handleSignOut } = useAuthStore();
  const { setEndOfDay, setDayTasks, setGeneralTasks, setWeeklyTasks, setCalendarTasks } = useScheduleStore();
  const { setTaskCompletionsByProgressId, setOnboardingCompleted } = useProgressStore();

  useEffect(() => {
    if (firebaseInitializationError) {
      setLoading(false);
      return;
    }

    if (!auth) {
      setAuthError("Error de autenticación.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        try {
          const data = await getUserData(currentUser.uid);
          setUserData(data);
          // Inicializar stores con userData
          if (data) {
            setEndOfDay(data.endOfDay);
            setDayTasks(data.dayTasks);
            setGeneralTasks(data.generalTasks);
            setCalendarTasks(data.calendarTasks || []);
            setWeeklyTasks(data.weeklyTasks);
            setTaskCompletionsByProgressId(data.taskCompletionsByProgressId || {});
            setOnboardingCompleted(data.onboardingCompleted || false);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setAuthError("No se pudieron cargar los datos del usuario.");
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  return {
    user,
    userData,
    loading,
    authError,
    handleSignOut,
    setUserData,
  };
};