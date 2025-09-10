import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Reemplaza estas variables de entorno con tus credenciales reales de Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID
};

let authInstance, dbInstance, googleProviderInstance, initializationError;

try {
  // Validar que las credenciales mínimas existan
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Firebase configuration is missing. Please check your environment variables.");
  }
  
  const app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  googleProviderInstance = new GoogleAuthProvider();

} catch (error) {
  console.error("Firebase Initialization Error:", error);
  initializationError = "Failed to initialize Firebase. Server configuration might be missing.";
}

export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = googleProviderInstance;
export const firebaseInitializationError = initializationError;