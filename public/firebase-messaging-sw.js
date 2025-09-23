// // Firebase Cloud Messaging Service Worker - DESACTIVADO
// importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// // Configuración de Firebase
// // IMPORTANTE: Reemplaza estos valores con tu configuración real de Firebase
// // Puedes encontrar estos valores en:
// // 1. Firebase Console > Project Settings > General > Your apps > Web app
// // 2. O en tu archivo .env.local (NEXT_PUBLIC_* variables)

// const firebaseConfig = {
//   apiKey: "AIzaSyAKiaUI8I9JGiU8lXa4fZIB8vAiMFKOZQY",
//   authDomain: "tokitask-com.firebaseapp.com",
//   projectId: "tokitask-com",
//   storageBucket: "tokitask-com.firebasestorage.app",
//   messagingSenderId: "87759718720",
//   appId: "1:87759718720:web:51923ff2380bd6ca1e12a5",
//   measurementId: "G-WK74VED9LG"
// };

// // Inicializar Firebase
// firebase.initializeApp(firebaseConfig);

// // Inicializar Firebase Messaging
// const messaging = firebase.messaging();

// // Manejar mensajes en segundo plano
// messaging.onBackgroundMessage((payload) => {
//   console.log('📱 Mensaje recibido en segundo plano:', payload);

//   const notificationTitle = payload.notification?.title || 'Nueva notificación';
//   const notificationOptions = {
//     body: payload.notification?.body || 'Tienes una nueva notificación',
//     icon: payload.notification?.icon || '/icon-192.png',
//     badge: '/badge-72.png',
//     data: payload.data,
//     tag: payload.data?.type || 'default',
//     requireInteraction: false,
//     silent: false
//   };

//   // Mostrar notificación nativa
//   self.registration.showNotification(notificationTitle, notificationOptions);
// });

// // Manejar clics en notificaciones
// self.addEventListener('notificationclick', (event) => {
//   console.log('🔔 Notificación clickeada:', event);

//   event.notification.close();

//   // Abrir la app cuando se hace clic en la notificación
//   event.waitUntil(
//     clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
//       // Si ya hay una ventana abierta, enfocarla
//       for (let client of windowClients) {
//         if (client.url.includes(self.location.origin) && 'focus' in client) {
//           return client.focus();
//         }
//       }

//       // Si no hay ventana abierta, abrir una nueva
//       if (clients.openWindow) {
//         return clients.openWindow('/');
//       }
//     })
//   );
// });

// // Manejar instalación del Service Worker
// self.addEventListener('install', (event) => {
//   console.log('🔧 Service Worker instalado');
//   self.skipWaiting();
// });

// // Manejar activación del Service Worker
// self.addEventListener('activate', (event) => {
//   console.log('🚀 Service Worker activado');
//   event.waitUntil(clients.claim());
// });

// // Manejar mensajes push (opcional, para debugging)
// self.addEventListener('push', (event) => {
//   console.log('📨 Push recibido:', event);

//   if (event.data) {
//     const data = event.data.json();
//     console.log('📨 Datos del push:', data);
//   }
// });