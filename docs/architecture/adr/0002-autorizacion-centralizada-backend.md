# ADR-0002: Autorización centralizada en el backend

## Status
Accepted — Fases 3–4 de la migración (Sesiones 5–6), endurecida en la auditoría de la Sesión 12.

## Context
Con auth híbrida (login Supabase en el frontend, JWT que viaja al backend), había que decidir
**dónde** se decide qué puede hacer cada usuario. Dejar la decisión en el frontend (ocultar botones,
proteger rutas de React) es cómodo pero inseguro: cualquier cliente puede llamar la API directamente.
El JWT de Supabase, además, si se verifica mal (algoritmo confundido, sin `issuer`/`audience`)
permite forjar identidad.

## Decision
**El frontend refleja UX; el backend es la única fuente de autorización real.**
- El JWT se verifica en `infrastructure/auth/supabaseJwtVerifier` con `jose`, validando
  `issuer` + `audience` + `algorithms` (HS256 solo fuera de producción → cierra algorithm-confusion).
- Tres middlewares componen la frontera HTTP: `requireAuth` (verifica + autoregistra → `req.usuario`),
  `requireActivo` (rechaza usuarios `INACTIVO`/`PENDIENTE` — la desactivación surte efecto inmediato),
  `requireRol(...roles)`. Se aplican en **cada** router sensible.
- Además, **cada caso de uso** revalida el rol con `exigirRol(actor, [...])` — defensa en profundidad:
  la guarda de ruta y la del caso de uso son independientes.
- El `errorHandler` nunca filtra `err.message` en 5xx (mensaje genérico + log con método/ruta).

## Consequences

### Positive
- Un cliente que llame la API a mano recibe 401/403 igual que si usara la UI.
- La lógica de "quién puede" se lee en un solo lugar por dominio (el caso de uso), no dispersa.
- Desactivar un usuario lo expulsa en su siguiente request, sin esperar a que expire el token.

### Negative
- Duplicación deliberada rol-en-ruta + rol-en-caso-de-uso (aceptada como defensa en profundidad).
- El frontend debe replicar el gating solo para UX (ocultar botones), sabiendo que no es seguridad.

### Neutral
- El autoregistro del usuario ocurre dentro de `requireAuth` (primer login → fila `PENDIENTE`).

## Alternatives Considered
- **Autorización en el frontend (React Router guards + ocultar UI)** — rechazado: no es seguridad,
  solo experiencia; la API quedaría abierta.
- **RLS de Postgres como única capa** — rechazado como *única* capa: el backend habla a Postgres con
  service role (ver ADR-0006); la lógica de rol/transición es más rica que lo expresable en políticas
  RLS. RLS se usa como red de seguridad de datos, no como motor de autorización de negocio.

## References
- `CLAUDE.md` § Log de Sesiones — Sesiones 5, 6, 12.
- `apps/backend/src/interface/middleware/` (requireAuth, requireRol, requireActivo, errorHandler).
