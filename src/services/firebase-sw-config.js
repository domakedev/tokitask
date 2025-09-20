// Configuración compartida para Firebase (usada por el Service Worker y la app)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY || "TU_API_KEY_AQUI",
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN || "TU_PROJECT_ID.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "TU_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET || "TU_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID || "TU_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_APP_ID || "TU_APP_ID",
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID || "TU_MEASUREMENT_ID"
};

// Exportar para uso en la app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}

// Exportar para uso en el navegador
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}