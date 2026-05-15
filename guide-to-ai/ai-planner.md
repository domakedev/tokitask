# Plan IA - guia tecnica para futuras IA

Fecha de implementacion: 2026-05-14

## Resumen

Se agrego una pagina nueva en `/dashboard/ai-plan` para crear planes diarios separados del flujo actual de tareas. El usuario escribe o dicta pendientes, pulsa `Ordenar mis tareas con IA`, y Gemini devuelve tareas principales con microtareas checkeables.

Esta feature no escribe en `dayTasks`, `generalTasks`, `weeklyTasks` ni `calendarTasks`. Todo vive dentro de `userData.aiPlanner`.

## Rutas y archivos principales

- `src/app/dashboard/ai-plan/page.tsx`: UI principal, dictado por microfono, scroll semanal, checks, modal de detalle y rollover.
- `src/app/api/ai-planner/route.ts`: API server-side que llama a Gemini con `@google/genai` y devuelve JSON estructurado.
- `src/types.ts`: tipos `AiPlannerState`, `AiPlannerDay`, `AiPlannerTask`, `AiPlannerMicrotask` y `AiPlannerPriority`.
- `src/services/firestoreService.ts`: migracion inicial de `aiPlanner` y persistencia en `updateUserData`.
- `src/components/BottomNav.tsx`: nuevo tab `Plan IA` y etiqueta `Horario`.
- `src/components/ConfirmationModal.tsx`: labels opcionales para confirmar/cancelar.
- `src/components/Icon.tsx`: iconos nuevos para Plan IA y se completaron iconos usados por vistas existentes.

## Modelo de datos

`UserData` ahora puede tener:

```ts
aiPlanner?: {
  selectedDate?: string;
  days: Record<string, AiPlannerDay>;
}
```

Cada `AiPlannerDay` guarda:

- `date`: fecha local `YYYY-MM-DD`.
- `sourceText`: texto original escrito o dictado por el usuario.
- `createdAt`, `updatedAt`: timestamps ISO.
- `endOfDay`: hora de fin del dia usada en ese plan.
- `tasks`: tareas del plan de ese dia.
- `coachMessages`: mensajes breves devueltos por IA o generados por el flujo.
- `rolloverPromptSeenAt`: evita preguntar dos veces por el mismo rollover.

Cada `AiPlannerTask` guarda historial:

- `startedDate`: fecha donde nacio la tarea.
- `assignedDate`: fecha donde esta asignada esa instancia.
- `movedFromDates`: fechas desde las que fue movida.
- `movedToDate`: si esta instancia se movio a otro dia.
- `archivedAt`: si el usuario decidio no moverla.
- `completedAt`: cuando se completo.
- `microtasks`: checks internos con su propio `completedAt`.

## Flujo de IA

La IA solo se ejecuta cuando el usuario pulsa `Ordenar mis tareas con IA` o `Actualizar Plan IA`.

`sourceText` funciona como memoria editable del dia: se guarda en `AiPlannerDay.sourceText`, se vuelve a cargar en el textarea al cambiar de dia o recargar, y no se limpia despues de generar. El textarea tiene un boton `Limpiar texto` que borra solo el texto visible del input; no borra por si solo el `sourceText` guardado hasta que se vuelva a generar o actualizar el plan.

La pagina envia a `/api/ai-planner`:

- texto libre del usuario,
- fecha seleccionada,
- hoy,
- manana,
- hora actual,
- `endOfDay`,
- tareas existentes del dia seleccionado,
- `mode`: `create`, `append` o `replace`.

Modos:

- `create`: se usa cuando el dia no tiene tareas; crea el plan inicial.
- `append`: se usa cuando ya hay plan y el usuario elige `Agregar al plan`; suma tareas nuevas al final sin borrar tareas existentes.
- `replace`: se usa cuando ya hay plan y el usuario confirma `Rehacer pendientes`; conserva completadas, movidas y archivadas, y reemplaza solo pendientes activas.

En modo `append`, la API recibe `existingTasks` para que Gemini evite duplicar tareas que ya esten representadas en el plan actual.

La API devuelve:

- `tasks`: tareas ordenadas con prioridad, tiempo estimado, razon y microtareas.
- `coachMessages`: 2 o 3 mensajes breves.

Marcar checks no llama a Gemini ni reordena. Solo actualiza Firestore.

## Edicion manual de tareas

La pagina permite ajustes manuales sobre el plan ya generado, sin volver a llamar a Gemini:

- editar tarea: titulo, prioridad, minutos estimados y motivo/nota IA,
- eliminar tarea completa con confirmacion,
- editar microtarea: titulo y minutos estimados,
- eliminar microtarea con confirmacion,
- agregar microtarea nueva a una tarea existente.

Estos cambios actualizan `updatedAt` del dia y de la tarea afectada, y se persisten dentro de `userData.aiPlanner`. No modifican `sourceText`, no regeneran el orden y no escriben en `dayTasks`, `generalTasks`, `weeklyTasks` ni `calendarTasks`.

Las acciones manuales se ocultan para instancias historicas bloqueadas (`movedToDate` o `archivedAt`) para conservar el historial de rollover. El modal de detalle tambien permite iniciar edicion o eliminacion de la tarea cuando la instancia no esta bloqueada.

## Persistencia y limpieza de Firestore

Firestore no acepta campos con valor `undefined`. La feature usa muchos campos opcionales (`completedAt`, `movedToDate`, `archivedAt`, `rolloverPromptSeenAt`), asi que `src/services/firestoreService.ts` incluye `removeUndefinedFields`.

Ese helper limpia objetos y arrays antes de `setDoc` en:

- migraciones dentro de `getUserData`,
- creacion de documentos con `createUserDocument`,
- actualizaciones parciales con `updateUserData`.

Si se agregan nuevos campos opcionales a `aiPlanner`, deben seguir siendo opcionales en TypeScript, pero nunca se debe asumir que Firestore guardara `undefined`; se omite el campo.

El fetch de `/api/ai-planner` en la pagina tambien acepta errores en JSON o texto plano, porque Next dev puede devolver `Internal Server Error` sin cuerpo JSON cuando la ruta falla antes del `catch`.

## Dictado por microfono

La pagina usa Web Speech API del navegador:

- `window.SpeechRecognition`
- `window.webkitSpeechRecognition`

No se agregaron dependencias. En navegadores no compatibles, el boton queda deshabilitado y muestra una nota. En produccion normalmente requiere HTTPS y permisos del navegador.

El dictado agrega el transcript al textarea. Luego el usuario puede editarlo antes de generar el plan.

Mientras escucha, el textarea muestra una barra inferior integrada con estado `Escuchando...`, texto provisional truncado y un control esmeralda con barras dinamicas mas el icono de detener cuadrado. Las barras usan un medidor real de voz con `navigator.mediaDevices.getUserMedia` + `AnalyserNode` cuando el navegador lo permite; si no se puede leer el nivel de audio, se mantiene un estado visual basico de escucha.

La pagina usa `interimResults` para mostrar texto provisional debajo del textarea mientras el usuario dicta. Solo los resultados finales se agregan al textarea.

## Historial semanal y rollover

La pagina tiene un scroll horizontal de la semana calculado desde la fecha seleccionada. No usa `CalendarView`, porque `CalendarView` es una agenda horaria para `DayTask`.

Si existe un dia vencido con tareas pendientes:

1. Se muestra un modal de confirmacion.
2. `Pasar pendientes` crea copias para el dia siguiente.
3. La instancia vieja queda con `movedToDate`.
4. La nueva instancia conserva `startedDate` y agrega la fecha vieja en `movedFromDates`.
5. `No, archivar` marca pendientes con `archivedAt` y no las mueve.

Esto permite ver en un dia pasado si una tarea quedo completada, pendiente, archivada o movida.

## Modal de detalle

El modal de tarea muestra:

- titulo,
- prioridad,
- tiempo estimado,
- estado,
- texto original,
- timeline con inicio, asignacion, movimientos, archivo, completado y microtareas completadas,
- lista completa de microtareas.

## Regla de mantenimiento

Si una futura IA modifica esta feature, debe actualizar este archivo con:

- archivos nuevos o modificados,
- cambios de modelo de datos,
- cambios de API,
- cambios de rollover,
- cambios de dictado,
- nuevas pruebas o riesgos.
