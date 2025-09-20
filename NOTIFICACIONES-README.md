# 🚀 Configuración de Notificaciones Push para CalendarTasks

Este documento te guía paso a paso para configurar notificaciones automáticas para tus tareas programadas en calendarTasks.

## 📋 ¿Qué hace este sistema?

✅ **Notificaciones automáticas** - Se ejecuta diariamente a las 6:00 AM (hora Perú)
✅ **Solo calendarTasks** - Ignora weeklyTasks y generalTasks
✅ **Funciona con app cerrada** - Notificaciones push nativas
✅ **Multiplataforma** - Android, iOS y navegadores web
✅ **Totalmente automático** - No requiere intervención manual

## 🛠️ Configuración Paso a Paso

### Paso 1: Variables de Entorno

Agrega estas variables a tu `.env.local`:

```env
# VAPID Key para FCM (necesario para web)
NEXT_PUBLIC_VAPID_KEY=tu_vapid_key_aqui

# Obtén tu VAPID Key desde Firebase Console:
# 1. Ve a Project Settings > Cloud Messaging > Web Push certificates
# 2. Genera un nuevo par de claves
# 3. Copia la clave pública aquí
```

### Paso 2: Deploy de Firebase Functions

```bash
# 1. Asegúrate de estar autenticado
firebase login

# 2. Instalar dependencias de functions
cd functions
npm install

# 3. Deploy de las funciones
firebase deploy --only functions
```

### Paso 3: Configurar Cloud Scheduler

El sistema se configura automáticamente después del deploy, pero si necesitas hacerlo manualmente:

```bash
# Ejecutar el script de configuración
cd functions
npm run deploy:scheduler
```

### Paso 4: Agregar el componente a tu app

Agrega el componente `NotificationSettings` en tu página de perfil o configuración:

```tsx
import NotificationSettings from '../components/NotificationSettings';

// En tu componente
<NotificationSettings />
```

### Paso 5: Usar el hook FCM (opcional)

```tsx
import { useFCM } from '../hooks/useFCM';

function MiComponente() {
  const { token, loading, error, requestPermission } = useFCM();

  // El hook se activa automáticamente cuando el usuario se autentica
  // Pero puedes forzar la solicitud manualmente
  const handleRequestPermission = () => {
    requestPermission();
  };

  return (
    <div>
      {token && <p>Token FCM: {token.substring(0, 20)}...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleRequestPermission} disabled={loading}>
        {loading ? 'Activando...' : 'Activar Notificaciones'}
      </button>
    </div>
  );
}
```

## 📱 ¿Cómo funciona?

### Para usuarios web:
1. **Solicitud de permisos** - El navegador pide permiso para notificaciones
2. **Token FCM** - Se obtiene y guarda en Firestore
3. **Notificaciones push** - Se reciben incluso con la app cerrada

### Para móviles (Android/iOS):
1. **PWA Installation** - El usuario debe instalar la app como PWA
2. **Service Worker** - Maneja las notificaciones en background
3. **Notificaciones nativas** - Aparecen como notificaciones del sistema

## 🔧 Comandos Útiles

```bash
# Ver logs de las funciones
firebase functions:log

# Probar localmente
firebase emulators:start --only functions

# Deploy solo functions
firebase deploy --only functions

# Ver estado del proyecto
firebase projects:list

# Configurar scheduler manualmente
gcloud scheduler jobs create http daily-calendar-task-reminder \
  --schedule="0 6 * * *" \
  --time-zone="America/Lima" \
  --uri="https://us-central1-tokitask.cloudfunctions.net/dailyCalendarTaskReminder" \
  --http-method=GET
```

## 🐛 Debugging

### Verificar tokens FCM:
```javascript
// En Firebase Console > Firestore > userTokens
// Deberías ver documentos con tokens FCM
```

### Probar la función manualmente:
```bash
# En Firebase Console > Functions > dailyCalendarTaskReminder
# Haz clic en "Probar función"
```

### Ver logs:
```bash
firebase functions:log --only dailyCalendarTaskReminder
```

## ⚠️ Solución de Problemas

### "No se puede obtener token FCM"
- Verifica que el usuario haya dado permisos de notificación
- Asegúrate de que `NEXT_PUBLIC_VAPID_KEY` esté configurado
- Revisa la consola del navegador para errores

### "Cloud Scheduler no funciona"
- Verifica que la función esté deployada correctamente
- Revisa los permisos de Cloud Scheduler en Google Cloud Console
- Ejecuta `gcloud auth login` si hay problemas de autenticación

### "Notificaciones no llegan"
- Verifica que el token FCM esté guardado en Firestore
- Revisa los logs de la función para errores
- Asegúrate de que la app esté instalada como PWA en móviles

## 📊 Monitoreo

### Firebase Console:
- **Functions** > Logs de `dailyCalendarTaskReminder`
- **Firestore** > Collection `userTokens`
- **Cloud Messaging** > Reportes de entrega

### Google Cloud Console:
- **Cloud Scheduler** > Jobs
- **Cloud Functions** > Métricas

## 🎯 Próximos pasos

1. **Probar con datos reales** - Crea tareas calendarTasks con fecha de hoy
2. **Configurar múltiples horarios** - Para diferentes tipos de recordatorios
3. **Personalizar mensajes** - Basado en prioridad o tipo de tarea
4. **Analytics** - Trackear efectividad de las notificaciones

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `firebase functions:log`
2. Verifica la configuración en Firebase Console
3. Prueba la función manualmente desde Firebase Console
4. Revisa que los tokens FCM estén guardados correctamente

¡Listo! Tu sistema de notificaciones automáticas está configurado. 🎉