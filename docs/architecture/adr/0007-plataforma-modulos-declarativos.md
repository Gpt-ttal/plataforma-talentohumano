# ADR-0007: Plataforma con registro declarativo de módulos

## Status
Accepted — spec de Sesión 24, implementado en Sesión 25.

## Context
El sistema dejó de ser "una app de paz y salvo" para volverse una **plataforma de Talento Humano**
con módulos (Paz y Salvo, Capacitaciones, Cursos, Planificador, Administración de Personal,
Desvinculaciones). Cada vez que se añadía un módulo había que tocar a mano el sidebar, el lanzador
del Panel y las guardas de ruta, con listas de módulos hardcodeadas en varios sitios que se
desincronizaban.

## Decision
**`shared/src/modulos.ts` es el registro único y declarativo de módulos** (`MODULOS`,
`modulosParaRol(rol)`). El **lanzador** del Panel se deriva íntegramente de esta lista (tiles de
primer nivel + visibilidad por rol). El **sidebar** ofrece navegación más granular (sub-rutas por
módulo + utilidades de administración) y se mantiene en `Layout.tsx`; NO se deriva de `MODULOS`, pero
**tests-guarda** verifican que todo módulo `ACTIVO` visible para un rol tenga entrada en el sidebar y
que todo `icono` declarado exista, de modo que no puedan derivar en silencio.
- Cada `Modulo` declara `id`, `nombre`, `icono`, `rutaBase`, `rolesQueVen[]`, `estado`
  (`ACTIVO`/`PROXIMO`).
- **Roles "plataforma" vs. roles "acotados"**: `rolVePlataforma()` → SUPERADMIN y TALENTO_HUMANO ven
  `/inicio` (el lanzador). CONTROL_INTERNO / AREA / SST entran **directo** a su trabajo vía
  `rutaInicialPorRol` — no necesitan un lanzador porque solo tienen una cosa que hacer.

## Consequences

### Positive
- Añadir un módulo es editar una lista declarativa + sus tests, no cazar referencias hardcodeadas.
- El lanzador se deriva de `MODULOS`; el sidebar se **valida** contra `MODULOS` por tests — coherencia
  garantizada sin acoplar la navegación granular a la lista de tiles.
- Cada rol ve exactamente sus módulos, calculado en un solo lugar.

### Negative
- El registro vive en `shared` (dominio puro), así que un cambio de módulos exige rebuild de `shared`.

### Neutral
- Los módulos "próximos" (Reportes, Organigrama) se declaran inertes pero honestos (se ven "próximamente").
- `MODULOS` lista los **tiles del lanzador** (paz-y-salvo, capacitaciones, personal, vacantes + próximos).
  Cursos/Planificador se navegan bajo Formación; Desvinculaciones/Archivo/Áreas/Usuarios son utilidades
  del sidebar, no tiles del lanzador.

## Alternatives Considered
- **Listas de módulos hardcodeadas en el sidebar/lanzador** — rechazado: es lo que había; se
  desincronizaba en cada feature nueva.
- **Config de módulos en BD** — rechazado: sobre-ingeniería para 6 módulos que cambian por deploy, no
  en runtime; el registro declarativo en código se testea y versiona con el resto.

## References
- `shared/src/modulos.ts`, `shared/src/permisos.ts` (`rutaInicialPorRol`, `rolVePlataforma`).
- Spec `docs/superpowers/specs/2026-06-30-plataforma-multi-modulo-concurrencia-design.md`.
- `CLAUDE.md` § Arquitectura de Plataforma; § Log — Sesiones 24–25.
