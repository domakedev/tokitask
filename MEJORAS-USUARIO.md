# Mejoras para el usuario

Fecha de inspeccion: 2026-05-07

## Prioridad alta

1. Arreglar estados vacios y navegacion rota.
   - En `src/app/dashboard/progress/page.tsx`, `ProgressView` recibe `onNavigate={() => {}}`; el CTA del estado vacio no navega.
   - En `DayView`, el estado vacio depende de `generalTasks.length`, pero puede ignorar tareas semanales o de calendario que tambien son clonables.

2. Simplificar el flujo de "Hoy".
   - Hoy compiten muchos CTAs: clonar horario, organizar con IA, organizacion express, pedir consejo y ver calendario.
   - Propuesta: un flujo guiado `Preparar mi dia` -> clonar tareas -> mostrar resumen -> elegir `Organizar con IA` o `Ajuste rapido`.

3. Reducir complejidad del modal de tarea.
   - El modal pide muchos datos desde el inicio.
   - Propuesta: modo basico con nombre, duracion y repeticion; opciones avanzadas para horario fijo, prioridad, flexible/fijo y habito.

4. Cambiar mensajes tecnicos por mensajes humanos.
   - Varios toasts dicen "base de datos" o "DB".
   - Propuesta: usar mensajes como "Tarea guardada", "No se pudo guardar", "Cambios sincronizados".

## Prioridad media

5. Mejorar el modelo de habitos.
   - Ahora los habitos dependen de que el nombre coincida exactamente para agruparse.
   - Propuesta: usar `habitId` estable y permitir agrupar/renombrar sin perder historial.

6. Mostrar progreso de habitos antes de la primera completacion.
   - Progreso solo muestra habitos con al menos una fecha completada.
   - Propuesta: mostrar todos los habitos activos, aunque esten en cero, con CTA "Empieza hoy".

7. Evitar escrituras excesivas al reordenar.
   - `TaskList` llama `onReorder` durante `dragEnter`, lo que puede disparar muchas escrituras.
   - Propuesta: reordenar localmente durante el drag y guardar solo al soltar.

8. Resolver solapamientos en la vista calendario.
   - `CalendarView` reconoce que las tareas solapadas se superponen.
   - Propuesta: columnas por solapamiento, advertencias visuales o agrupacion de conflictos.

## Prioridad baja

9. Pulir navegacion movil.
   - `Configurar Horario` es largo para bottom nav.
   - Propuesta: usar `Horario` o `Rutina`.
   - `Horario General` podria llamarse `Rutinas` para ser mas claro.

10. Aumentar confianza en landing.
    - La landing usa metricas como `85%`, `2.5h`, `95%` sin fuente visible.
    - Propuesta: reemplazarlas por capturas reales, demo interactiva o beneficios verificables.
