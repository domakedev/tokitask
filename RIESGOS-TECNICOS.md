# Riesgos tecnicos que afectan UX

Fecha de inspeccion: 2026-05-07

## Riesgos detectados

1. Dependencias faltantes en hooks.
   - Pueden producir datos desactualizados en flujos de calendario, progreso o auth.

2. Mucha logica de negocio mezclada.
   - Hay logica repartida entre paginas, hooks y stores.
   - Esto dificulta mantener coherencia cuando se modifica guardar, eliminar, completar o clonar tareas.

3. Duplicacion de logica en General.
   - Algunas operaciones de guardar/eliminar tareas estan duplicadas entre la pagina General y `taskStore`.

4. Habitos agrupados por nombre exacto.
   - El `progressId` ayuda al tracking, pero el agrupamiento por nombre puede romperse si el usuario cambia una letra.

5. Retroalimentacion demasiado tecnica.
   - Mensajes como "DB" o "base de datos" afectan la confianza y hacen que la app se sienta menos pulida.

6. Reordenamiento con demasiadas escrituras.
   - Guardar durante `dragEnter` puede volver lenta la UI y aumentar operaciones en Firestore.

7. Calendario diario con solapamientos.
   - Las tareas pueden superponerse visualmente y parecer perdidas o ilegibles.

## Verificacion tecnica

- `npm run lint`: sin errores, 90 warnings.
- `npm run build`: build exitoso.

## Warnings a limpiar primero

- Dependencias faltantes en `useEffect`, `useMemo` y `useCallback`.
- Imports y variables sin usar en paginas principales.
- Handlers o estados no usados que sugieren codigo viejo.
