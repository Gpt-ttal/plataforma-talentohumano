# ADR-0005: Máquina de estados pura e intocable sin TDD

## Status
Accepted — desde el diseño original; reafirmada en cada feature que la roza.

## Context
El corazón del sistema es la transición de estado del paz y salvo: cada área da (o no) su visto
bueno, y cuando todas las competentes están "OK" el estado global sube; cualquier rechazo lo
devuelve. Esta lógica es la que garantiza la corrección del trámite. Si vive dispersa entre la UI, el
backend y la BD, cada capa puede discrepar y producir estados inválidos.

## Decision
**`calcularEstadoGlobal` es una función PURA en `shared/src/estado.ts`, fuente única de la regla de
transición.** La UI **nunca** decide una transición: solo refleja lo que el servidor ya calculó.
- Un área en `APROBADO` o `NO_APLICA` cuenta como "OK". Con todas OK, el estado global sube.
  `NO_APROBADO` de cualquier área lo devuelve a `PENDIENTE`.
- Tras cada mutación, `recomputarEstado.ts` recalcula el estado global usando el núcleo puro
  (`decidirRecalculo`, extraído para poder recalcular en lote sin duplicar la regla).
- **`estado.ts` no se toca sin TDD previo.** Cualquier cambio de reglas de negocio escribe primero el
  test (RED), luego la implementación (GREEN). Esta regla es un constraint duro del proyecto.

## Consequences

### Positive
- La regla de negocio se testea exhaustivamente sin BD ni servidor (Vitest sobre `shared`).
- Backend y frontend no pueden discrepar sobre "cuándo sube el estado": ambos leen del mismo cálculo.
- Añadir un estado de área (p. ej. `DEVUELTO_POR_CI` en la Sesión 45) es un cambio con red de tests.

### Negative
- Toda evolución de la regla paga el costo de escribir el test primero (por diseño, no es un defecto).

### Neutral
- El recálculo en lote (`recomputarEstadoEnLote`) reusa el mismo núcleo puro → equivalencia por
  construcción, no una segunda implementación que mantener sincronizada.

## Alternatives Considered
- **Lógica de transición en el backend/repo** — rechazado: no testeable sin BD, y tienta a duplicarla
  en el frontend para UX.
- **Triggers/constraints de Postgres como motor de estado** — rechazado: la regla es más rica que lo
  cómodo en SQL, y quedaría invisible para los tests de dominio. (Sí se usan triggers como red de
  seguridad puntual, p. ej. `fn_archivado_en_requiere_paz_y_salvo`.)

## References
- `shared/src/estado.ts`, `apps/backend/src/infrastructure/db/recomputarEstado.ts`.
- `CLAUDE.md` § Roles y Flujo de Negocio; § Log — Sesiones 40 (extracción `decidirRecalculo`), 45.
