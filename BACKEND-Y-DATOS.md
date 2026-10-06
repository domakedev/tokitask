# Backend y datos

Fecha de inspeccion: 2026-05-07

## Donde esta el backend

El backend esta repartido en tres zonas:

1. Next API Routes en `src/app/api/*`.
2. Firebase Functions en `functions/index.js`.
3. Firebase Auth y Firestore como servicios backend gestionados.

## API Routes

- `src/app/api/schedule/route.ts`: organiza el horario con Gemini.
- `src/app/api/advice/route.ts`: genera consejo IA para el dia.
- `src/app/api/ai-opinion/route.ts`: analiza el horario general.

Estas rutas se ejecutan del lado servidor en Next.js y protegen llamadas sensibles como Gemini.

## Firebase Functions

Archivo principal:

- `functions/index.js`

Funcion detectada:

- `dailyCalendarTaskReminder`: corre todos los dias a las 6:00 AM, zona `America/Lima`, para revisar tareas de calendario y preparar recordatorios.

Parte de WhatsApp y FCM esta comentada o desactivada, pero la estructura existe.

## Donde se guardan las tareas

Las tareas se guardan en Firestore, coleccion `users`, documento `users/{uid}`.

Campos principales:

- `dayTasks`: tareas del dia actual.
- `generalTasks`: tareas que se repiten todos los dias.
- `weeklyTasks`: tareas por dia de semana.
- `calendarTasks`: tareas programadas para fechas especificas.
- `taskCompletionsByProgressId`: historial de completado para habitos/progreso.
- `aiPlanner`: Plan IA (dias con tareas y microtareas).
- `inboxTasks`: Bandeja general, pendientes SIN dia (para cualquier dia). Puede faltar en documentos viejos (se lee como `[]`).

Estructura mental:

```txt
users
  {uid}
    dayTasks: []
    generalTasks: []
    weeklyTasks: { monday: [], tuesday: [], ... }
    calendarTasks: []
    taskCompletionsByProgressId: {}
    aiPlanner: { selectedDate, days: { "YYYY-MM-DD": {...} } }
    inboxTasks: [{ id, title, priority, estimatedMinutes, completed, createdAt, updatedAt, source? }]
```

### Bandeja general (`inboxTasks`)

- Se ve y se edita en Plan IA (seccion "Bandeja general"): agregar, marcar hecho, eliminar, "Planificar"
  (la IA del Plan IA lo incluye en el dia que estas viendo) y "Asignar" a un dia del Plan IA o al calendario.
- Al asignarlo (a mano o porque la IA lo planifico) sale de la bandeja: primero se guarda la tarea nueva y
  luego se quita de la bandeja (si algo falla queda repetido, nunca perdido).
- `updateUserData` NO escribe `inboxTasks` (casi siempre recibe el `userData` entero y pisaria lo que otra app
  agrego). Solo `mutateInboxTasks` lo escribe: transaccion que relee el documento y actualiza solo ese campo.
  Kami (app movil) usa la misma forma y tambien escribe con transacciones de campo.


## Archivos importantes

- `src/services/firebase.ts`: inicializacion Firebase cliente.
- `src/services/firestoreService.ts`: lectura/escritura Firestore.
- `src/stores/taskStore.ts`: decide si una tarea va a `dayTasks`, `generalTasks`, `weeklyTasks` o `calendarTasks`.
- `src/hooks/useAiSync.ts`: clonado del dia y organizacion IA/local.

## Escritura central

La escritura principal esta en `src/services/firestoreService.ts`, funcion `updateUserData(uid, data)`.

Usa:

```ts
const userDocRef = doc(db, "users", uid);
await setDoc(userDocRef, dataToUpdate, { merge: true });
```
