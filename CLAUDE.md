# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tokitask es una web app **mobile-first** (Next.js 15 + React 19) que usa Gemini para generar y reorganizar dinámicamente el horario diario del usuario en función de las tareas pendientes, su duración y la hora actual. Los datos de usuario se persisten en Firestore y las notificaciones push se envían vía FCM + Cloud Functions (con integración opcional de WhatsApp por Twilio).

## Comandos

Gestor de paquetes: **pnpm** (existe `pnpm-lock.yaml`).

```bash
pnpm dev              # Next.js dev server con Turbopack
pnpm build            # Build de producción (Turbopack)
pnpm start            # Servir build
pnpm lint             # ESLint (config eslint-config-next)
pnpm update-sw        # Regenera public/firebase-messaging-sw.js desde .env.local
```

No hay framework de tests configurado.

### Firebase Functions (carpeta `functions/`)

```bash
cd functions
npm run deploy        # firebase deploy --only functions
npm run logs          # firebase functions:log
npm run serve         # emulador local
```

El deploy del scheduler usa `node deploy-scheduler.js`. Las funciones requieren los secrets de Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`) configurados en Firebase.

### Variables de entorno necesarias (`.env.local`)

- `GEMINI_API_KEY` — usado server-side por las rutas `/api/schedule` y `/api/advice`.
- `NEXT_PUBLIC_*` de Firebase (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
- `NEXT_PUBLIC_VAPID_KEY` para FCM web push.

Tras cambiar las variables Firebase hay que ejecutar `pnpm update-sw` para que `public/firebase-messaging-sw.js` quede sincronizado (el service worker no puede leer `process.env`).

## Arquitectura

### Capas

- **`src/app`** — App Router de Next.js. UI bajo `dashboard/{day,general,profile,progress}` con un `layout.tsx` compartido. Las rutas API server-side están en `src/app/api/{schedule,advice}/route.ts` y son las únicas que tocan Gemini (`@google/genai`).
- **`src/stores`** — Estado global con **Zustand**, dividido por dominio: `authStore`, `taskStore`, `scheduleStore`, `progressStore`, `timerStore`. Los stores se llaman entre sí vía `useXxxStore.getState()` (acoplamiento explícito, no inyección). Cualquier mutación que deba persistir llama a `updateUserData` de `firestoreService`.
- **`src/services/firestoreService.ts`** — Única puerta a Firestore. Documento por usuario en `users/{uid}` con forma `UserData` (ver `src/types.ts`). Contiene lógica de migración desde formas legacy del documento.
- **`src/hooks`** — Hooks de orquestación que conectan stores con la UI: `useAuth`, `useTaskManagement`, `useScheduledTasks`, `useAiSync`, `useTimer`, `useFCM`.
- **`src/components`** — Vistas y widgets. Las cuatro vistas principales son `DayView`, `GeneralView`, `ProgressView`, `ProfileView` (enum `Page` en `types.ts`).
- **`src/middleware.ts`** — Sólo matchea `/dashboard/:path*` y actualmente es un passthrough; **toda la auth se hace client-side** vía `authStore` + Firebase Auth.
- **`functions/index.js`** — Cloud Functions v2: `dailyCalendarTaskReminder` (scheduler 6 AM `America/Lima`) que recorre `users` en Firestore y envía notificaciones FCM/WhatsApp basadas en `calendarTasks`.

### Modelo de tareas (clave para entender el dominio)

Definido en `src/types.ts`. Hay tres “colecciones” distintas dentro del mismo doc de usuario:

- **`generalTasks`** — biblioteca base reutilizable de tareas (`GeneralTask`).
- **`weeklyTasks`** — `Record<WeekDay, GeneralTask[]>` indexado por día de la semana (incluye `WeekDay.All` para tareas que aplican todos los días).
- **`calendarTasks`** — tareas atadas a una `scheduledDate` específica (`YYYY-MM-DD`).
- **`dayTasks`** — `DayTask[]`, el horario *materializado* del día actual. Estas son las únicas con `aiDuration` (asignada por Gemini) además de `baseDuration` (la del usuario), `isCurrent` y `completed`.

`progressId` es un UUID **estable** que sobrevive a clonaciones de tarea (al copiar de general → day, etc.) y es la clave usada por `taskCompletionsByProgressId` para tracking histórico de completitud — no confundir con `id`, que se regenera.

`flexibleTime` indica si Gemini puede modificar la duración. `startTime`/`endTime` cuando están presentes anclan la tarea a horas fijas; el endpoint `/api/schedule` debe respetarlas.

### Flujo IA

1. El usuario abre el día → `useAiSync` arma el payload con `dayTasks` + `endOfDay` + hora actual y llama a `POST /api/schedule`.
2. La ruta usa `@google/genai` con `responseSchema` estructurado (ver `taskSchema` en `src/app/api/schedule/route.ts`) para forzar JSON que mapea 1:1 a `DayTask`.
3. La respuesta sobrescribe `dayTasks` en el store y se persiste vía `firestoreService`.
4. `recalculateCurrentDayTask` (en `taskStore`) marca como `isCurrent` la primera tarea no completada cada vez que cambia el estado.

`/api/advice` es el endpoint paralelo para tips contextuales mostrados en `AiTipCard`.

### Service Worker / FCM

`public/firebase-messaging-sw.js` se genera con `scripts/update-sw-config.js` desde `.env.local`. **No editar a mano** — se sobrescribe. Es necesario para recibir push notifications con la app cerrada. Las notificaciones server-side las dispara `dailyCalendarTaskReminder` en `functions/index.js`.

## Convenciones

- Idioma del producto y los textos UI: **español** (mantener consistencia en strings, enums de etiquetas en `WEEKDAY_LABELS`, etc.).
- Mobile-first: cualquier vista nueva debe pensarse primero para móvil; el layout principal asume `BottomNav`.
- IDs de tareas: usar `generateTaskId()` de `src/utils/idGenerator.ts` (UUID v4), nunca correlativos.
- Errores en services: envolver con `withErrorHandling` y lanzar `FirebaseError` desde `src/utils/errorHandler.ts` para que el `ErrorLogger` capture contexto consistente.
- Para fechas/horas trabajar con los helpers de `src/utils/dateUtils.ts` (incluye `normalizeTime` que también usa la API server-side).
