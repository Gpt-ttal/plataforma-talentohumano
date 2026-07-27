# ADR-0011: RBAC editable (matriz rol × módulo que RESTA sobre `requireRol`)

## Status
Accepted — Sesión 55 (suite de Configuración). Migración `0023_permisos_rol_modulo.sql` **aplicada a
producción el 2026-07-27** (conexión directa, en transacción; registrada como `20260727000023`), con
16 celdas semilla = visibilidad actual. La matriz RBAC está **activa** sin cambio de comportamiento
observable; el fallback a la semilla de `MODULOS` ya no aplica.

## Context
La visibilidad de módulos por rol vivía **solo en código** (`shared/src/modulos.ts`, `MODULOS.rolesQueVen`):
cambiarla exigía un deploy. El usuario pidió poder **editarla desde la Configuración** (adaptando la
matriz RBAC del proyecto SIGAF). Pero este repo tiene **roles fijos** y autorización por `requireRol`
(ADR-0002), no un RBAC granular. El riesgo obvio de un RBAC editable es el **self-lockout**: que el SA
se cierre a sí mismo el acceso a la propia Configuración.

Hecho decisivo (verificado): el rol/estado se **releen de BD en cada request** (`requireAuth`), no del
JWT → un cambio de permisos surte efecto en la siguiente petición **sin re-login**.

## Decision
**Una matriz `permisos_rol_modulo` (rol × módulo → nivel `NINGUNO|LECTURA|ESCRITURA|ADMIN`) que solo
puede RESTAR acceso sobre el piso de `requireRol`, nunca otorgar más.** El enum de roles y las guardas
de rol siguen siendo el piso inamovible; `MODULOS` sigue siendo el catálogo declarativo y la
**semilla/fallback**.

- **Dominio puro** (`shared/src/permisosRbac.ts`, sin I/O): `NivelPermiso`, `nivelSuficiente`,
  `nivelPorDefecto(rol,modulo)` (derivado de `MODULOS.rolesQueVen`: SA→ADMIN, otro visible→ESCRITURA,
  no visible→NINGUNO), `permisosSeedPorDefecto()`, `modulosVisiblesDesdeMatriz()`.
- **Loader con lectura fresca por request** (`cargarMatriz.ts`): sin caché (preserva "cambio sin
  re-login"); merge de las celdas persistidas sobre los defaults; **fallback** a la semilla si la tabla
  no existe (0023 sin aplicar, patrón 0019).
- **Enforcement en dos capas:** (1) middleware `requirePermiso(moduloId, "LECTURA")` montado DESPUÉS de
  `requireRol` en cada router de módulo → bloquea la ruta si el nivel no alcanza; (2) endpoint
  `GET /api/permisos/mios` que alimenta el filtrado de sidebar/lanzador en el frontend (derivado del rol
  **efectivo**, respeta la impersonación del SA). El frontend solo **filtra** lo que ya existe; nunca
  agrega.
- **Anti-lockout (triple):** el router de permisos se gobierna por `requireRol("SUPERADMIN")`, **NUNCA**
  por la propia matriz → la Configuración no puede cerrarse a sí misma. El caso de uso rechaza editar el
  rol `SUPERADMIN` (inmutable, 400). La UI deshabilita la columna del SA.
- **`modulo_id` es `text` sin FK/CHECK:** `MODULOS` es código, no una tabla; validar contra BD forzaría
  una migración por módulo nuevo y duplicaría la fuente de verdad. Se valida en la aplicación (zod refina
  contra `MODULOS`).

## Consequences

### Positive
- La visibilidad de módulos por rol se edita sin deploy y surte efecto en la siguiente acción.
- La matriz no puede otorgar más de lo que el rol ya permitía: es defensa, no puerta trasera.
- Merge-safe: sin la migración aplicada, todo se comporta como hoy (semilla = visibilidad actual).

### Negative
- `requirePermiso` agrega una lectura de BD por request a cada router de módulo (matriz pequeña,
  ≤ roles×módulos; lectura fresca sin caché por diseño). Aceptable para una herramienta interna.
- Enforcement de Fase 3 = **visibilidad + acceso a ruta**; el nivel granular por caso de uso
  (read/write/admin dentro de un módulo) queda para una fase posterior.

### Neutral
- `reemplazarPermisosRol` persiste TODAS las celdas del rol (el frontend envía la fila completa) → una
  celda en NINGUNO sobre un módulo visible-por-defecto queda autoritativa. El merge del loader cubre las
  celdas nunca tocadas con su default.

## Alternatives Considered
- **RBAC granular que reemplace el enum de roles** (como SIGAF 1:1) — rechazado: este repo tiene roles
  fijos + `requireRol` (ADR-0002); *"adapta, esa es la clave"*. La matriz suma/resta, no sustituye.
- **Gobernar el router de permisos con la propia matriz** — rechazado: abre self-lockout. Se gobierna
  por `requireRol`.
- **FK/CHECK de `modulo_id` contra una tabla de módulos** — rechazado: `MODULOS` vive en código; una
  tabla obligaría a migrar por cada módulo y duplicaría la verdad.
- **Cachear la matriz** — rechazado en Fase 3: rompería "cambio efectivo sin re-login"; la matriz es
  diminuta.

## References
- `shared/src/permisosRbac.ts` (dominio puro); `apps/backend/src/application/permisos/*`
  (loader + casos de uso), `interface/middleware/requirePermiso.ts`, `interface/routes/permisos.routes.ts`,
  `infrastructure/db/permisoRepository.ts` (fallback `42P01`/`42704`).
- Migración `supabase/migrations/0023_permisos_rol_modulo.sql`; espejo `schema.ts`
  (`nivelPermisoEnum`, `permisosRolModulo`). Frontend: `pages/configuracion/RolesPage.tsx`,
  `hooks/usePermisos.ts` (filtrado de sidebar/lanzador respetando impersonación).
- Tests: `shared/tests/permisosRbac.test.ts`, `apps/backend/tests/permisos.test.ts`.
- Relacionado: [ADR-0002](0002-autorizacion-centralizada-backend.md) (autorización en backend),
  [ADR-0007](0007-plataforma-modulos-declarativos.md) (registro declarativo de módulos).
