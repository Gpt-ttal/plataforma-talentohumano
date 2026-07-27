# ADR-0010: Allowlist de acceso por correo (invertir el autoregistro)

## Status
Accepted — Sesión 55 (suite de Configuración). Migración `0022_usuarios_preaprobados.sql` **aplicada a
producción el 2026-07-27** (conexión directa, en transacción; registrada como `20260727000022`). El
gate de allowlist está **activo**; el fallback de autoregistro histórico ya no aplica.

## Context
Hasta ahora `asegurarUsuario` (invocado por `requireAuth`) **autoregistraba** a cualquier identidad del
dominio institucional (`@americana.edu.co`) que hiciera login con Google, creando un `usuarios`
`AREA/PENDIENTE` a la espera de que el superadmin le asignara rol. La política pedida por el usuario
invierte esto: *"nosotros asignamos a los usuarios, no cualquiera con hacer login @americana puede
entrar"*. El acceso debe ser por **invitación**, no por autoservicio.

Restricción de modelado: la PK de `usuarios` es `auth.users.id` (uuid de Supabase), **desconocido antes
del primer login** → una allowlist no puede llavearse por id; se llavea por **email** (normalizado).

## Decision
**Solo los correos pre-aprobados por el SUPERADMIN pueden crear su usuario en el primer login.** Nueva
tabla `usuarios_preaprobados` (email PK + rol/área/estado + `invitado_por`), RLS deny-directo.
`asegurarUsuario` pasa a ser un **gate**:

1. Usuario ya existente (`usuarios` por uid) → entra (los registrados **conservan** acceso; no se
   consulta la allowlist).
2. Correo de bootstrap (`SUPERADMIN_EMAIL` por env) → entra siempre como `SUPERADMIN/ACTIVO`, aunque no
   esté en la lista (así el primer SA puede poblarla).
3. Se consulta la allowlist por email:
   - **Con** pre-aprobación → se crea el `usuarios` con el rol/área/estado de la fila.
   - **Sin** pre-aprobación → **rechazo 403** (`ErrorAutorizacion`), en vez de crear PENDIENTE.

**Rollout merge-safe (patrón 0019):** el repo detecta la ausencia de la tabla (Postgres `42P01`) y
`asegurarUsuario` cae al **autoregistro histórico** (`decidirAltaUsuario` → `AREA/PENDIENTE`). Así el
código se mergea antes de aplicar `0022` sin romper ningún login; el gate se activa recién cuando la
tabla existe en la BD.

La allowlist es **persistente**, no un invite de un solo uso: retirar un correo no revoca a un usuario
ya registrado (para eso se inactiva el usuario) — solo impide FUTUROS primeros ingresos.

## Consequences

### Positive
- El acceso es por invitación explícita: la institución controla quién entra, no el dominio del correo.
- Cero ruptura: usuarios existentes y el SA de bootstrap siempre entran; el fallback preserva el
  comportamiento actual hasta aplicar la migración.
- El usuario entra ya con su rol/área correctos (no pasa por `PENDIENTE` esperando asignación).

### Negative
- Un correo institucional legítimo **no** pre-aprobado recibe 403 en vez de quedar PENDIENTE: requiere
  que el SA lo agregue antes. Es el comportamiento buscado, pero es un cambio observable.
- El caso de uso `asegurarUsuario` gana una dependencia (`PreaprobacionRepo`) y ramas nuevas.

### Neutral
- La allowlist y `usuarios` conviven: editar el rol de un correo en la allowlist tras su primer login no
  afecta al usuario ya creado (se edita el usuario real por la vía existente). Es intencional.

## Alternatives Considered
- **Llavear la allowlist por uuid** — imposible: el uid no existe antes del primer login.
- **Consumir la pre-aprobación al usarla** (invite de un solo uso) — rechazado: se prefirió una allowlist
  persistente como registro de quién está autorizado; revocar es una acción explícita (inactivar).
- **Mantener el autoregistro y solo bloquear en la UI** — rechazado: la autorización debe vivir en el
  backend (ADR-0002); un gate de UI es evadible.
- **Feature flag por env en vez de fallback por ausencia de tabla** — rechazado: el patrón 0019
  (detectar tabla ausente) ya es el estándar del repo para mergear antes de aplicar.

## References
- `apps/backend/src/application/auth/asegurarUsuario.ts` (gate + fallback),
  `domain/ports/PreaprobacionRepo.ts`, `infrastructure/db/preaprobacionRepository.ts` (detección `42P01`),
  `application/preaprobados/*` (casos de uso), `interface/routes/preaprobados.routes.ts`.
- Migración `supabase/migrations/0022_usuarios_preaprobados.sql`; espejo `schema.ts`
  (`usuariosPreaprobados`). Frontend: `pages/configuracion/GestionPreaprobados.tsx`.
- Tests: `apps/backend/tests/asegurarUsuario.test.ts`, `usuarios.test.ts`.
- Relacionado: [ADR-0002](0002-autorizacion-centralizada-backend.md) (autorización en backend),
  [ADR-0006](0006-rls-deny-directo-por-defecto.md) (RLS deny-directo).
