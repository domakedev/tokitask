# 🔧 Configuración del Service Worker para Notificaciones Push

## ❌ Error Actual

Si ves este error al activar notificaciones:
```
Messaging: We are unable to register the default service worker.
Failed to register a ServiceWorker for scope ('http://localhost:3000/firebase-cloud-messaging-push-scope')
with script ('http://localhost:3000/firebase-messaging-sw.js'): A bad HTTP response code (404) was received when fetching the script.
```

## ✅ Solución

### Paso 1: Actualizar configuración del Service Worker

El archivo `public/firebase-messaging-sw.js` necesita tu configuración real de Firebase.

#### Opción A: Actualización Manual

1. **Abre el archivo** `public/firebase-messaging-sw.js`
2. **Reemplaza los valores** con tu configuración real:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY_REAL", // De NEXT_PUBLIC_API_KEY
  authDomain: "TU_PROJECT_ID.firebaseapp.com", // De NEXT_PUBLIC_AUTH_DOMAIN
  projectId: "TU_PROJECT_ID", // De NEXT_PUBLIC_PROJECT_ID
  storageBucket: "TU_PROJECT_ID.appspot.com", // De NEXT_PUBLIC_STORAGE_BUCKET
  messagingSenderId: "TU_MESSAGING_SENDER_ID", // De NEXT_PUBLIC_MESSAGING_SENDER_ID
  appId: "TU_APP_ID" // De NEXT_PUBLIC_APP_ID
};
```

#### Opción B: Actualización Automática (Recomendada)

Ejecuta el script de actualización:

```bash
# Asegúrate de tener las variables de entorno configuradas en .env.local
node scripts/update-sw-config.js
```

### Paso 2: Verificar configuración

Asegúrate de que tu `.env.local` tenga todas las variables:

```env
NEXT_PUBLIC_API_KEY=AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_AUTH_DOMAIN=tu-project-id.firebaseapp.com
NEXT_PUBLIC_PROJECT_ID=tu-project-id
NEXT_PUBLIC_STORAGE_BUCKET=tu-project-id.appspot.com
NEXT_PUBLIC_MESSAGING_SENDER_ID=XXXXXXXXXXXX
NEXT_PUBLIC_APP_ID=1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_VAPID_KEY=BPxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 3: Reiniciar el servidor de desarrollo

```bash
# Detén el servidor (Ctrl+C)
# Reinicia Next.js
npm run dev
```

## 🧪 Probar la configuración

### 1. Verificar que el Service Worker se registre

```javascript
// En la consola del navegador
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers registrados:', registrations.length);
  registrations.forEach(reg => console.log(reg.scope));
});
```

### 2. Verificar que Firebase Messaging funcione

```javascript
// En la consola del navegador
import('firebase/messaging').then(({ getMessaging }) => {
  const messaging = getMessaging();
  console.log('Firebase Messaging inicializado:', !!messaging);
});
```

### 3. Probar obtener token FCM

```javascript
// En la consola del navegador
Notification.requestPermission().then(permission => {
  console.log('Permiso de notificación:', permission);
  if (permission === 'granted') {
    // Aquí iría el código para obtener el token
    console.log('✅ Permisos concedidos');
  }
});
```

## 🔍 Debugging

### Si el error persiste:

1. **Verifica que el archivo existe:**
   ```bash
   ls -la public/firebase-messaging-sw.js
   ```

2. **Verifica que Next.js sirva el archivo:**
   - Ve a: `http://localhost:3000/firebase-messaging-sw.js`
   - Deberías ver el código del Service Worker

3. **Limpia el cache del navegador:**
   - Abre DevTools → Application → Storage → Clear storage
   - O ve a: `chrome://settings/clearBrowserData`

4. **Verifica la configuración:**
   ```javascript
   // En la consola del navegador
   console.log('Firebase config:', {
     apiKey: process.env.NEXT_PUBLIC_API_KEY,
     projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
     messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID
   });
   ```

## 📱 Funcionalidades del Service Worker

El Service Worker maneja:

- ✅ **Mensajes en segundo plano** (cuando la app está cerrada)
- ✅ **Notificaciones nativas** del navegador
- ✅ **Clics en notificaciones** (abre la app)
- ✅ **Mensajes push** directos

## 🚀 Próximos pasos

Una vez que el Service Worker funcione:

1. **Activa notificaciones** en tu app
2. **Crea una tarea calendarTask** con fecha de hoy
3. **Espera a las 6:00 AM** o prueba manualmente desde Firebase Console
4. **Recibe notificaciones push** automáticas

## 📞 Soporte

Si sigues teniendo problemas:

1. Verifica que todas las variables de entorno estén configuradas
2. Ejecuta el script de actualización automática
3. Reinicia el servidor de desarrollo
4. Limpia el cache del navegador
5. Revisa la consola del navegador para errores específicos

¡El Service Worker es crucial para que las notificaciones funcionen cuando la app está cerrada! 🔧