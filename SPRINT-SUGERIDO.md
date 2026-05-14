# Primer sprint sugerido

Fecha de inspeccion: 2026-05-07

## Objetivo

Mejorar la experiencia del usuario sin rehacer la arquitectura. Enfocarse en desbloquear flujos, reducir confusion y dar feedback mas claro.

## Tareas sugeridas

1. Corregir navegacion de Progreso.
   - Hacer que el CTA del estado vacio lleve a Horario/Rutina.

2. Corregir estados vacios de Hoy.
   - Considerar `generalTasks`, `weeklyTasks` del dia actual y `calendarTasks` de hoy.

3. Simplificar CTAs de Hoy.
   - Agrupar acciones en un flujo: `Preparar mi dia`, luego opciones de organizacion.

4. Simplificar el modal de tarea.
   - Crear vista basica.
   - Mover horario fijo, prioridad, flexibilidad y habito a opciones avanzadas.

5. Cambiar toasts tecnicos.
   - Reemplazar mensajes con "DB" o "base de datos" por lenguaje de producto.

6. Guardar reordenamiento solo al soltar.
   - Evitar llamadas repetidas a Firestore durante drag.

## Resultado esperado

- Usuario nuevo entiende mejor como empezar.
- Menos botones compitiendo en la pantalla principal.
- Menos mensajes tecnicos.
- Menor riesgo de lentitud o escrituras excesivas.
- Base mas clara para mejorar habitos y progreso despues.
