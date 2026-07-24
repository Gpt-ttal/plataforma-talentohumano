# ADR-0003: "Una tabla, dos proyecciones" (Funcionario / Empleado)

## Status
Accepted — Sesión 28 (Administración de Personal v1).

## Context
El sistema nació resolviendo solo la **salida** de un funcionario (el trámite de Paz y Salvo). Al
llevar el ciclo de vida completo del empleado a la plataforma (correo de la Jefa de TH), hubo que
modelar el "maestro de empleados": todas las personas vinculadas, no solo las que están en retiro.
La opción obvia —una tabla `empleados` nueva y separada de `funcionarios`— duplicaría identidad,
obligaría a sincronizar dos tablas cuando alguien se retira, y arriesgaría inconsistencias.

## Decision
**La tabla `funcionarios` es el maestro único; sirve dos proyecciones discriminadas por la
nulabilidad de `fecha_retiro`:**
- **`Empleado`** (maestro) — TODAS las filas. Nace **ACTIVO**: `fecha_retiro = NULL`, sin
  aprobaciones, **invisible** para Paz y Salvo.
- **`Funcionario`** (trámite) — solo las filas con `fecha_retiro NOT NULL`. Las lecturas de
  supervisión scopean con `isNotNull(fechaRetiro)`.

**"Finalizar contrato" es el PUENTE**: setea `fecha_retiro` → backfill de aprobaciones por área
activa → `recomputarEstado` → la MISMA fila entra a la máquina de estados **intacta**. El ciclo de
vida (`EstadoVinculacion`: ACTIVO / EN_RETIRO / RETIRADO) es **derivado** (función pura en
`personal.ts`), no una columna.

Por eso el tipo `Funcionario` **no cambia**: la nulabilidad de `fecha_retiro` vive solo en la
proyección `Empleado` (ver el comentario extenso en `domain.ts:257-320`).

## Consequences

### Positive
- Cero sincronización entre tablas: retirar a alguien es un `UPDATE` de una columna, no un movimiento.
- La máquina de estados de Paz y Salvo no se tocó — el puente la alimenta sin cambiar sus reglas.
- El scoping aditivo (`fecha_retiro IS NOT NULL`) protege a la supervisión de ver empleados activos.

### Negative
- `funcionarios` acumula columnas de dos dominios (trámite + maestro). Mitigado sacando el 360° a
  tablas satélite (ver ADR-0004).
- Un olvido de scoping en una lectura de supervisión mostraría empleados activos por error (ocurrió
  y se corrigió: hallazgo I2 de la auditoría, Sesión 40).

### Neutral
- `EstadoVinculacion` no persiste; se calcula. Cambiar su regla es cambiar una función pura.

## Alternatives Considered
- **Tabla `empleados` separada** — rechazado: duplica identidad, obliga a sincronizar, arriesga
  inconsistencia entre "el empleado" y "el funcionario en trámite" que son la misma persona.
- **Columna `estado_vinculacion` explícita** — rechazado: sería un tercer estado que mantener
  coherente con `fecha_retiro` + `estado_global`; se deriva de ellos, no se almacena.

## References
- `shared/src/domain.ts:257-320` (comentario de diseño), `personal.ts` (`estadoVinculacion`).
- Migración `0009_administracion_personal.sql`. `CLAUDE.md` § Log — Sesiones 28–31.
