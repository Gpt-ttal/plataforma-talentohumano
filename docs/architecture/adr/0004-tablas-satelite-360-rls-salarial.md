# ADR-0004: Tablas satélite para la Hoja de Vida 360° + RLS del bloque salarial

## Status
Accepted — Sesión 32 (Personal v2, migración 0010).

## Context
La Hoja de Vida 360° añade ~36 campos por empleado (datos personales, familiares, formación,
experiencia, salarial, contractual extendido). Meterlos como columnas nullables en `funcionarios`
inflaría la tabla maestra, mezclaría datos de sensibilidad muy distinta (el salario junto al nombre),
y complicaría aplicar control de acceso fino. El bloque salarial, en particular, **no puede** ser
visible para todos los roles.

## Decision
**Repartir el expediente en tablas satélite por afinidad y sensibilidad**, no como columnas de
`funcionarios`:
- **En `funcionarios`**: solo el bloque **contractual** extendido (no sensible): `area_id`,
  `tipo_contrato`, `modalidad`, `programa`, `escalafon`, `jefe_inmediato`, `fecha_primer_ingreso`,
  `foto_path`.
- **1-1**: `empleado_personales`, `empleado_salarial`.
- **1-N**: `empleado_familiares`, `empleado_formacion`, `empleado_experiencia`.
- **`empleado_salarial` está AISLADA con RLS estricta**: SELECT solo SUPERADMIN/TALENTO_HUMANO vía la
  función `ve_salarial()`. **Defensa en profundidad de 3 capas**: (1) RLS de BD, (2) decisión en el
  caso de uso `obtenerExpedientePersonal` con el helper `veSalarial(rol)`, (3) la UI muestra
  "restringido". El campo `salarialVisible` del `ExpedienteCompleto` distingue "restringido"
  (`salarial === undefined`) de "visible pero vacío" (`salarial === null`).

Campos derivados (edad, antigüedad, grupo etario, rango salarial) son **funciones puras**, nunca
columnas.

## Consequences

### Positive
- `funcionarios` no se infla con 36 columnas nullables mayormente vacías.
- El dato más sensible (salario) tiene su propia frontera de acceso, no depende de recordar filtrar
  un campo en cada query.
- OPS (honorarios) y admin/docente (salario/EPS/AFP) conviven en la misma tabla con todo nullable.

### Negative
- `obtenerExpediente` lee empleado + 5 satélites (en paralelo) — más queries que una sola tabla.
- Requirió migración con RLS + función `ve_salarial` + 5 policies (más superficie que columnas planas).

### Neutral
- El ETL v2 puebla los satélites con COALESCE (solo rellena huecos, nunca pisa ediciones manuales) e
  inserción insert-once para los 1-N sin clave natural.

## Alternatives Considered
- **36 columnas nullables en `funcionarios`** — rechazado: infla la tabla maestra y no permite RLS
  fina sobre el salario (RLS es por fila/tabla, no por columna de forma cómoda).
- **Un solo `jsonb` de expediente** — rechazado: pierde tipado, constraints y la posibilidad de RLS
  y de queries relacionales sobre familiares/formación.

## References
- `apps/backend/src/infrastructure/db/schema.ts:432-503`, `shared/src/domain.ts:350-508`.
- Migración `0010_hoja_de_vida_360.sql`, `0011_storage_fotos_empleados.sql`.
- `CLAUDE.md` § Log — Sesiones 32–33.
