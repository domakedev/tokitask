import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";

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

let authInstance, dbInstance, googleProviderInstance, initializationError, appInstance;

try {
  // Validar que las credenciales mínimas existan
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Firebase configuration is missing. Please check your environment variables.");
  }

  const app = initializeApp(firebaseConfig);
  appInstance = app;
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

// Inicializar Messaging solo en el cliente (navegador)
let messagingInstance = null;

if (typeof window !== 'undefined' && appInstance) {
  try {
    messagingInstance = getMessaging(appInstance);
  } catch (error) {
    console.warn("Firebase Messaging no disponible:", error);
  }
}

export const messaging = messagingInstance;

// Función para obtener token FCM
export const getFCMToken = async () => {
  if (!messaging) {
    throw new Error("Firebase Messaging no está disponible");
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("🚀 ~ getFCMToken ~ permission:", permission)

    if (permission !== 'granted') {
      //reset client notifications settings
      await Notification.requestPermission();
      throw new Error("Permiso de notificaciones denegado, por seguridad no se puede activar desde aqui si fue denegado 1 vez, ve a la configuración del navegador o a la izquierda de la barra de direcciones.");
    }

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY
    });

    return token;
  } catch (error) {
    console.error("Error obteniendo token FCM:", error);
    throw error;
  }
};

// Función para escuchar mensajes cuando la app está abierta
export const onMessageListener = (callback: (payload: MessagePayload) => void) => {
  if (!messaging) {
    console.warn("Firebase Messaging no disponible para listener");
    return;
  }

  return onMessage(messaging, (payload) => {
    console.log("📱 Notificación recibida:", payload);
    callback(payload);
  });
};