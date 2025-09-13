import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, firebaseInitializationError } from "../services/firebase";
import { getUserData } from "../services/firestoreService";
import { UserData } from "../types";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const handleSignOut = async () => {
    if (!auth) {
      console.error("Sign Out Error: Firebase auth is not initialized.");
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign Out Error:", error);
    }
  };

  return {
    user,
    userData,
    loading,
    authError,
    handleSignOut,
    setUserData,
  };
};