# ADR-0009: Puente Vacante→Funcionario (crear el empleado al contratar la vacante)

## Status
Accepted — Sesión 53 (auditoría de sincronización + acoplamiento Vacantes↔Personal).

## Context
Vacantes y Administración de Personal eran dos dominios sin ningún acoplamiento: una vacante podía
llegar a `CONTRATADO` sin que el maestro de empleados se enterara, obligando a Talento Humano a
recapturar a mano a la persona recién contratada (cédula, nombre, cargo, área, fecha) que la vacante
ya tenía. Eso es doble digitación y una fuente de inconsistencia entre módulos que deberían "hablar
el mismo idioma". El dominio de vacantes ya anticipaba el puente: al marcar `CONTRATADO`,
`evaluarFila` exige `cedula`, `nombreNuevo` y `fechaContratacion` (`shared/src/vacantes.ts`) — los
datos para crear el funcionario ya existen, solo faltaba conectarlos.

Un hallazgo reorientó el diseño: **hay tres catálogos de "área"**, no dos. `areas` (10 filas) son las
estaciones de checklist de paz y salvo (no departamentos); `vacante_areas` (17 filas, 0021) es el
catálogo de contratación; y `funcionarios.area_origen` es texto libre con el departamento real de la
persona — y coincide 1:1 con `vacante_areas.nombre` (p. ej. "ADMISIONES, REGISTRO Y CONTROL" aparece
idéntico en ambos). Por eso no se construye una tabla de equivalencia `vacante_areas→areas` (17→10 no
tiene sentido: "Escuela de Negocios" no tiene una estación de checklist natural): se copia el nombre.

## Decision
**Al marcar una vacante como `CONTRATADO` se crea automáticamente el `funcionario` (empleado ACTIVO)
en la MISMA transacción que el INSERT/UPDATE de la vacante.**

- **Mecanismo:** función standalone `crearFuncionarioDesdeVacante(vacante, areaNombre, autor, ex)`
  (`apps/backend/src/infrastructure/db/crearFuncionarioDesdeVacante.ts`), mismo patrón que
  `iniciarTramiteDesvinculacion(args, ex)` — se invoca DENTRO de la transacción del repo, nunca por
  eventos, colas ni triggers de BD. Reusa el tipo `Ejecutor` de `recomputarEstado.ts`.
- **Disparador en infraestructura:** `vacanteRepository.actualizarVacante` envuelve la mutación en
  `db.transaction`, hace `SELECT ... FOR UPDATE` del estado previo y dispara el puente solo en la
  **primera** transición `previo≠CONTRATADO → CONTRATADO` (idempotencia + concurrencia, ADR-0008).
  `crearVacante` cubre el caso —permitido por el contrato HTTP— de una vacante que **nace**
  `CONTRATADO`. El puerto `VacanteRepo` recibe `autor` (como `finalizarContrato`) para auditar.
- **Mapeo de datos:** `documento`=cédula, `nombreCompleto`=nombreNuevo, `cargo`=cargo,
  `fechaIngreso`=fechaContratacion, `jefeInmediato`=jefe. `area_origen` = `vacante_areas.nombre`
  directo (sin tabla de equivalencia); `area_id` (FK a `areas`, checklist de paz y salvo) queda
  `NULL`, igual que en un alta manual. `tipoVinculacion` se resuelve con
  `tipoVinculacionDesdeDedicacion` (`shared`): docentes (TIEMPO_COMPLETO/MEDIO_TIEMPO/CATEDRATICO/
  TUTOR)→`DOCENTE`, `ADMINISTRATIVO`/`OPS` 1:1, resto/`null`→`null` (nullable, TH lo corrige luego).
- **Nuevo BLOQUEO de dominio:** `evaluarFila` exige `areaId` cuando `CONTRATADO` (antes solo AVISO).
  Sin área no hay `area_origen` (columna NOT NULL) — el BLOQUEO garantiza que el puente reciba
  siempre un área no nula. Es coherente con los bloqueos existentes de CONTRATADO.
- **Cédula ya existente como funcionario → `ErrorValidacion`** con rollback completo (la vacante NO
  cambia de estado): pre-chequeo + catch `23505`, mismo patrón que `empleadoRepo.crearEmpleado`.
- **El funcionario nace ACTIVO** (`fecha_retiro` NULL): invisible para Paz y Salvo hasta que se
  finalice el contrato, que usa el flujo existente `finalizarContrato`/`iniciarTramiteDesvinculacion`
  sin distinción de origen (ADR-0003).

## Consequences

### Positive
- Cero doble digitación: contratar una vacante puebla el maestro de Personal en el acto y en vivo
  (Realtime invalida `["personal"]` además de `["vacantes"]`).
- Atomicidad: o se crea la vacante-contratada Y el funcionario, o no se crea nada (misma transacción).
- La coherencia entre módulos queda garantizada en la BD, no por convención.

### Negative
- Marcar `CONTRATADO` ahora exige un área (nuevo BLOQUEO): un flujo que antes permitía contratar sin
  área queda bloqueado. Impacto de UX nulo (el formulario ya captura área como campo primario), pero
  es un cambio de comportamiento observable.
- El puerto `VacanteRepo` cambió su firma (`crearVacante`/`actualizarVacante` reciben `autor`),
  desviándose de la intención inicial de "solo infraestructura"; se prefirió la trazabilidad real de
  auditoría (consistente con `finalizarContrato`).

### Neutral
- `tipoVinculacion` inferido puede quedar impreciso para dedicaciones ambiguas; es nullable y editable
  por TH, así que un default rico pero corregible se prefiere a dejar todo en `null`.
- Deuda conocida menor (no bloqueante): `crearVacanteSchema` (Zod) y el tipo `Vacante` son paralelos;
  se mantienen a mano, sin generación cruzada.

## Alternatives Considered
- **Auto-enlazar a un funcionario existente cuando la cédula ya existe** — rechazado: ocultaría typos
  de cédula y reingresos que Talento Humano debe resolver a mano; bloquear con mensaje claro es más
  seguro.
- **Tabla de equivalencia `vacante_areas→areas`** (idea inicial) — rechazado: son dominios distintos
  (contratación vs. checklist de paz y salvo); `area_origen` ya es 1:1 con `vacante_areas.nombre`.
- **Disparar el puente por evento/trigger de BD** — rechazado: rompe la atomicidad y la trazabilidad
  del caso de uso; el patrón del repo es invocar el puente dentro de la misma transacción.
- **Auto-inscribir al nuevo empleado en inducción (Capacitaciones/Cursos)** — fuera de alcance: es una
  feature nueva, no una corrección de inconsistencia (backlog en `PROGRESO.md`).

## References
- `apps/backend/src/infrastructure/db/crearFuncionarioDesdeVacante.ts`,
  `vacanteRepository.ts` (disparador transaccional), `shared/src/vacantes.ts`
  (`evaluarFila` BLOQUEO de área, `tipoVinculacionDesdeDedicacion`).
- Tests: `shared/tests/vacantes.test.ts`,
  `apps/backend/tests/crearFuncionarioDesdeVacante.integration.test.ts`.
- Relacionado: [ADR-0003](0003-una-tabla-dos-proyecciones.md) (una tabla, dos proyecciones),
  [ADR-0008](0008-concurrencia-optimista-lock-condicional.md) (lock pesimista + transacción).
- `CLAUDE.md` § Dominio; `docs/data/DICCIONARIO-DATOS.md` (Vacantes, funcionarios).
