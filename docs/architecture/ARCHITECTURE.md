# Arquitectura Técnica

> Este documento describe el monorepo **actual** (Vite + Express). El stack original
> (Next.js 15 App Router monolítico) fue reemplazado por completo en la migración Vite+Express
> (Sesiones 4–11). El árbol `app/`/`lib/` de Next.js **ya no existe** (borrado en Sesión 10).
> El **por qué** de esta y otras decisiones vive en [`adr/`](adr/); este archivo describe el **qué**.

---

## Stack

Monorepo npm workspaces: **`shared`** (dominio puro) · **`apps/backend`** (`@pys/api`, Express) ·
**`apps/web`** (`@pys/web`, Vite+React).

| Capa | Tecnología |
|------|------------|
| Frontend | Vite 5 + React 18 + React Router 6 + TanStack Query 5 |
| Backend | Node/Express 4, arquitectura hexagonal (`domain`/`application`/`infrastructure`/`interface`) |
| UI | Tailwind CSS 3 (tokens del Sello) + Recharts (gráficas) + Tiptap (editor de lecciones) |
| Lenguaje | TypeScript 5.7 (strict) en las 3 capas |
| Persistencia | Supabase (PostgreSQL) + Drizzle ORM + `pg` (backend habla directo a Postgres, no vía `@supabase/ssr`) |
| Storage | Supabase Storage (fotos de empleados, bucket privado + signed URLs) |
| Auth | Supabase Auth (Google OAuth) en el frontend; el backend valida el JWT con `jose` y centraliza TODA la autorización |
| Validación | Zod 3 (`shared/src/schemas.ts`, consumido por frontend y backend) |
| Tests | Vitest 2 en los 3 workspaces |
| Logging | Pino (backend) |
| Deploy | Vercel (`apps/web` estático + `api/index.ts` serverless envolviendo el backend Express) |

**Dependencia entre workspaces:** `apps/backend` y `apps/web` consumen `@pys/shared`, que exporta
su `dist/` (no `src/`). Por eso **`shared` se buildea antes** de que los otros dos vean cualquier
cambio de dominio. Ver ADR [`0001`](adr/0001-monorepo-vite-express.md).

---

## Comandos clave

```bash
# Arranque de una sesión nueva — build shared primero (los otros workspaces consumen su dist/)
npm run build --workspace=shared

# Dev (dos servidores): backend :3000 (OAuth atado a ese puerto) + frontend :5173
npm run dev              # ambos a la vez (concurrently)
npm run dev:api          # solo backend
npm run dev:web          # solo frontend

# Tests — por workspace (así es como se reporta en el Log de Sesiones)
npm run test --workspace=shared
npm run test --workspace=apps/backend
npm run test --workspace=apps/web
npm test                 # raíz: encadena los 3 workspaces en orden

# Un solo archivo/patrón de test (vitest)
npm run test --workspace=apps/backend -- tests/areas.test.ts
npm run test --workspace=apps/web -- -t "nombre del test"

# Typecheck (no hay script unificado en la raíz)
npm run typecheck --workspace=apps/web     # tsc --noEmit (ya integrado en su `build`)
npx tsc --noEmit --project apps/backend    # backend no tiene script `typecheck` propio

# Build de producción (shared → backend → web, en orden)
npm run build

# Formato
npm run format            # prettier --write . (raíz)

# Carga (opcional)
npm run loadtest           # scripts/loadtest.mjs (autocannon)
```

**Gate de cierre de sesión** (ver `CLAUDE.md` § Reglas de Trabajo):
`npm run build --workspace=shared` → tests de los 3 workspaces → `tsc --noEmit` de backend y web →
`npm run build` raíz, todo en verde antes de dar una tarea por completa.

---

## Mapa de archivos principales

```
shared/src/            → @pys/shared: dominio puro, sin I/O ni framework
  domain.ts              Tipos y contratos (Funcionario, Empleado, Usuario, Area, ...)
  estado.ts               Máquina de estados PURA (calcularEstadoGlobal) — no se toca sin TDD
  permisos.ts             rutaInicialPorRol, rutaOficinaPorRol, areaPermitida, rolVePlataforma
  usuarios.ts             decidirAltaUsuario, errorInvarianteUsuario, normalizarEmail
  paginacion.ts           paginar, normalizarPagina
  ui.ts                   Fuente única de color por estado (EstadoPill y demás *Pill/*Badge)
  modulos.ts               Registro declarativo de módulos de la plataforma (MODULOS, modulosParaRol)
  areas.ts, metricas.ts, archivo.ts, capacitaciones.ts, cursos.ts, planificador.ts,
  personal.ts, desvinculaciones.ts, catalogo.ts, cola.ts
                          → lógica pura por dominio/feature
  schemas.ts              Validación Zod compartida (frontend + backend)
  index.ts                Barrel — todo se importa desde "@pys/shared"

apps/backend/src/      → @pys/api: arquitectura hexagonal
  domain/ports/           Interfaces de los repos (contrato único: FuncionarioRepo, AreaRepo, ...)
  application/            Casos de uso por dominio (funcionarios/, areas/, usuarios/, personal/,
                           capacitaciones/, cursos/, planificador/, desvinculaciones/, vacantes/,
                           archivo/, auth/, miarea/) — guardas de rol/área + reglas de transición de estado
  infrastructure/
    db/                    schema.ts (espejo Drizzle de las migraciones) + repos Drizzle
                           (funcionarioRepository ensamblado desde db/funcionario/*) +
                           recomputarEstado.ts (recalcula estado global tras cada mutación)
    auth/                  Verificador JWT de Supabase (jose)
    storage/               Supabase Storage (fotos de empleados)
    importacion/           Parser XLSX de importación masiva de desvinculaciones
    logging/               Logger Pino
  interface/               Capa HTTP: container.ts (composition root), controllers/, routes/,
                           middleware/ (requireAuth, requireRol, requireActivo, paramUuid,
                           errorHandler), app.ts (Express), index.ts / serverless.ts

apps/web/src/           → @pys/web: SPA
  lib/                    api.ts (cliente HTTP tipado, un apiXxx por dominio), supabase, utils
  context/                AuthContext (usuario efectivo vs real, impersonación de rol para dev)
  hooks/                  useFuncionarios, useAreas, useUsuarios, useMetricas, useCursos,
                           usePlanificador, usePersonal, etc. — TanStack Query + invalidación
  components/ui/          Design system del Sello (EstadoPill, Avatar, FilaDesplegable, Modal, ...)
  components/ui/dash/     UI del Panel de control (íconos, gráficas)
  pages/<feature>/        Una carpeta por feature (funcionarios, areas, usuarios, miarea, archivo,
                           capacitaciones, cursos, planificador, personal, desvinculaciones,
                           matriz, panel, auth, login, pendiente, tomar-curso, asistencia)
  App.tsx                 Router (rutas por rol vía ProtectedRoute)

supabase/migrations/    → 0001..0018 aplicadas en orden — fuente de verdad del esquema real
docs/superpowers/specs/ → Specs de diseño de features grandes (una por sesión de brainstorming)
.superpowers/sdd/       → Ledger + briefs de subagent-driven-development (gitignored, persistente)
```

---

## Flujo de una petición (hexagonal, de fuera hacia dentro)

```
Navegador (React + TanStack Query)
  │  hook useXxx → apiXxx (lib/api.ts) adjunta el JWT de Supabase como Bearer
  ▼
interface/  → routes → requireAuth (verifica JWT con jose) → requireActivo →
              requireRol(...) → paramUuid → controller (valida body con Zod → 400)
  ▼
application/ → caso de uso: guarda de rol/área + regla de transición de estado
              (recibe repos inyectados desde container.ts, nunca los instancia)
  ▼
infrastructure/db/ → repo Drizzle: SELECT ... FOR UPDATE / UPDATE ... WHERE estado_esperado
                     RETURNING (concurrencia) + recomputarEstado tras cada mutación
  ▼
Supabase PostgreSQL (RLS deny-directo por defecto; el backend usa service role)
```

La autorización vive **entera** en el backend: el frontend solo refleja UX (oculta botones que el
usuario no puede usar). Ver ADR [`0002`](adr/0002-autorizacion-centralizada-backend.md).

---

## Patrones obligatorios

- **`container.ts` (composition root)** para todo I/O — los casos de uso reciben repos inyectados,
  nunca instancian directamente.
- **`requireAuth` + `requireActivo` + `requireRol(...)`** en cada router del backend que exija
  autenticación/autorización. `paramUuid` en todo router con parámetros de fila (`:id`) — nunca sobre
  `:token` (que es base64url, no UUID).
- **`shared/src/ui.ts`** como única fuente de color por estado — ningún componente construye colores
  a mano (Regla del Semáforo Único).
- **Tailwind: solo clases literales** — no construir nombres de clase en runtime (respeta el purge).
- **`shared/src/estado.ts` no se toca** sin TDD previo — es la máquina de estados verificada;
  cualquier cambio de reglas de negocio pasa por ahí primero. Ver ADR
  [`0005`](adr/0005-maquina-de-estados-pura.md).
- **`shared` se buildea antes** que backend/web vean cambios (`shared/package.json` exporta `dist/`,
  no `src/`).
- **No commitear ni hacer push sin que el usuario lo pida explícitamente** (constraint duro, ver
  `CLAUDE.md` § Reglas de Trabajo).

---

## Concurrencia (garantizada en BD)

`cambiarEstadoArea` usa `SELECT ... FOR UPDATE` + recálculo atómico en la misma transacción
(`recomputarEstado.ts`). Los hitos TH→CI usan UPDATE condicional (`WHERE estado_global=esperado`)
con `RETURNING` para detectar conflictos TOCTOU. El reordenamiento de módulos/lecciones de cursos usa
el mismo patrón de lock sobre la fila raíz del scope. **No tocar estas transacciones sin TDD previo.**
Ver ADR [`0008`](adr/0008-concurrencia-optimista-lock-condicional.md).

---

## Sincronía multi-usuario (Supabase Realtime)

Un canal por sesión autenticada (`plataforma-sync`) suscrito a las tablas mutables. Los eventos
llaman `queryClient.invalidateQueries` → TanStack Query refetcha solo lo necesario. La conexión
WebSocket va **directo browser↔Supabase**, no pasa por Vercel. RLS protege los eventos (el usuario
solo recibe filas que su política SELECT permite).

---

## Deploy (Vercel)

`apps/web` se sirve estático; `api/index.ts` es una función serverless que envuelve el backend
Express. Supavisor pool, región `iad1` colocada con Supabase `us-east-1`, code-split (`manualChunks`
+ `React.lazy` en las páginas pesadas — Tiptap queda diferido en su propio chunk). CSP incluye
`wss://*.supabase.co` para el Realtime. Cold starts mitigables con ping gratuito a `/api/health`.
