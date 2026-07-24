# ADR-0006: RLS "deny-directo" por defecto en tablas nuevas

## Status
Accepted — patrón adoptado desde Capacitaciones (Sesión 23) y repetido en cada tabla nueva.

## Context
El backend habla a Postgres con **service role** (ver ADR-0002: la autorización de negocio vive en el
backend, no en RLS). Pero las tablas siguen expuestas al rol `anon`/`authenticated` de Supabase a
través de la API auto-generada y del canal Realtime. Una tabla nueva sin RLS habilitado es legible/
escribible por cualquier cliente autenticado, saltándose por completo el backend.

## Decision
**Toda tabla nueva habilita RLS SIN políticas = deny total para `anon`/`authenticated`.**
- RLS `enabled` + cero `policies` significa: ningún cliente directo puede leer ni escribir; **solo** el
  backend con service role (que bypasea RLS) accede.
- Este patrón se aplica a: `capacitaciones`, `asistencias`, `novedades`, `cursos`, `curso_modulos`,
  `curso_lecciones`, `inscripciones`, `progreso_lecciones`, `capacitaciones_planeadas`,
  `eventos_auditoria`, `lotes_importacion`, `filas_lote`, y el bucket de Storage `fotos-empleados`.
- **Excepciones con política explícita**: las tablas del núcleo (`funcionarios`, `aprobaciones`,
  `observaciones`, `usuarios`) tienen políticas SELECT para alimentar el canal Realtime filtrado por
  rol; `empleado_salarial` tiene RLS estricta con `ve_salarial()` (ver ADR-0004).
- Las funciones `SECURITY DEFINER` (`rol_de`, `es_superadmin`, `es_auditor`, `ve_salarial`) se
  **endurecen**: `REVOKE EXECUTE ... FROM anon, authenticated, public` (migraciones `0005` y `0018`).
  Revocar `EXECUTE` no rompe las policies: RLS se evalúa con los privilegios del *definer*.

## Consequences

### Positive
- El advisor de Supabase queda limpio salvo los `rls_enabled_no_policy` INFO **esperados** (son el
  patrón intencional, no un hallazgo) y el WARN moot de leaked-password (auth es OAuth, sin passwords).
- Ningún cliente puede saltarse el backend para tocar datos: la API directa de Supabase queda muerta.
- El canal Realtime solo emite filas que la política SELECT del usuario permite.

### Negative
- Cada tabla nueva debe recordar habilitar RLS en su migración (checklist de revisión de migraciones).
- Una función `SECURITY DEFINER` nueva debe recordar el `REVOKE EXECUTE` (se olvidó en `0016`
  `es_auditor` y se corrigió en `0018` — el advisor lo atrapó).

### Neutral
- Los `rls_enabled_no_policy` INFO en el advisor son ruido esperado, no deuda.

## Alternatives Considered
- **No habilitar RLS y confiar solo en el backend** — rechazado: deja la API auto-generada de Supabase
  y el Realtime abiertos a cualquier cliente autenticado.
- **Escribir políticas RLS completas por tabla** — rechazado como default: la autorización de negocio
  es más rica y ya vive en el backend (ADR-0002); duplicarla en RLS es superficie que mantener
  sincronizada. Solo se escriben políticas donde el acceso directo es necesario (Realtime, salarial).

## References
- Migraciones `0004`, `0005`, `0008`, `0016`, `0018`. `apps/backend/src/infrastructure/db/schema.ts`.
- `CLAUDE.md` § Infraestructura (Advisors); § Log — Sesiones 16, 23, 47.
