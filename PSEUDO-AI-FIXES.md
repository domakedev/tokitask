# Revisión: `syncWithPseudoAI` — bugs pendientes de arreglar

Archivo: `src/hooks/useAiSync.ts` (función `syncWithPseudoAI`, líneas 326-779).

Esta es la planificación "local" (sin llamar a Gemini) que distribuye tareas
flexibles en los huecos entre tareas con horario fijo.

---

## Bugs reales (por prioridad de impacto)

### 1. Tareas flexibles truncadas silenciosamente
**Ubicación:** `src/hooks/useAiSync.ts:657-662`

```ts
tareasFlexiblesProcesadas.add(tareaFlexible.id);

if (duracionAUsar < duracionFinal) {
  duracionesFlexibles[tareaFlexible.id] = duracionFinal - duracionAUsar;
}
```

**Problema:** cuando una tarea flexible **no cabe completa** en un slot
(porque una no-flexible sin horario consumió parte del slot antes), se marca
como procesada y se guarda la "duración restante"… pero en FASE 5 el check
`if (!tareasFlexiblesProcesadas.has(...))` (línea 700) la excluye, así que esa
duración restante **nunca se añade**. La tarea queda con menos tiempo del
calculado y el usuario no se entera.

**Fix propuesto:** no marcar como procesada si `duracionAUsar < duracionFinal`,
o moverla a una lista aparte para que FASE 5 la complete al final. Opción más
limpia: separar `tareasFlexiblesProcesadasTotalmente` de
`tareasFlexiblesProcesadasParcialmente`.

---

### 2. Tareas fijas con `startTime` antes de `HORA_INICIO_ALINEADA`
**Ubicación:** `src/hooks/useAiSync.ts:458-460`

```ts
} else if (userTime > start) {
  return { ...tarea, startTime: userTime };
}
```

**Problema:** el ajuste usa `userTime` (no alineado), no
`HORA_INICIO_ALINEADA` (alineada a 10 min). Si `userTime=10:23` y la alineada
es `10:30`, la tarea queda con `startTime=10:23`, que es **anterior** al inicio
alineado del cálculo. Al procesarla en el bucle de slots (línea 469),
`currentTime` (que arranca en `10:30`) ya es mayor que `tareaStart` (`10:23`),
así que no se crea slot libre previo y todos los cálculos de bloques de 10 min
siguientes quedan con offset roto.

**Fix propuesto:** usar
`startTime: HORA_INICIO_ALINEADA` (o `max(userTime, HORA_INICIO_ALINEADA)`).

---

### 3. Doble reserva de tiempo para no-flexibles sin horario
**Ubicación:** `src/hooks/useAiSync.ts:504-510`

```ts
const tiempoReservadoParaNoFlexibles =
  tareasNoFlexiblesSinHorario.reduce(...);
const tiempoDisponibleParaFlexibles =
  tiempoTotalDisponible - tiempoReservadoParaNoFlexibles;
```

**Problema:** se resta el tiempo de las no-flexibles sin horario del
presupuesto de las flexibles, pero en FASE 4 (línea 607) esas no-flexibles
solo se colocan si caben enteras en un slot. Si no caben, se empujan a FASE 5
(línea 674) *después* del horario y pueden **exceder `HORA_FIN`**.

Resultado: los slots intermedios quedan semi-vacíos (las flex recibieron menos
bloques porque "había que reservar") y la no-flex termina rebasando el fin
del día. Ineficiencia + posible warning.

**Fix propuesto:** antes de la FASE 2, verificar si cada no-flexible cabe en
algún slot disponible. Solo reservar el tiempo de las que efectivamente van a
consumir un slot. Las que no quepan, agregarlas a un set aparte y avisar con
warning desde el principio.

---

### 4. Tareas flexibles que rebasan `HORA_FIN` no emiten warning
**Ubicación:** `src/hooks/useAiSync.ts:698-717`

La FASE 5 sí verifica rebase para las no-flexibles (línea 679):

```ts
if (taskEndTime > HORA_FIN) {
  warnings.push(`La tarea "${tareaNoFlexible.name}" excede la hora de fin del día.`);
}
```

**Problema:** el bloque paralelo para flexibles (699-717) no hace la misma
verificación. Si una tarea flexible fue truncada/omitida por falta de espacio
y acaba en FASE 5, puede pasar del fin del día sin avisar.

**Fix propuesto:** añadir el mismo check `if (taskEndTime > HORA_FIN)` en el
bucle de flexibles de FASE 5 y pushear warning al array.

---

## Cosas menores / cosméticas

- **Inconsistencia documental** — `src/hooks/useAiSync.ts:355, 359`: el comentario
  dice *"cuadrícula de 5 minutos"* pero el código usa `% 10`. El bloque es de
  10 min (`BLOCK_SIZE = 10`). Actualizar el comentario.

- **Typo en nombre de variable** — `tareasFixasOrdenadas` (línea 448) está en
  portugués, debería ser `tareasFijasOrdenadas`. Puramente cosmético.

- **Console.logs de debug** — hay varios `console.log("🚀 ~ useAiSync ~ ...")`
  olvidados del debugging:
  - `src/hooks/useAiSync.ts:333`
  - `src/hooks/useAiSync.ts:452`
  - `src/hooks/useAiSync.ts:455`
  - `src/hooks/useAiSync.ts:734`
  - `src/hooks/useAiSync.ts:751`

  Limpiarlos o ponerlos detrás de un flag de desarrollo.

- **Shadowing menor** — la variable local `currentTime` (línea 445) se llama
  igual que la del scope superior del componente. Renombrar a `cursorTime` o
  `slotCursor` mejora legibilidad. No es bug.

---

## Fortalezas del algoritmo (no tocar)

- El método de **largest-remainder** en FASE 3 (líneas 532-541) es el enfoque
  correcto para distribuir bloques enteros de forma proporcional.
- La **redistribución de excedentes** (líneas 543-563) cuando una tarea excede
  `maxBloques` (no podemos darle más tiempo del que el usuario pidió) es un
  detalle fino y bien resuelto.
- Separar tareas fijas con horario, fijas sin horario y flexibles en tres
  pasadas distintas es la descomposición correcta.

---

## Orden recomendado para atacar

1. **Bug #1** (truncado silencioso) — caso común, afecta correctitud visible
   al usuario.
2. **Bug #2** (startTime desalineado) — afecta correctitud cuando el usuario
   sincroniza a una hora arbitraria.
3. **Bug #3 + #4** — afectan casos borde con tareas no-flexibles sin horario
   grandes, y al feedback cuando hay desbordes.
4. Limpieza de console.logs y typos — cosmético, se puede dejar para una
   pasada de limpieza general.
