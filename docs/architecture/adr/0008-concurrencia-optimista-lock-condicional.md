# ADR-0008: Concurrencia con lock pesimista + UPDATE condicional, no locks distribuidos

## Status
Accepted — spec de plataforma (Sesión 24); reforzado en la remediación de la Sesión 43.

## Context
Varias áreas trabajan el mismo trámite y varias personas pueden actuar casi a la vez: dos áreas
aprobando en paralelo (recálculo del estado global), el relevo TH→CI (dos hitos que no deben
pisarse), el reordenamiento de módulos/lecciones de un curso, dos confirmaciones del mismo lote de
importación. La escala real es modesta (~30–40 retiros/mes, 1–2 personas por área, raramente todas
a la vez): un sistema de locks distribuido (Redis, colas) sería sobre-ingeniería.

## Decision
**La concurrencia se garantiza en la BD, dimensionada a la escala real:**
- **Lock pesimista** donde hay lectura-luego-escritura del mismo agregado:
  `SELECT ... FOR UPDATE` sobre la fila raíz del scope antes de leer/escribir
  (`cambiarEstadoArea`, `registrarNovedad`, reordenamiento de cursos, confirmación de lote).
- **UPDATE condicional (optimista)** donde hay un "estado esperado":
  `UPDATE ... WHERE estado_global = <esperado> RETURNING` para los hitos TH→CI y las transiciones de
  estado de registro de cursos → detecta el conflicto TOCTOU (0 filas afectadas = alguien ya cambió
  el estado) sin bloquear.
- El recálculo del estado global ocurre **en la misma transacción** que la mutación
  (`recomputarEstado` dentro de la `tx`).

**Estas transacciones no se tocan sin TDD previo.** Los tests de concurrencia son de integración,
gated por `DATABASE_URL_TEST` (corren N iteraciones en paralelo contra una BD real).

## Consequences

### Positive
- Sin infraestructura extra (Redis, colas): la garantía vive en Postgres, que ya está ahí.
- Dos acciones concurrentes sobre el mismo agregado se serializan o una recibe un conflicto claro.
- La idempotencia (doble-submit, reintento de red) se cubre con `onConflictDoNothing` + UNIQUE.

### Negative
- Un `SELECT ... FOR UPDATE` serializa a los que tocan el mismo agregado (aceptable a esta escala).
- Un caso raro de deadlock en el swap-sentinela de reordenamiento (SA-only) se acepta/difiere
  (hallazgo M3 de la auditoría, Sesión 41) — mitigación solo si se materializa.

### Neutral
- El pool de conexiones del backend es pequeño (`max:1` en tests) — refuerza correr recálculos en
  lote en vez de N queries en loop (hallazgo I3, Sesión 40).

## Alternatives Considered
- **Locks distribuidos (Redis) / colas de trabajo** — rechazado: sobre-ingeniería para la escala
  real; añade infraestructura y modos de fallo que no se justifican con 30–40 retiros/mes.
- **Optimistic concurrency con columna `version` en todas las tablas** — considerado; se usa la
  variante `WHERE estado_esperado` donde hay un estado natural, sin añadir una columna de versión
  genérica que no aporta sobre el estado ya modelado.

## References
- `apps/backend/src/infrastructure/db/funcionario/tramiteRepo.ts`, `recomputarEstado.ts`.
- Tests: `concurrencia-estadoArea.integration.test.ts`, `concurrencia-cursos.integration.test.ts`,
  `concurrencia-personal.integration.test.ts`, `idempotencia-crear.integration.test.ts`.
- Spec `docs/superpowers/specs/2026-06-30-plataforma-multi-modulo-concurrencia-design.md`.
- `CLAUDE.md` § Arquitectura de Plataforma; § Log — Sesiones 12, 40, 43.
