# ADR-0001: Monorepo Vite + Express con dominio compartido

## Status
Accepted — migración ejecutada en las Sesiones 4–11 (2026-06-24).

## Context
El proyecto nació como una app **Next.js 15 App Router monolítica** (`app/` + `lib/`). Ese modelo
mezclaba render de servidor, server actions y acceso a datos en el mismo árbol, y hacía difícil:
- Testear el dominio (máquina de estados, permisos, invariantes) de forma aislada, sin framework.
- Reusar la misma validación y los mismos tipos entre "servidor" y "cliente" sin acoplarlos a Next.
- Razonar sobre dónde vive la autorización (server components vs. actions vs. middleware).

Se buscó el stack y la disciplina de un proyecto de referencia interno (SIGAF): un monorepo con
dominio puro reutilizable, backend hexagonal y un SPA que solo refleja UX.

## Decision
Reconstruir la app como **monorepo npm workspaces** con tres paquetes:
- **`shared`** (`@pys/shared`) — dominio puro: tipos, máquina de estados, permisos, invariantes,
  schemas Zod. Sin I/O ni framework. Exporta su `dist/` compilado (no `src/`).
- **`apps/backend`** (`@pys/api`) — Express con arquitectura hexagonal
  (`domain`/`application`/`infrastructure`/`interface`).
- **`apps/web`** (`@pys/web`) — Vite + React + React Router + TanStack Query.

Auth **híbrida**: login Google vía Supabase Auth en el frontend; el backend valida el JWT con `jose`
y centraliza toda la autorización (ver ADR-0002). El dominio probado (estado, permisos, invariantes)
se copió verbatim a `shared/`.

## Consequences

### Positive
- El dominio se testea sin levantar ningún servidor ni framework (Vitest sobre `shared`).
- Una sola fuente de tipos y validación (`schemas.ts`) consumida por backend y frontend.
- Frontera de autorización única y explícita en el backend, no dispersa en el framework.
- Deploy simple en Vercel: SPA estático + una función serverless que envuelve Express.

### Negative
- Hay que **buildear `shared` antes** de que backend/web vean cambios de dominio (exporta `dist/`).
- Import ESM requiere extensión `.js` en los imports relativos de `shared/src/*` (resuelto en Fase 8.3).
- Sin script `typecheck` unificado en la raíz (backend usa `npx tsc --noEmit --project`).

### Neutral
- El árbol Next.js (`app/`, `lib/`, `middleware.ts`, config) se borró por completo en la Sesión 10.
- TS project references quedó como alternativa limpia pendiente al orden de build de `shared`.

## Alternatives Considered
- **Seguir con Next.js monolítico** — rechazado: mezcla capas, dificulta testear el dominio aislado
  y razonar sobre la autorización.
- **TS project references en vez de exportar `dist/`** — considerado; resolvería el orden de build,
  pero se difirió por costo/beneficio en el momento de la migración.

## References
- `CLAUDE.md` § Log de Sesiones — Sesiones 4–11.
- `.superpowers/sdd/progress.md` — ledger de ejecución de la migración.
- Plan: `perfecto-ahora-usa-superpowers-functional-mist.md` + `splendid-gathering-ocean.md`.
