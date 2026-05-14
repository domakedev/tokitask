# Inspeccion del proyecto TokiTask

Fecha de inspeccion: 2026-05-07

## Resumen

TokiTask es una app Next.js mobile-first para organizar tareas diarias con IA, plantillas semanales, calendario, progreso de habitos y recordatorios.

No tiene un backend monolitico separado tipo Express o Nest. Usa backend serverless con Next API Routes, Firebase Functions, Firebase Auth y Firestore.

## Stack detectado

- Next.js 15.5.2 con App Router.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- Zustand para estado cliente.
- Firebase Auth y Firestore.
- Firebase Functions para tareas programadas.
- Gemini via `@google/genai`.
- Framer Motion, Three.js y lucide-react.

## Estructura principal

- `src/app`: rutas de la app, landing, login, dashboard y API routes.
- `src/components`: UI principal de tareas, calendario, progreso, perfil, landing y modales.
- `src/hooks`: logica de auth, IA, tareas programadas, temporizador y manejo de tareas.
- `src/stores`: Zustand stores para auth, tareas, horario, progreso y timer.
- `src/services`: Firebase cliente y servicios de Firestore.
- `functions`: Firebase Functions.

## Flujos revisados

- Landing y login con Google.
- Dashboard con navegacion inferior.
- Vista Hoy: clonar horario, organizar con IA, organizacion express, consejo IA, lista/calendario diario.
- Horario General: tareas todos los dias, tareas semanales, tareas por fecha y hora de fin del dia.
- Modal de tareas: duracion, horarios, prioridad, flexible/fijo, habito, dias y fecha.
- Progreso: calendario de habitos, rachas y estadisticas.
- Perfil: email y cierre de sesion.

## Verificacion realizada

- `npm run lint`: pasa sin errores, pero reporta 90 warnings.
- `npm run build`: compila correctamente.

Warnings relevantes:

- Imports y variables sin usar.
- Dependencias faltantes en varios hooks.
- Estados/handlers que parecen obsoletos o desconectados.

## Archivos clave para retomar rapido

- `src/components/DayView.tsx`
- `src/components/GeneralView.tsx`
- `src/components/AddTaskModal.tsx`
- `src/components/ProgressView.tsx`
- `src/components/TaskList.tsx`
- `src/components/TaskListItem.tsx`
- `src/stores/taskStore.ts`
- `src/hooks/useAiSync.ts`
- `src/services/firestoreService.ts`
- `src/app/api/schedule/route.ts`
- `functions/index.js`
