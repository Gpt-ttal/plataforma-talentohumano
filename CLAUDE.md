# Sistema Paz y Salvo — Cerebro del Repositorio

> **Instrucción para Claude:** Este archivo es la fuente única de verdad del proyecto.
> Léelo completo al inicio de cada sesión. Actualízalo al cerrar cada sesión exitosa
> (sección "Log de Sesiones" + sección que corresponda). **Nunca commitear sin que el
> usuario lo pida explícitamente.**

---

## 1. Identidad y Origen

**Sistema Paz y Salvo v2** — Herramienta interna de la **Corporación Universitaria Americana**
que digitaliza el trámite de paz y salvo cuando un funcionario se retira de la institución.

Reemplaza un proceso manual y disperso por un circuito único, auditable y acotado por rol.
El flujo: cada área competente da (o no) su visto bueno → Talento Humano genera la liquidación
cuando todo está listo → Control Interno registra el paz y salvo final.

**Usuario:** `leonardoreales@americana.edu.co` (desarrollador + superadmin de la institución).

---

## 2. Misión y Visión del Producto

**Misión:** Que cada persona entre con su cuenta institucional y caiga **directo y solo** a lo
que le corresponde, sin buscar su trabajo. El servidor (máquina de estados + guardas) garantiza
la validez de cada acción; la UI solo refleja lo que ya está garantizado.

**Visión:** Una herramienta diaria, no una vitrina. Densidad al servicio de la lectura: estados
legibles de un vistazo, números tabulares, zero fricción. La identidad premium (navy + oro antiguo)
se intuye en el oficio, no se exhibe en cada superficie.

**Personalidad de marca:** Institucional · nítida · confiable. Autoridad universitaria seria
pero moderna. Voz directa, sobria, en español es-CO.

**Anti-referencias (prohibidas):**
- SaaS genérico: grids de cards idénticas, gradientes morados, eyebrows en mayúsculas.
- Software estatal anticuado: tablas grises sin jerarquía, contraste pobre, cero ritmo.

---

## 3. Roles y Flujo de Negocio

### Roles de usuario

| Rol | Qué ve / puede hacer |
|-----|----------------------|
| `SUPERADMIN` | Todo; administra usuarios y áreas |
| `TALENTO_HUMANO` | Catálogo completo; genera liquidación cuando todo está listo |
| `CONTROL_INTERNO` | Revisa liquidaciones generadas; registra paz y salvo final |
| `AREA` | Solo la cola de su propia dependencia; da visto bueno por funcionario |

### Flujo de estados del funcionario

```
PENDIENTE  →  LISTO_PARA_LIQUIDAR  →  LIQUIDACION_GENERADA  →  PAZ_Y_SALVO
   │                                          ↑
   └──── (mientras haya áreas sin aprobar) ───┘
```

**Regla:** Un área cuyo estado es `APROBADO` o `NO_APLICA` cuenta como "OK". Cuando todas
las áreas están OK, el estado global sube. `NO_APROBADO` de cualquier área devuelve el
estado a `PENDIENTE`. La máquina de estados es una función pura en `lib/estado.ts`.

### Ciclo de vida del usuario

```
PENDIENTE → ACTIVO → INACTIVO
```
Autoregistro → SUPERADMIN asigna rol/área → activación. Un usuario de área ACTIVO **debe**
tener `areaId`; el resto de roles no llevan área (invariante en `errorInvarianteUsuario`).

---

## 4. Arquitectura Técnica

### Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 3 |
| Lenguaje | TypeScript 5.7 (strict) |
| Persistencia | Supabase (PostgreSQL 17.6) + `@supabase/ssr` |
| Auth | Supabase Auth + OAuth Google |
| Validación env | Zod 3 |
| Tests | Vitest 2 |
| Calidad | Prettier, ESLint flat, Husky + lint-staged |

### Comandos clave

```bash
npm run dev          # dev server (DEBE correr en :3000 — OAuth atado a ese puerto)
npm test             # vitest run (84 tests, 9 archivos)
npm run typecheck    # tsc --noEmit
npm run build        # build de producción
npm run format       # prettier --write .
```

### Mapa de archivos principales

```
lib/
  domain.ts          → Tipos y contratos del dominio (sin lógica)
  estado.ts          → Máquina de estados pura (calcularEstadoGlobal)
  auth.ts            → obtenerUsuarioActual, requireUsuario, requireArea, asegurarUsuario
  config/env.ts      → Variables de entorno con Zod (authHabilitada, authHabilitadaDe)
  permisos.ts        → rutaInicialPorRol, areaPermitida, rolPuedeVerVista, VistaSupervision
  usuarios.ts        → decidirAltaUsuario, errorInvarianteUsuario, normalizarEmail
  paginacion.ts      → paginar, normalizarPagina, POR_PAGINA_DEFECTO
  ui.ts              → ROL_LABEL, EstadoPill (fuente única de color por estado)
  catalogo.ts        → lógica del catálogo
  notificaciones.ts  → sistema de notificaciones (Resend API)
  services.ts        → casos de uso de aplicación
  repos/
    types.ts         → Contrato Repo (interfaz única para memory y supabase)
    memory.ts        → Implementación en memoria (demo, tests)
    supabase.ts      → Implementación real (producción)
    index.ts         → getRepo() — factory que elige la implementación
  supabase/
    client.ts        → crearClienteNavegador (browser)
    ssr-server.ts    → crearClienteServidor (server components)
    middleware-client.ts → actualizarSesion (edge middleware)

app/
  layout.tsx         → RootLayout async (lee usuario → pasa rol a Nav)
  page.tsx           → Dashboard (solo SUPERADMIN)
  actions.ts         → Server Actions con guardas requireUsuario/requireArea
  login/page.tsx     → Pantalla de login (banner demo o BotonGoogle)
  auth/callback/route.ts → exchange OAuth → autoregistro → redirige por rol
  pendiente/page.tsx → Vista de usuario PENDIENTE
  funcionarios/      → Catálogo TH/SA + modal interceptado @modal/(.)[id]
  mi-area/           → Cola de trabajo AREA
  usuarios/          → Gestión de usuarios (solo SUPERADMIN)

middleware.ts        → Renovación de sesión + guarda de borde (solo auth, no autorización fina)
supabase/
  migrations/        → 0001..0003 + seed.sql (esquema + datos demo)
```

### Patrones obligatorios

- **`getRepo()`** para todo I/O — nunca instanciar repos directamente.
- **`requireUsuario(roles?)`** / **`requireArea(areaId)`** en cada server component/action que requiera auth.
- **`lib/ui.ts`** como única fuente de color por estado — ningún componente construye colores de estado a mano.
- **Tailwind: solo clases literales** — no construir nombres de clase en runtime (respeta el purge).
- **`lib/estado.ts` no se toca** — es la máquina de estados verificada con tests; cualquier cambio requiere tests primero.
- **No commitear sin que el usuario lo pida.**

### Modo demo vs producción

| Variable | Efecto |
|----------|--------|
| `DATA_SOURCE=memory` | Repo en memoria, superadmin sintético, sin Supabase |
| `DATA_SOURCE=supabase` | Repo real, auth OAuth, necesita `.env.local` |
| `AUTH_HABILITADA=false` | Middleware en passthrough, sin login |

---

## 5. Dominio — Tipos clave

```typescript
// Estados de área (aprobación por dependencia)
type EstadoArea = "PENDIENTE" | "APROBADO" | "NO_APLICA" | "NO_APROBADO"

// Estado global consolidado del paz y salvo
type EstadoGlobal = "PENDIENTE" | "LISTO_PARA_LIQUIDAR" | "LIQUIDACION_GENERADA" | "PAZ_Y_SALVO"

// Roles de usuario
type RolUsuario = "SUPERADMIN" | "TALENTO_HUMANO" | "CONTROL_INTERNO" | "AREA"

// Ciclo de vida del usuario
type EstadoUsuario = "PENDIENTE" | "ACTIVO" | "INACTIVO"
```

**Entidades:** `Funcionario`, `AreaVistoBueno`, `Aprobacion`, `Observacion`, `Usuario`,
`FuncionarioDetalle`, `FilaGestionArea`, `MetricasDashboard`.

---

## 6. Sistema Visual — "El Sello Institucional"

**North Star:** Papelería oficial de universidad seria. Chasis navy que carga toda la
estructura; oro que casi nunca aparece — porque cuando aparece, *significa* algo.

### Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| navy | `#142943` | Estructura, marca, nav |
| navy-deep | `#0E1F35` | Gradiente nav, chips activos |
| gold | `#B68D40` | Hito y acción principal (≤ 10% pantalla) |
| ink | `#16202E` | Texto de cuerpo |
| silver-600 | `#697080` | Texto secundario (contraste AA mínimo) |
| silver-300 | `#CCD2DE` | Hairlines, bordes |
| bg | `#F4F7FB` | Fondo base |
| ok / ok-bg | `#16936A` / `#E4F5EE` | PAZ_Y_SALVO |
| info / info-bg | `#3B6FD4` / `#E8EFFC` | LIQUIDACION_GENERADA |
| listo / listo-bg | `#B68D40` / `#F4E8C6` | LISTO_PARA_LIQUIDAR |
| pendiente | `#8B93A6` | PENDIENTE |
| rechazo | `#A4231F` | NO_APROBADO |

### Reglas nombradas (irrompibles)

- **Regla del Sello:** oro ≤ 10% de cualquier pantalla. Acción principal e hito, nunca decoración.
- **Regla del Semáforo Único:** color de estado definido una vez en `lib/ui.ts`, pintado solo vía `EstadoPill`.
- **Regla de la Serif Reservada:** `.font-display` (Hoefler/Palatino) solo para wordmark y titulares, nunca en labels/botones/datos.
- **Regla Tabular:** números comparables en columna usan `font-variant-numeric: tabular-nums`.
- **Regla Hairline-Primero:** separación por defecto = línea `silver-300`, no sombra; sombra solo para elevación real.

### Bans absolutos de diseño

- Eyebrows de sección sobre pantallas (ya eliminados).
- `text-gold-foil` / `background-clip: text` con gradiente (ya eliminado de `globals.css`).
- Filete lateral de color (`border-left` > 1px) en filas o callouts.
- Texto de interfaz en `silver-400/500` (usar `silver-600` mínimo para AA).
- Serif en botones, labels o datos.

### Componentes clave

- `EstadoPill` — pastilla `rounded-full` punto+etiqueta, colores desde `lib/ui.ts`.
- `Avatar` — disco navy-50 con iniciales + anillo oro.
- `FilaDesplegable` — acordeón `rounded-2xl`, `shadow-luxe` → `shadow-luxe-lg` en hover.
- `Segmented` — toggle de vista, server-driven por `?vista=th|ci`.
- `ChipFiltro`, `Buscador`, `Paginacion` — server-driven por searchParams.
- `BotonGoogle` / `BotonSalir` — auth.
- `GestionUsuario`, `AccionesArea` — acciones con confirmación inline (sin modal).

### Accesibilidad

Objetivo WCAG 2.1 AA. Contraste texto ≥ 4.5:1, foco visible (anillo oro en `globals.css`),
teclado de extremo a extremo, `prefers-reduced-motion` en toda animación, pills con punto+texto
(nunca solo color), es-CO para fechas/números.

---

## 7. Infraestructura (Supabase)

- **Project ref:** `vwcnqrdicjarkorqdrue`
- **URL:** `https://vwcnqrdicjarkorqdrue.supabase.co`
- **Región:** us-east-1 · PostgreSQL 17.6 · Org: `dnuwchusxvvbsujjxnxs`
- **Secretos:** viven solo en `.env.local` (gitignored) y `~/.claude.json`. NUNCA en código ni memoria.

### Estado de la BD (aplicado)

| Migración | Contenido |
|-----------|-----------|
| `0001` | Esquema base (áreas, funcionarios, aprobaciones, observaciones) |
| `0002` | Datos de soporte adicionales |
| `0003_usuarios_y_roles.sql` | Tabla `usuarios`, enums `rol_usuario`/`estado_usuario`, funciones SECURITY DEFINER `rol_de`/`es_superadmin`, RLS |
| `seed.sql` | 10 áreas, 9 funcionarios, 90 aprobaciones, 1 observación |

**Advisor abierto (endurecer próxima sesión):** funciones SECURITY DEFINER `rol_de`/`es_superadmin`
ejecutables por `anon`/`authenticated` → hacer `REVOKE EXECUTE ... FROM anon, authenticated`.

### OAuth Google

- Provider Google activado en Supabase. Proyecto GCP: `api-talento-humano`.
- Client ID: `860863054594-...apps.googleusercontent.com` (en `.env.local`).
- Redirect URI: `https://vwcnqrdicjarkorqdrue.supabase.co/auth/v1/callback`.
- `site_url=http://localhost:3000`, `uri_allow_list=http://localhost:3000/auth/callback,http://localhost:3000/**`.
- **Dev server DEBE correr en :3000** (no :3001 — OAuth atado a ese puerto; matar procesos viejos).

### MCP Supabase

```
Scope: local, read-write, --project-ref=vwcnqrdicjarkorqdrue
Comando: cmd /c npx -y @supabase/mcp-server-supabase@latest --project-ref=...
```
*(El `cmd /c` es obligatorio desde PowerShell; Git Bash convierte `/c` → `C:/` y rompe la conexión.)*

---

## 8. Progreso del Proyecto

### Estado general

> **🟢 POST-MIGRACIÓN — features sobre el monorepo Vite+Express.** Sesión 13: Panel de control (SA+TH).
> Sesión 14: **Spec 1 — TH y CI en oficinas dedicadas** (`/paz-y-salvo/talento-humano` y `/control-interno`;
> `/funcionarios` ahora SA-only; helper `rutaOficinaPorRol`).
> Sesión 15: **Spec 2 — Archivo institucional** (`/archivo` SA+TH, **solo lectura** sobre datos existentes:
> listado de trámites cerrados + filtro de rango de fecha de retiro + expediente + export CSV). **Sin bitácora**
> (el usuario eligió "detalle actual + metadata" → SIN tabla nueva, SIN migración, SIN tocar el flujo del trámite ni
> la máquina de estados). Todo verde, SIN commitear. Detalle en §10 (Sesión 15) y
> `docs/superpowers/specs/2026-06-25-archivo-institucional-design.md`.
>
> 🔵 **PRÓXIMA SESIÓN = acción humana del cierre** (no más código de features): smoke E2E con `.env` reales, clic
> login Google (aterrizaje por rol), deploy Vercel, aplicar migraciones `0005`/`0006` (MCP), endurecer SECURITY
> DEFINER, commit semántico del working tree. Smoke de Spec 2: como **TH** ver `/archivo`, filtrar por rango de
> fecha, abrir un expediente, exportar CSV; como **CI/AREA** confirmar 403 en `/archivo` y `/archivo/export`.

> **🟢 MIGRACIÓN VITE + EXPRESS FUNCIONALMENTE COMPLETA (Fases 0–9)** al 2026-06-24 (Sesión 11).
> El monorepo **Vite + React + Express** (`@pys/shared` · `@pys/api` · `@pys/web`) reemplazó por completo
> al árbol Next.js (borrado en Sesión 10). Todo el código de la migración está terminado y verde; lo único
> pendiente es **acción humana** (crear `.env`, smoke E2E, clic de login Google, deploy a Vercel, commit final,
> endurecer SECURITY DEFINER). **Las secciones §4 y §7 describen el stack Next.js previo y son HISTÓRICAS**
> (ese árbol ya no existe; su valor vive portado en `shared/` + `apps/*`).

### 🔴 MIGRACIÓN Vite + Express — ESTADO ACTIVO (retomar aquí)

**Qué y por qué:** reconstruir la app como monorepo independiente con el stack/calidad de SIGAF:
`apps/web` (Vite + React 18 + React Router + TanStack Query), `apps/backend` (Express, arquitectura
hexagonal, Drizzle + pg), `shared` (dominio + tipos + Zod). **Auth híbrida:** login Google con Supabase
Auth → el backend Express valida el JWT de Supabase con `jose` y **centraliza TODA la autorización**
(el frontend solo refleja UX). Se conserva el dominio probado (máquina de estados, permisos, invariantes)
copiándolo verbatim a `shared/`.

**Documentos de la migración (leer al retomar, en este orden):**
1. **`.superpowers/sdd/progress.md`** — ledger de ejecución: estado exacto por fase, tradeoffs, próximo paso. **Fuente de verdad del avance.**
2. **`C:\Users\Leonardo\.claude\plans\perfecto-ahora-usa-superpowers-functional-mist.md`** — plan detallado completo (10 fases, TDD por tarea).

**Decisiones de ejecución (acordadas con el usuario):**
- **SIN commits durante la ejecución** — el humano commitea al final. (El árbol acumula todo sin commitear.)
- **Directo en `main`** (no rama). Construcción **in-place**: lo viejo de Next se elimina en Fase 9.
- **Política de tests:** dominio heredado = mantener; tests NUEVOS solo para **guardas de autorización
  (403) y transiciones de estado**. No testear plomería/presentacional.

**✅ Completado (Fases 0–6), verificado verde:**
- **Fase 0** — Monorepo npm workspaces (`["shared","apps/backend"]`) + `tsconfig.base.json`.
- **Fase 1** — `shared/` (`@pys/shared`): 8 archivos de dominio copiados verbatim + `schemas.ts` (Zod) +
  barrel. **59 tests** migrados (autoregistro, catalogo, estado, paginacion, permisos, usuarios-invariante,
  ui-pills, schemas). `tsc` build OK.
- **Fase 2** — `apps/backend/` (`@pys/api`): `env.ts` (Zod fail-fast, +4 tests), schema Drizzle espejo de
  migraciones 0001–0003, cliente `pg`+Drizzle, **3 puertos** (`AreaRepo`/`UsuarioRepo`/`FuncionarioRepo`) y
  **3 repos Drizzle** (`areaRepository`/`usuarioRepository`/`funcionarioRepository`) portados desde
  `lib/repos/supabase.ts`. Test de integración de usuarios `skipIf(!DATABASE_URL_TEST)`.
- **Fase 3** — `apps/backend/src/application/`: **11 casos de uso** con guardas de rol/área + transición de
  estado, reglas portadas VERBATIM de `lib/services.ts` + `lib/auth.ts` (no se inventaron reglas). Patrón:
  `useCase(deps) => (actor: Usuario, input) => Promise`. `errors.ts` (`ErrorAutorizacion` 403 /
  `ErrorValidacion` 400 / `ErrorNoEncontrado` 404), helper `exigirRol`, barrel `application/index.ts` para
  el composition root de Fase 4. Las guardas de transición leen `obtenerDetalle` y comparan `estadoGlobal`
  (el repo no las tiene). **+48 tests nuevos** (solo guardas/validación/transición — política lean) +
  `tests/_fixtures.ts`.
- **Fase 4** — `apps/backend/src/interface/` (capa HTTP): verificador JWT Supabase con `jose`
  (`supabaseJwtVerifier`, devuelve `{sub,email,nombre}`), middleware `requireAuth` (factory) /
  `requireRol` / `errorHandler` (+ error tipado `ErrorAutenticacion` 401), `container.ts` (composition
  root: inyecta los 3 repos en los 11 casos de uso + arma `requireAuth`), controllers
  (`funcionarios`/`usuarios`/`auth`, validan con Zod → 400), routes
  (`auth`/`funcionarios`/`usuarios`/`catalogo`), `app.ts` Express (helmet, cors, compression, rate-limit,
  `/health`), `serverless.ts`, `index.ts`. **+16 tests nuevos** (jwt, requireAuth/requireRol/errorHandler,
  smoke HTTP con supertest) — solo la frontera de seguridad, política lean.
- **Fase 5** — `apps/web/` (`@pys/web`, añadido a workspaces): scaffold Vite 5 + React 18 + React Router 6
  + TanStack Query 5 (`tailwind.config.ts`/`index.css` portados verbatim con los tokens del Sello). Cliente
  HTTP `lib/api.ts` (adjunta el JWT de Supabase, `ApiError`, endpoints tipados a la forma exacta de los
  casos de uso), `lib/supabase`, `lib/queryClient`, `lib/utils` (`cn`). `AuthContext` (login Google +
  `/auth/me` como fuente de rol/estado), `ProtectedRoute` por rol, `useRole`, `CallbackPage`
  (`rutaInicialPorRol`), `App.tsx` con el router. **+7 tests** (api client 2, ProtectedRoute 5 — solo la
  frontera, política lean). Desviación: se **omite `ThemeContext`** (el Sello es de tema único).
- **Fase 6** — `apps/web/src/components/`: design system portado del árbol Next (verbatim, con
  `next/link`→`Link to=`, `usePathname`→`useLocation`, `useRouter`→`useNavigate`, `next/image`→`<img>`,
  `@/lib/*`→`@pys/shared`): `ui/` EstadoPill, Avatar, PageHeader, EmptyState, ListaSkeleton, FilaDesplegable,
  ChipFiltro, Segmented, Paginacion (`hrefCon`), Buscador (debounce→`setSearchParams`), Modal; `Layout`
  (sidebar navy por rol, drawer móvil, breadcrumb) + `BotonSalir` (logout real `useAuth.logout`→/login).
  **+2 tests** (EstadoPill por estado). Assets copiados a `apps/web/public/`.
- **Verificación:** `shared` 59/59 · `apps/backend` **68 pass + 1 skip** · `apps/web` typecheck limpio +
  **9/9 tests** · `npm run build` raíz (shared+backend+web) exit 0.

**⚠️ Tradeoffs vivos (funcionan, revisar en el review final) — detalle en el ledger:**
1. `apps/backend/tsconfig.json` usa `ESNext/Bundler` (no `Node16`). Imports relativos del backend con `.js`.
   `apps/web/tsconfig.json` tampoco extiende `tsconfig.base.json` (mismo motivo) y resuelve `@pys/shared`
   por el symlink de workspace → `dist`.
2. `shared/package.json` exporta `dist/` (no `src/`) por TS6059 → **buildear `shared` antes** de que
   backend/web vean cambios. Alternativa limpia pendiente: TS project references.
3. **(confirmado en runtime en Fase 4)** `node dist/interface/app.js` falla con `ERR_MODULE_NOT_FOUND`
   en `shared/dist/domain`: el barrel compilado de `shared` re-exporta sin extensión `.js` (Node ESM la
   exige). `npm run dev` (tsx) y vitest (vite) lo resuelven como bundler → no bloquea. **Fix para
   build/deploy:** añadir `.js` a los imports de `shared/src/*` o pasar a TS project references.
4. **(Fase 5)** El bundle de `apps/web` es un solo chunk ~512KB (gzip 143KB; React+Router+Query+Supabase).
   Warning de Vite, no error. Oportunidad de code-split / `manualChunks` en Fase 8 (deploy).

**✅ MIGRACIÓN COMPLETA (Sesión 11) — Fases 0–9 terminadas y verdes.** Plan ejecutado:
`C:\Users\Leonardo\.claude\plans\splendid-gathering-ocean.md` (cierre Fase 7–9 + costura "App madre +
Paz y Salvo como módulo": SA/TH operan la **plataforma** `/inicio`+módulos; CI/AREA son roles **acotados**;
namespace `/paz-y-salvo/*`).
**Fase 7 completa:** 7.1 hooks · 7.2 login/pendiente · 7.3 dashboard · 7.4a/b/c funcionarios (lista+modal+detalle+acciones) ·
7.5 mi-área+usuarios (`MiAreaPage`/`UsuariosPage`/`GestionUsuario`) · 7.6 costura permisos · 7.7 layout adaptativo ·
**7.8 Home `/inicio`** (lanzador de módulos + "qué resolver hoy" role-aware; actividad reciente diferida sin inventar endpoint) ·
review final independiente (APROBADO C/OBSERVACIONES, hallazgos MENOR atendidos).
**Fase 8 completa:** 8.1 `.env.example` backend+raíz · **8.3 ESM saldado** (`.js` en imports de `shared/src/*` → `node dist`
arranca) + **code-split** (`manualChunks` → warning 500KB eliminado) + **Vercel scaffold** (`api/index.ts`+`vercel.json`).
**Fase 9:** limpieza Next ya completa desde Sesión 10. **Lock podado** (`npm install` → sin deps Next).
**Decisión de diseño:** "Patrones sobre el Sello" (craft token-agnóstico de SIGAF + tokens del Sello; sin re-skin).
Estado certificado: shared **62/62** · backend 68+1 skip · web typecheck limpio + 9/9 · **build raíz exit 0 SIN warnings** ·
`node dist` backend arranca. SIN commitear. Detalle en `.superpowers/sdd/progress.md` (bloque "SESIÓN 11").
**Pendiente = solo ACCIÓN HUMANA (no código):** `.env` reales → smoke E2E (`dev:api`+`dev:web`) → clic login Google
(verificar aterrizaje por rol) → deploy Vercel → commit semántico del working tree → endurecer SECURITY DEFINER en Supabase.

> 🟢 **BOOTSTRAP de la próxima sesión:** el bloque autocontenido **"🟢 HANDOFF — RETOMAR EN SESIÓN 9
> (Fases 7–9)"** al final de `.superpowers/sdd/progress.md` consolida el protocolo de arranque, las
> decisiones vinculantes, el roadmap de las 3 fases restantes (9 tareas) con sus gotchas, la deuda técnica
> que bloquea el cierre y la primera acción concreta. Léelo primero.

**Cómo arrancar la próxima sesión sin errores:**
```bash
npm run build --workspace=shared        # SIEMPRE primero (exports→dist)
npm run test  --workspace=shared        # 62 pass
npm run test  --workspace=apps/backend  # 68 pass + 1 skip
npm run typecheck --workspace=apps/web  # tsc --noEmit limpio
npm run test  --workspace=apps/web      # 9 pass
npm run build                           # raíz: shared+backend+web exit 0
npm test                                # raíz: ahora encadena los 3 workspaces (ya no usa tests/ legacy)
```
`node_modules` ya instalado. Para correr en vivo: terminal A `npm run dev:api` (:3000), B `npm run dev:web`
(:5173) — requiere `.env`/`.env.local` (backend: DATABASE_URL/SUPABASE_JWT_SECRET; web: VITE_SUPABASE_*).
Si algo falla, reconstruir estado desde `.superpowers/sdd/progress.md` + `git status`.

### ✅ Completado y en working tree (NO commiteado)

**Commit base (3b10bd1):**
- Scaffold Next.js + dominio + máquina de estados (TDD 10/10).
- Cimientos de calidad: Prettier, ESLint flat config, Husky + lint-staged, env Zod.

**Working tree (sin commit — respetar constraint):**

> ⚠️ **HISTÓRICO — el árbol Next que describe esta subsección YA NO EXISTE.** En la Sesión 10 se
> ejecutó la limpieza de Fase 9: se borraron `app/`, `lib/`, `components/`, `tests/`, `middleware.ts`,
> `public/` raíz y toda la config Next (`next.config.mjs`, `tsconfig.json` raíz, `tailwind`/`postcss`
> raíz, `vitest.config.ts`, `eslint.config.mjs`, `.husky/`). Su valor vive portado en `shared/` + `apps/*`.
> Lo de abajo se conserva solo como registro de QUÉ se construyó en Fase 1; ya no es el estado del árbol.

**Fase 1 — Fundación técnica (COMPLETA, verificada 84/84 tests):**
- `lib/permisos.ts` — `rutaInicialPorRol`, `areaPermitida`, `rolPuedeVerVista`, `VistaSupervision` (+13 tests).
- `lib/usuarios.ts` — `decidirAltaUsuario`, `errorInvarianteUsuario`, `normalizarEmail` (+10 tests).
- `lib/paginacion.ts` — `paginar`, `normalizarPagina`, `POR_PAGINA_DEFECTO` (+6 tests).
- `lib/config/env.ts` — `SUPERADMIN_EMAIL`, `DOMINIO_PERMITIDO`, `NEXT_PUBLIC_SITE_URL`, `authHabilitada` (+13 tests).
- `lib/domain.ts` — extendido con `RolUsuario`, `EstadoUsuario`, `Usuario`, `Pagina`, `ResultadoPaginado<T>`, `FiltroFuncionarios`, `MetricasDashboard`.
- `lib/repos/types.ts` — contrato `Repo` extendido con lecturas paginadas + CRUD usuarios.
- `lib/repos/memory.ts` + `lib/repos/supabase.ts` — todos los métodos nuevos implementados.
- `lib/seed.ts` — `USUARIOS_SEED` (6 usuarios demo).
- `tests/repo-usuarios.test.ts` — 14 tests contra memoryRepo (+singleton reiniciado en beforeEach).
- `lib/supabase/` (client, ssr-server, middleware-client).
- `middleware.ts` — passthrough demo / renovación sesión + guard de borde.
- `lib/auth.ts` — `obtenerUsuarioActual`, `asegurarUsuario`, `requireUsuario`, `requireArea`.
- Rutas: `/login`, `/auth/callback`, `/pendiente`.
- Componentes: `BotonGoogle`, `BotonSalir`.
- `supabase/migrations/0003` + `seed.sql` + `.env.example`.
- OAuth Google configurado en Supabase y Google Cloud.

**Impeccable — Refinamiento P1 visual (COMPLETA, verificada 84/84 tests):**
- `PRODUCT.md` + `DESIGN.md` + `.impeccable/` creados (design system documentado).
- Eyebrows de sección eliminados de todas las pantallas.
- `StatCard` (dashboard): sin filete lateral, sin `text-gold-foil`, cifras tabulares sans.
- `globals.css`: `.text-gold-foil` eliminado, scrollbar redondeado.
- Contraste AA: `silver-400/500` → `silver-600` en todos los componentes.
- `GenerarLiquidacionButton` + `LiquidarButton`: confirmación inline (sin modal) antes de transición irreversible.

### ⏳ Pendiente — ⚠️ SUPERADO POR LA MIGRACIÓN

> Esta lista pertenece al plan **Next.js** anterior. Lo de valor (login OAuth, endurecer SECURITY
> DEFINER, vistas por rol, query param `?vista=`) se reabsorbe dentro de la migración Vite+Express
> (ver el bloque "🔴 MIGRACIÓN" arriba y el plan/ledger). Se conserva como referencia histórica;
> **no ejecutar contra el árbol Next.js** que está en proceso de ser reemplazado.

1. **Login end-to-end (humano):** clic real de Google OAuth → verificar autoregistro + promoción SUPERADMIN
   (si pantalla "External+Testing" en GCP, agregar `leonardoreales@americana.edu.co` como test user).

2. **Endurecer SECURITY DEFINER:** `REVOKE EXECUTE ON FUNCTION rol_de, es_superadmin FROM anon, authenticated`.

3. **P2 visual — Hero-metric del dashboard:** las 5 StatCards idénticas necesitan la plantilla
   hero-metric de Impeccable (`/impeccable layout`). Luego re-correr `/impeccable critique app/page.tsx`
   (baseline actual: 24/40).

4. **Fase 2 — Sistema visual "C" (aditiva, sin cambiar comportamiento):**
   - Tokens en `tailwind.config.ts`: `estado.ok #16936a + okBg`, `info #3b6fd4 + infoBg`, `bg #f4f7fb`.
   - `app/globals.css` actualizado.
   - Pills centralizadas en `lib/ui.ts`.
   - Componentes: `Segmented`, `FilaDesplegable` (acordeón), `Paginacion` (server-driven), `Buscador` (debounce → `?q=`), `ChipFiltro`, `Avatar`, `EstadoPill`, `EmptyState`.

5. **Fase 3 — Vistas por rol:**
   - `app/funcionarios/page.tsx` — sesión real con `requireUsuario`, catálogo paginado con acordeón (`listarFuncionariosPaginado`).
   - `app/mi-area/page.tsx` — nuevo, `requireArea`, cola de trabajo del área.
   - `app/usuarios/page.tsx` — nuevo, solo SUPERADMIN, asignar rol/área a PENDIENTE.
   - `app/actions.ts` — guardas `requireArea`/`requireUsuario`, autor desde sesión; acciones `asignarRolUsuarioAction`/`cambiarEstadoUsuarioAction`.
   - `app/layout.tsx` — async, lee usuario, pasa `rol` a `Nav`/`SelectorVista`, botón cerrar sesión real.
   - Dashboard `/` — solo SUPERADMIN.
   - RLS de datos en funcionarios/aprobaciones/observaciones.
   - Query param de supervisión: `?vista=th|ci` (NO el viejo `?rol=`). Eliminar la simulación `?rol=` en `/funcionarios`. Conservar `@modal/(.)[id]` + `[id]`.

6. **Commit ordenado de todo el working tree** (cuando el usuario lo pida, en commits semánticos por fase).

---

## 9. Reglas de Trabajo (para Claude)

### Constraint duro

**NUNCA commitear ni hacer push** sin que el usuario lo pida explícitamente.
"Checkpoint" = actualizar este CLAUDE.md. Cero acciones git salvo instrucción directa.

### TDD y calidad

- Escribir tests antes de implementación para lógica de dominio/permisos/repo.
- `npm test` + `npm run typecheck` + `npm run build` deben quedar en verde antes de cerrar sesión.
- Tests de repo: usar `memoryRepo`, reiniciar el singleton `globalThis` en `beforeEach`.

### Patrones de implementación

- `getRepo()` para todo I/O.
- `requireUsuario(roles?)` / `requireArea(areaId)` en cada server component/action protegido.
- `lib/ui.ts` como única fuente de color por estado.
- Tailwind: clases literales — no construir nombres en runtime.
- `lib/estado.ts` intocable salvo TDD previo.
- Query param de supervisión TH/CI es `?vista=th|ci`.

### Diseño

- Nunca romper las Reglas Nombradas del `DESIGN.md` (Sello, Semáforo, Serif, Tabular, Hairline).
- Siempre respetar los bans absolutos listados en §6.
- Contraste WCAG 2.1 AA en todo texto real (≥ 4.5:1).

### Al final de cada sesión exitosa

1. Actualizar la sección **"Progreso"** de este CLAUDE.md.
2. Agregar una entrada al **"Log de Sesiones"** (§10).
3. Verificar: `npm test` verde, `tsc` limpio, `build` OK.
4. Ofrecer commit (pero no hacerlo sin instrucción).

---

## 10. Log de Sesiones

### 2026-06-23 — Sesión 1 (tarde): Fase 1 completa + OAuth + Supabase

- Scaffold inicial, dominio, máquina de estados, TDD 10/10.
- Cimientos de calidad (Prettier, ESLint, Husky).
- `lib/permisos`, `lib/usuarios`, `lib/paginacion`, `lib/config/env` con tests.
- Repos extendidos (paginación + CRUD usuarios), memoryRepo + supabaseRepo.
- Auth completo: `lib/auth`, `middleware`, `/login`, `/auth/callback`, `/pendiente`.
- Supabase provisionado: `vwcnqrdicjarkorqdrue` · migraciones 0001-0003 + seed aplicados.
- OAuth Google configurado end-to-end (falta solo el clic humano de login).
- Estado: 84/84 tests · tsc OK · build OK · working tree SIN commitear.

### 2026-06-23 — Sesión 2 (tarde): Impeccable P1 — Refinamiento visual

- `PRODUCT.md`, `DESIGN.md`, `.impeccable/` creados.
- Critique baseline: 24/40. 5 issues P1 aplicados (bans + Sello).
- Eyebrows eliminados, `StatCard` corregida, `globals.css` limpio, contraste AA, confirmaciones inline.
- Estado: 84/84 tests · tsc OK · build OK · working tree SIN commitear.
- Pendiente P2: hero-metric del dashboard.

### 2026-06-23 — Sesión 3: Grafo del conocimiento + este CLAUDE.md

- Grafo del proyecto construido y verificado (440 nodos, 883 aristas, 31 comunidades, sin ciclos).
- CLAUDE.md maestro creado como cerebro único del repositorio.
- Memorias fragmentadas de Claude consolidadas aquí y limpiadas.

### 2026-06-24 — Sesión 4: Inicio migración Vite + Express (Fases 0–2)

- **Decisión de arquitectura:** migrar de Next.js a monorepo independiente Vite+React / Express /
  shared, con el stack y calidad de SIGAF. Auth híbrida (login Supabase + autorización en backend).
  Plan detallado creado con superpowers (10 fases) y ejecutado con subagent-driven-development.
- **Decisiones de ejecución:** sin commits hasta orden del usuario · directo en `main` · in-place ·
  política de tests lean (solo guardas de auth + transición de estado son tests nuevos).
- **Fase 0** monorepo workspaces + tsconfig.base. **Fase 1** `shared/@pys/shared` (dominio verbatim +
  schemas Zod, 59 tests). **Fase 2** `apps/backend/@pys/api` (env Zod, schema+cliente Drizzle, 3 puertos,
  3 repos portados desde supabase.ts; test de repo gated por DB).
- **Checkpoint (pausa solicitada):** shared 59/59 · backend 4 pass+1 skip · ambos `tsc` build exit 0.
- Tradeoffs vivos: backend tsconfig ESNext/Bundler; shared exporta `dist/` (buildear shared primero).
- **Próximo:** Fase 3 — casos de uso con guardas de rol + guardas de transición (los repos no las tienen).
- Detalle de avance y reanudación en `.superpowers/sdd/progress.md`. Working tree SIN commitear.

### 2026-06-24 — Sesión 5: Fase 3 — casos de uso del backend (application) con guardas

- **Fase 3 COMPLETA** (TDD, política lean). Capa `apps/backend/src/application/`: **11 casos de uso** con
  guardas de rol/área + transición de estado, reglas portadas VERBATIM de `lib/services.ts` + `lib/auth.ts`.
- Patrón factory de inyección `useCase(deps) => (actor: Usuario, input) => Promise`. `errors.ts`
  (403/400/404 vía `.status`), helper `exigirRol`, barrel `application/index.ts`, fixtures de test.
  - funcionarios: `cambiarEstadoArea` (areaPermitida + observación obligatoria al rechazar/devolver),
    `generarLiquidacion` (TH/SA + transición LISTO_PARA_LIQUIDAR + notif best-effort opcional),
    `registrarLiquidacion` (CI/SA + transición LIQUIDACION_GENERADA), `listarFuncionarios`/`obtenerDetalle`
    (supervisores), `obtenerMetricas` (solo SA).
  - miarea: `listarGestionArea` (areaPermitida). usuarios: `asignarRol`/`cambiarEstadoUsuario` (SA +
    invariante rol↔área), `listarUsuarios` (SA). areas: `listarAreas` (referencia, sin guarda de rol).
    auth: `asegurarUsuario` (autoregistro puro, deps inyectadas).
- **Desviación útil:** `shared/src/schemas.ts` ahora tipa los `z.enum` con las uniones del dominio (no
  `string`) → casos de uso reciben tipos exactos sin casts. Runtime idéntico (shared 59/59 sigue verde).
- **Verificación:** shared 59/59 · backend **52 pass + 1 skip** · ambos `tsc` build exit 0. Output pristine.
- **Próximo:** Fase 4 — capa HTTP (JWT Supabase con `jose`, requireAuth/requireRol/errorHandler, controllers,
  routes, composition root, Express app). Working tree SIN commitear.

### 2026-06-24 — Sesión 6: Fase 4 — capa HTTP del backend (interface)

- **Fase 4 COMPLETA** (skill `executing-plans` + TDD, política lean). Capa `apps/backend/src/interface/`:
  frontera de autenticación/autorización del backend.
- **4.1** `infrastructure/auth/supabaseJwtVerifier` — `verificarJwt` con `jose` (HS256, `SUPABASE_JWT_SECRET`)
  → `{sub,email,nombre}`. *Desviación útil:* añade `nombre` (de `user_metadata`) para el autoregistro.
- **4.2** `interface/middleware` — `crearRequireAuth` (factory: Bearer → verifica → autoregistra →
  `req.usuario`; 401/403), `requireRol(...roles)` (403), `errorHandler` (`.status`→JSON). Nuevo error
  `ErrorAutenticacion` (401). Augment de `Express.Request` con `usuario?`.
- **4.3** `interface/` ensamblado — `container.ts` (composition root: 3 repos → 11 casos de uso +
  `requireAuth`), `asyncHandler`, controllers (`funcionarios`/`usuarios`/`auth`, Zod→400), routes
  (`auth`/`funcionarios`/`usuarios`/`catalogo`), `app.ts` (helmet/cors/compression/rate-limit/`/health`),
  `serverless.ts`, `index.ts` (listen). Endpoints del plan montados bajo `/api`.
- **+16 tests nuevos** (jwt 3, requireAuth/requireRol/errorHandler 9, smoke HTTP con supertest 4). Se añadió
  `supertest` como devDep.
- **Tradeoff confirmado en runtime:** `node dist` falla por re-exports sin `.js` en `shared/dist`; dev (tsx)
  y vitest OK. Fix de deploy: extensiones `.js` en `shared/src/*` o TS project references. Fuera de scope.
- **Verificación:** shared 59/59 · backend **68 pass + 1 skip** · ambos `tsc` build exit 0. Dev (tsx) OK.
- **Próximo:** Fase 5 — `apps/web` (Vite + React + React Router + TanStack Query): cliente HTTP con JWT,
  login Google Supabase, vistas por rol que reflejan la autorización del backend. Working tree SIN commitear.

### 2026-06-24 — Sesión 7: Tooling — skills de diseño frontend (global)

- **Sesión de herramientas, sin cambios al código del proyecto.** Se instalaron 3 skills de diseño
  frontend a nivel **global** (`~/.claude/skills/`, disponibles en todos los proyectos):
  `frontend-design` (oficial Anthropic, vía plugin), `ui-ux-pro-max` (~96k ⭐, `npx uipro-cli init`),
  `design-taste-frontend` (taste-skill ~50k ⭐, `npx skills add --global --copy`).
- Activación desde el chat: pedirlas por nombre o `/<nombre>`. Documentado en memoria
  (`memory/skills-diseno-frontend.md` + índice `MEMORY.md`).
- **Working tree del proyecto sin tocar** (solo se modificó `~/.claude/`, fuera del repo). Sin commits.
- **Próximo (sin cambios):** Fase 5 — `apps/web`.

### 2026-06-24 — Sesión 8: Fases 5 y 6 — frontend `apps/web` (Vite + auth + router + design system)

- **Fases 5 y 6 COMPLETAS** (skill `executing-plans` + TDD, política lean). Skills de diseño
  `ui-ux-pro-max` + `design-taste-frontend` activas como referencia de calidad/a11y; `DESIGN.md` mandó
  como fuente de verdad de marca (port verbatim del Sello).
- **Fase 5** `apps/web` (`@pys/web`) añadido a workspaces, `npm install` OK. **5.1** scaffold Vite 5 +
  React 18 + RR6 + TanStack Query 5 (`tailwind.config.ts`/`index.css` portados verbatim). **5.2** cliente
  `lib/api.ts` (JWT Bearer de Supabase, `ApiError`, endpoints tipados a los casos de uso), `lib/supabase`,
  `queryClient`, `utils`, `AuthContext` (login Google + `/auth/me` = fuente de rol/estado). **5.3**
  `ProtectedRoute` por rol, `useRole`, `CallbackPage` (`rutaInicialPorRol`), `App.tsx` (router por rol),
  páginas base login/pendiente + `EnConstruccion`. **Desviación:** se omite `ThemeContext` (tema único).
- **Fase 6** design system portado del árbol Next (verbatim + swaps Next→RR): `ui/` EstadoPill, Avatar,
  PageHeader, EmptyState, ListaSkeleton, FilaDesplegable, ChipFiltro, Segmented, Paginacion, Buscador,
  Modal; `Layout` (sidebar navy por rol, drawer móvil) + `BotonSalir` (logout real). Assets a `public/`.
- **+9 tests nuevos** en web (api 2, ProtectedRoute 5, EstadoPill 2). **Verificación:** shared 59/59 ·
  backend 68 pass+1 skip · web typecheck limpio + 9/9 · `npm run build` raíz (shared+backend+web) exit 0.
- **Tradeoff nuevo:** bundle web ~512KB single chunk (gzip 143KB) → code-split en Fase 8. Hooks impeccable
  marcaron valores que son port verbatim intencional (navy-600, premium-card, mono, tints del sidebar),
  no suprimidos en config (sin confirmación). Detalle en `.superpowers/sdd/progress.md`.
- **Próximo:** Fase 7 — páginas por feature con TanStack Query (reemplazar `EnConstruccion`). Working tree
  SIN commitear.

### 2026-06-24 — Sesión 8b: Checkpoint y handoff para retomar Fases 7–9

- **Sesión de traspaso, sin cambios de código.** Re-verificación del checkpoint **2026-06-24 11:18**:
  shared **59/59** · backend **68 pass + 1 skip** · web typecheck limpio + **9/9** · `npm run build` raíz
  **exit 0** (warning bundle 512KB = tradeoff conocido, no error).
- Escrito el bloque autocontenido **"🟢 HANDOFF — RETOMAR EN SESIÓN 9 (Fases 7–9)"** al final de
  `.superpowers/sdd/progress.md`: protocolo de arranque, decisiones vinculantes, roadmap de las 3 fases
  restantes (9 tareas) con gotchas, deuda técnica que bloquea el cierre (`.js` ESM en `shared/dist`,
  buildear shared primero, code-split del bundle) y la primera acción (crear `useFuncionarios.ts`, Task 7.1).
- Puntero al handoff añadido en §8 (próximo paso). **Working tree SIN commitear.**
- **Próximo:** Sesión 9 — ejecutar Fase 7 (7.1→7.5), luego Fase 8 (integración/deploy) y Fase 9 (limpieza Next).

### 2026-06-24 — Sesión 9: Fase 7 (7.1–7.3) — páginas por feature, PAUSA en checkpoint

- **Ejecución vía `subagent-driven-development` + `engineering-architecture-pro`** (4 reglas activas; política
  lean confirmada en pre-flight: Fase 7 no añade tests, gate = typecheck + 9 tests + build verdes). Sin commits.
- **7.1 Hooks de datos COMPLETA** — `src/hooks/{useFuncionarios,useMiArea,useUsuarios,useMetricas,useAreas}.ts`:
  queries (con `enabled` en condicionales, `staleTime` en áreas) + 5 mutaciones con `invalidateQueries` por prefijo.
  Keys inline (sin factory). Review directo limpio.
- **7.2 Login + Pendiente pulidos COMPLETA** — pulido visual sobre versiones base (lógica intacta): logo con
  drop-shadow oro; badge ⏳/🔒. Desviación documentada: omitidos banners `?error=` (sin productor en SPA) y modo demo.
- **7.3 Dashboard SA COMPLETA** — port de `app/page.tsx` (1 archivo), swaps Next→RR, `useMetricas()`+`useAuth()`,
  estados loading/error, "Actualizar"→`refetch()`. Reviewer fresco: Spec ✅ / Calidad aprobada. App.tsx ruta `/` cableada.
- **Estilo SIGAF extraído + decisión de diseño** — se extrajo el sistema de estilo de `C:\Users\Leonardo\SIGAF`
  (`scratchpad/sigaf-style-extraction.md`). El usuario eligió **"Patrones sobre el Sello"**: adoptar el craft
  token-agnóstico de SIGAF (entrada escalonada de filas, hover doble-señal, skeleton estructural, tabular-nums+mono
  en datos) conservando los tokens del Sello (sin re-skin, sin tocar DESIGN.md, sin retrofit). Bans del Sello
  respetados (sin eyebrows, sin filete lateral, sin lino cálido/swap de fuentes/oro >10%). Ref: `scratchpad/craft-patterns-sello.md`.
- **7.4c Acciones COMPLETA** — `AccionesArea`/`GenerarLiquidacionButton`/`LiquidarButton` portados; server-action→hook
  de mutación (`mutateAsync`/`ApiError`/`isPending`); role-agnósticos (el padre hace gating).
- **7.4b Detalle COMPLETA** — `DetalleFuncionario`+`AreaList`; token remap legado→Sello; gating por rol (Generar=TH/SA,
  Liquidar=CI/SA, áreas=solo SA); craft dual-señal. Faltan **7.4a** (lista + ruta `/:id` con Modal) y **7.5**.
- **Checkpoint seguro #2 (pausa solicitada):** shared 59/59 · backend 68+1 skip · web typecheck limpio + 9/9 ·
  build raíz exit 0. Repo limpio (scratchpad externo; ledger git-ignored). Working tree SIN commitear.
- **Próximo:** reanudar en Task 7.4a → 7.5 → review final Fase 7 → Fase 8 (8.1 .env, 8.3 ESM+vercel+code-split).

### 2026-06-24 — Sesión 10: 7.6+7.7+7.4a + costura plataforma/módulo + Punto 9 (limpieza Next) adelantado

- **Plan vigente cambiado a** `C:\Users\Leonardo\.claude\plans\splendid-gathering-ocean.md`: cierre Fase 7–9
  **+ costura "App madre + Paz y Salvo como módulo"** (SA/TH operan la plataforma `/inicio`+módulos; CI/AREA
  son roles acotados que entran directo a su trabajo; namespace `/paz-y-salvo/*`). Ejecución vía
  subagent-driven-development + engineering-architecture-pro (política lean: solo `permisos.ts` lleva tests).
- **7.6 costura COMPLETA** — `shared/permisos.ts`: `rutaInicialPorRol` (SA/TH→`/inicio`, CI→`/paz-y-salvo/
  funcionarios?vista=ci`, AREA→`/paz-y-salvo/mi-area`) + nueva `rolVePlataforma` (+tests → **62**). `App.tsx`:
  namespace `/paz-y-salvo/*`, `/inicio` (SA+TH), `/usuarios` (SA), `RootRedirect` por rol.
- **7.7 layout COMPLETA** — `Layout.tsx` `sectionsForRole` plataforma (Inicio+módulo+admin) vs acotado
  (solo su bandeja) + `routeLabels`/hrefs nuevos.
- **7.4a lista+modal COMPLETA** — `pages/funcionarios/FuncionariosPage.tsx` (port de `app/funcionarios/page.tsx`:
  Buscador+ChipFiltro+Segmented `?vista=`+FilaDesplegable+Paginacion+Bandeja vía `useFuncionarios`, `<Outlet/>`
  al final) + `FuncionarioModal.tsx` (envuelve `DetalleFuncionario` en `Modal`, `:id` por `useParams`). `App.tsx`:
  `:id` anidada como hija (hereda guarda del padre vía Outlet; link relativo `to={f.id}`). Reviewado directo: ✅.
- **🧹 PUNTO 9 (limpieza Next legacy) ADELANTADO Y COMPLETO** (a petición del usuario). Verificado primero que
  el monorepo está 100% desacoplado (cero imports `@/` desde `shared`/`apps`; el build raíz no compilaba Next).
  **Borrado:** `app/ lib/ components/ tests/ middleware.ts next.config.mjs next-env.d.ts postcss.config.mjs
  tailwind.config.ts tsconfig.json vitest.config.ts graphify-out/ tsconfig.tsbuildinfo public/` (dup de
  apps/web) + (decisión del usuario) `eslint.config.mjs` + `.husky/` (tooling de calidad huérfano; se hizo
  `git config --unset core.hooksPath`). **Arreglado** `package.json` raíz: script `test` ahora encadena los 3
  workspaces (antes apuntaba a `tests/` borrado). **Preservado:** `apps/ shared/ supabase/ secrets/ docs/` + docs
  raíz + `tsconfig.base.json`; la referencia de port para 7.5 (GestionUsuario + páginas usuarios/mi-area) se
  guardó en `.superpowers/sdd/legacy-port-references-7.5.md` antes de borrar.
- **Pendiente cosmético (Fase 8):** `package-lock.json`/`node_modules` aún cargan deps obsoletas de Next
  (next, eslint, husky, lint-staged) → `npm install` las podaría del lock. Sin urgencia.
- **Verificación final (todo verde):** shared **62/62** · backend **68 pass + 1 skip** · web typecheck limpio +
  **9/9** · `npm run build` raíz **exit 0** (solo warning conocido del chunk 512KB). Working tree SIN commitear.
- **Próximo:** reanudar en **Task 7.5** (portar `MiAreaPage` + `UsuariosPage` + `GestionUsuario` desde la
  referencia preservada) → 7.8 Home `/inicio` → review final Fase 7 → Fase 8 (8.1 .env, 8.3 ESM+vercel+code-split).

### 2026-06-24 — Sesión 11: Cierre Fase 7 (7.5+7.8+review) + Fase 8 → MIGRACIÓN FUNCIONALMENTE COMPLETA

- **Task 7.5 COMPLETA** — `pages/usuarios/GestionUsuario.tsx` (server-action→`useAsignarRol`/`useCambiarEstadoUsuario`,
  `ApiError`; invariante AREA↔área lo rechaza el backend con 400) + `pages/usuarios/UsuariosPage.tsx` (`useUsuarios`+`useAreas`,
  FilaDesplegable `defaultOpen` si PENDIENTE) + `pages/miarea/MiAreaPage.tsx` (`useRole`+`useAreas`+`useMiArea`; AREA su cola,
  SA chips `?area=<orden>`; reusa `AccionesArea`). `App.tsx`: 2 `EnConstruccion` → páginas reales.
- **Task 7.8 COMPLETA** — `pages/inicio/InicioPage.tsx` role-aware (plataforma SA/TH): lanzador de módulos (Paz y Salvo
  activo, destino por rol; 2 módulos futuros inertes honestos) + "qué resolver hoy" con datos reales (SA `useMetricas`,
  TH `useFuncionarios` bandeja) sin endpoint nuevo; actividad reciente DIFERIDA (sin feed backend, no se inventa).
  `useMetricas` ahora acepta `enabled` (TH en `/inicio` no dispara `/metricas` SA-only → evita 403). `EnConstruccion.tsx` borrado.
- **Bug latente arreglado:** `DashboardPage` (en `/paz-y-salvo`) enlazaba a rutas pre-namespace `/funcionarios*` rotas
  tras 7.6 → corregidos los 5 enlaces a `/paz-y-salvo/funcionarios*`.
- **Review final Fase 7** (subagente revisor independiente, adversarial): **APROBADO CON OBSERVACIONES** (sin
  CRÍTICO/IMPORTANTE; namespaces/datos/gating correctos; 403 de TH bien evitado; Sello respetado). Atendidos: AREA-sin-área
  con EmptyState propio, ramas de error en UsuariosPage/MiAreaPage, `{enabled:true}` redundante quitado.
- **Fase 8 COMPLETA:** 8.1 `apps/backend/.env.example` (espejo Zod de `env.ts`) + `.env.example` raíz reescrito como guía
  del monorepo. **8.3 DEUDA ESM SALDADA** — `.js` en todos los imports relativos de `shared/src/*` → `node shared/dist/index.js`
  y `node apps/backend/dist/interface/serverless.js` arrancan sin `ERR_MODULE_NOT_FOUND` (verificado en runtime). **code-split**
  (`vite.config` `manualChunks` react-vendor + data-vendor → bundle de 590KB a 3 chunks, warning 500KB ELIMINADO). **Vercel
  scaffold** `api/index.ts` + `vercel.json` (deploy real = acción humana). `npm install` podó las deps Next del lock.
- **Fase 9:** ya completa desde Sesión 10.
- **Verificación final:** shared **62/62** · backend **68 pass + 1 skip** · web typecheck limpio + **9/9** · `npm run build`
  raíz **exit 0 SIN warnings** · `node dist` backend arranca. **Working tree SIN commitear** (constraint respetado).
- **Pendiente = solo ACCIÓN HUMANA:** `.env` reales → smoke E2E → clic login Google (aterrizaje por rol) → deploy Vercel →
  commit semántico → endurecer SECURITY DEFINER (REVOKE EXECUTE rol_de/es_superadmin FROM anon, authenticated).

### 2026-06-24 — Sesión 12: Auditoría completa (4 agentes en paralelo) + uplift a calidad de producción (P0+P1+P2)

- **Skill activa:** `engineering-skills:senior-fullstack` (disciplina Karpathy/Pocock). **Auditoría exhaustiva** del monorepo
  con 4 agentes en paralelo (shared · backend · web · infra), merge consolidado: 4 P0, varios P1, P2 de pulido/a11y. Plan
  completo aprobado en `C:\Users\Leonardo\.claude\plans\dise-a-un-plan-completo-greedy-prism.md` (alcance P0+P1+P2 + fase
  de production readiness). **TDD** en toda lógica de dominio/guardas. **Sin commits** (constraint respetado).
- **Fase A (seguridad P0):** **A1** JWT ahora valida `issuer`+`audience`+`algorithms`; HS256 *gated* (solo fuera de
  producción) → cierra algorithm-confusion (`supabaseJwtVerifier.ts`, +4 tests). **A2** nuevo middleware `requireActivo`
  (rechaza usuarios `INACTIVO`/`PENDIENTE` en toda ruta sensible salvo `/auth/me`; la desactivación surte efecto inmediato)
  cableado en los 3 routers (+4 tests). **A3** migración `0005_revoke_security_definer.sql` creada (REVOKE EXECUTE de las 5
  funciones SECURITY DEFINER) — **apply vía MCP quedó pendiente: el MCP de Supabase no estaba conectado en la sesión**.
  **A4** `env.ts` con `.superRefine` que falla el arranque en producción si `WEB_ORIGIN`=localhost, `sslmode=no-verify` o
  hay `SUPABASE_JWT_SECRET` (+4 tests). [el `sslmode` del `.env` local = acción humana, no se tocó en caliente].
- **Fase B (robustez backend):** **B1** las 3 mutaciones del trámite envueltas en `db.transaction` (recálculo atómico) +
  guarda TOCTOU/idempotencia en los hitos (`WHERE estado_global=<esperado>`+`returning`). **B2** `cambiarEstadoArea` ahora
  carga `obtenerDetalle` → 404 si no existe, 400 si el trámite está cerrado (PAZ_Y_SALVO) (+2 tests). **B3** `errorHandler`
  nunca filtra `err.message` en 5xx (mensaje genérico + log con método/ruta).
- **Fase D (dominio/validación):** **D1** `decidirAltaUsuario` fail-closed ante env vacía (+2 tests). **D2** `schemas.ts`
  con `.strict()` (3 schemas de body) + `.uuid()` en IDs; tests de schemas 2→13 (coerción/topes/enum/strict).
- **Fase C (resiliencia web):** **C1** `AuthContext` no se cuelga con backend caído (`errorArranque`+try/finally) y
  `ProtectedRoute` muestra pantalla de reintento. **C2** 401 global → `signOut` (≠403). **C3** error de OAuth leído en el
  callback → banner sobrio en login. **C4** contraste AA: `text-silver-500`→`silver-600` en 6 archivos (ban del Sello).
- **Fase E (Sello+a11y):** `estadoUsuarioPill` centralizado en `@pys/shared` (Semáforo Único; UsuariosPage deja de
  hardcodear color). Modal con focus-trap real + restauración de foco + `aria-label`. FilaDesplegable con `aria-controls`+
  `role=region`. Query "bandeja" de FuncionariosPage con `enabled` (sin HTTP inútil). **E2 (oro ≤10%) = revisión visual
  diferida** (subjetivo, requiere datos reales; no se tocó a ciegas).
- **Fase F (producción):** `.github/workflows/ci.yml` (build shared→test×3→typecheck web→build→audit); tests de integración
  Drizzle *gated* por secret `DATABASE_URL_TEST` (auto-skip si ausente). `/api/health` alcanzable tras el rewrite de Vercel.
  `vercel.json` con cabeceras de seguridad de la SPA (CSP/HSTS/X-Frame-Options/…). Migración `0006_indices.sql`
  (`funcionarios.estado_global`, `observaciones.area_id`). errorHandler con contexto de request.
- **Verificación final:** shared **75/75** · backend **83 pass + 1 skip** · web typecheck limpio + **9/9** · `npm run build`
  raíz **exit 0 SIN warnings** · `node dist` backend arranca (ESM OK). **Working tree SIN commitear.**
- **Pendiente = ACCIÓN HUMANA:** aplicar migraciones `0005`/`0006` (vía MCP/CLI Supabase) + correr advisors · `.env` reales
  → smoke E2E (incl. probar desactivación de usuario y backend caído) · rotar/mover secretos a Vercel Env · `sslmode=require`
  en `.env` local · deploy Vercel preview + verificar `/api/health` y CSP · commit semántico por fases.

### 2026-06-24 — Sesión 13: Panel de control (fusión Inicio + Resumen) con dashboard, gráficas y segmentadores

- **Feature nueva** (brainstorming → plan `enfoque-a-velvet-babbage.md` aprobado → ejecución TDD lean). Se **fusionaron** la
  página Inicio (`/inicio`, SA+TH) y el Resumen/Dashboard (`/paz-y-salvo`, solo SA) en una sola **"Panel de control"** en
  `/inicio`, vista **completa por SA y TH**. CI/AREA sin cambios (entran directo a su trabajo). Skills: `ui-ux-pro-max` +
  `design-taste-frontend` (modo redesign-preserve; el Sello manda, sin re-skin).
- **Backend:** guarda de `/metricas` abierta a `["SUPERADMIN","TALENTO_HUMANO"]` en **ambas capas** (caso de uso
  `obtenerMetricas.ts` + ruta `catalogo.routes.ts`). Test `lecturasCatalogo.test.ts` actualizado (SA/TH ok, CI/AREA 403).
- **Shared:** nuevo `metricas.ts` puro (`agregarPorEstado` / `calcularAging` [regla aging replicada VERBATIM del repo] /
  `agruparPorCampo` / `filtrarPorRangoRetiro`) **+10 tests** → 85. `ui.ts`: `COLOR_ESTADO` + `COLOR_AGING` en HEX (Semáforo
  Único para SVG/Recharts, mismos tokens del Sello).
- **Web:** `recharts` instalado (lazy-load). Hook `useFuncionariosTodos` (fetch-all paginado en bucle; tope `porPagina=100`).
  UI compartida extraída a `components/ui/dash/` (Icon, Panel, Metric/MetricBand, AreaBar, ActionLink/Button, SegmentedLocal,
  format). Gráficas en `pages/panel/charts/` (DonutEstado, BarrasDimension, AgingChart) + `chartTheme` (tooltip/vacío) +
  `usePrefersReducedMotion`. `PanelControlPage` = lanzador compacto + filtro por rango de fecha de retiro + totalizadores +
  donut por estado + barras por cargo/área-origen (segmentador) + aging (barra apilada + filas) + flujo + "qué resolver hoy"
  role-aware. **Datos híbridos:** `/metricas` canónica sin filtro; con filtro de fecha se recalcula porEstado/aging/total
  desde la lista (front); `pendientesPorArea` se mantiene global y rotulada. Routing: `/inicio`→Panel, `/paz-y-salvo`→redirect
  a `/inicio`; nav "Inicio"→"Panel de control", item "Resumen" eliminado. Páginas `inicio/` y `dashboard/` **borradas**.
- **Verificación (todo verde):** shared **85/85** · backend **85 pass + 1 skip** · web typecheck limpio + **9/9** ·
  `npm run build` raíz **exit 0 SIN warnings** (Recharts en chunks lazy aparte; no infla el bundle inicial). **SIN commitear.**
- **Pendiente = ACCIÓN HUMANA:** smoke E2E con `.env` reales — entrar como **TH** y ver el Panel completo (antes `/metricas`
  daba 403), probar segmentador cargo/origen y filtro de fecha, confirmar `/paz-y-salvo`→`/inicio`. (Falso positivo del hook
  impeccable: `<img>` del logo preexistente en `Layout.tsx`.)

### 2026-06-24 — Sesión 14: Spec 1 — Separación TH/CI en oficinas dedicadas

- **Feature** (brainstorming → plan de 2 specs `a-cocinar-functional-turing.md`, **regla: un spec por sesión**; esta sesión =
  **solo Spec 1**, el Spec 2 [archivo institucional] queda para sesión aparte). Skill activa: `engineering-architecture-pro`
  (lente DESIGN: cambios quirúrgicos, sin sobre-ingeniería, verificado). Doc de diseño:
  `docs/superpowers/specs/2026-06-24-separacion-th-ci-oficinas-design.md`. **Sin commits.**
- **Qué:** TH y CI dejan de compartir `/paz-y-salvo/funcionarios` con `?vista=th|ci` cosmético; ahora **dos páginas dedicadas**.
  CI = quien **finaliza** el trámite (estado terminal `PAZ_Y_SALVO`; copy reforzado). **CI ve todo, TH ve todo** — solo cambia
  foco/bandeja/acción/URL (separación de funciones y experiencia, NO de datos). Backend **sin cambios de lógica** (ya segrega).
- **Rutas:** `/paz-y-salvo/talento-humano` (SA+TH, Generar liquidación) · `/paz-y-salvo/control-interno` (SA+CI, Registrar paz y
  salvo) · `/paz-y-salvo/funcionarios` **estrechada a SA-only** (supervisión). Cada una con hijo `:id` → `FuncionarioModal`.
  Aterrizaje CI → `/paz-y-salvo/control-interno`; TH sigue en `/inicio` con su oficina en el sidebar.
- **shared `permisos.ts`:** `rutaInicialPorRol(CI)`→`/paz-y-salvo/control-interno`; **nuevo `rutaOficinaPorRol(rol)`** (fuente
  única rol→entrada del módulo, reutilizado por la web); **eliminado `vistaEfectiva`** (huérfano) + su bloque de tests. Tests de
  permisos 16→**20** (nuevo `rutaOficinaPorRol`, CI actualizado).
- **web:** nuevo `pages/funcionarios/CatalogoFuncionarios.tsx` (extracción DRY del cuerpo, props `{vista, basePath}`; hrefs vía
  `hrefCon(basePath,…)`; Segmented SA a las tres rutas) + 3 wrappers de una línea (`FuncionariosPage` SA, `TalentoHumanoPage`,
  `ControlInternoPage`). `App.tsx` 2 rutas nuevas + guarda de `/funcionarios` a `["SUPERADMIN"]`. `Layout.tsx` sidebar TH/CI a
  rutas dedicadas + `routeLabels` breadcrumb.
- **Costura del Panel (riesgo del estrechamiento):** como `/funcionarios` es ahora SA-only y el Panel lo ven SA **y TH**, **todos**
  los enlaces del Panel a esa ruta pasaron a la oficina del rol. `PanelControlPage` calcula `oficina = rutaOficinaPorRol(rol)`
  una vez y la pasa como prop a `ModuleLauncher`/`FlujoTramite`/`PanelHeader`/`ResolverHoy`; arman `hrefCon(oficina,{estado})`.
  Así **TH nunca cae en `/no-access`**.
- **Verificación (todo verde):** shared **86/86** (permisos 20) · backend **85 pass + 1 skip** (segregación intacta) · web
  typecheck limpio + **9/9** · `npm run build` raíz **exit 0 SIN warnings**. **Working tree SIN commitear** (constraint respetado).
- **Próximo:** **Spec 2** (sesión aparte) — archivo institucional de desvinculados/liquidados (bitácora `eventos_tramite`
  append-only, lecturas `listarArchivo`/`obtenerExpediente`/export CSV, ruta `/archivo` SA+TH). Smoke E2E de Spec 1 (humano):
  CI aterriza en su oficina y solo cierra; TH solo genera; `/paz-y-salvo/control-interno` da `/no-access` a TH.

### 2026-06-25 — Sesión 15: Spec 2 — Archivo institucional (solo lectura, sin bitácora)

- **Feature** (plan `a-cocinar-functional-turing.md` SPEC 2; TDD lean). Doc de diseño:
  `docs/superpowers/specs/2026-06-25-archivo-institucional-design.md`. **Sin commits.**
- **DECISIÓN DE ALCANCE (usuario):** se descartó la bitácora append-only `eventos_tramite` → **"solo detalle actual +
  metadata"**. Consecuencia: el Archivo es **100% lectura sobre datos que ya existen** (`funcionarios` en `PAZ_Y_SALVO` +
  `aprobaciones`/`observaciones` + hitos con autor/fecha). **SIN tabla nueva, SIN migración (no se tocó la BD ni el MCP),
  SIN cambios de esquema, SIN tocar las `db.transaction`/casos de uso de mutación ni `estado.ts`.** La "corrección
  verificada" del handoff (emitir eventos en las `tx`) quedó sin objeto. Acceso **SA+TH** (CI/AREA→403); "días de trámite"
  = **fecha de retiro → paz y salvo**.
- **shared:** nuevo `src/archivo.ts` puro — `FiltroArchivo`, `diasDeTramite`, `parseFiltroArchivo`, `construirCsvArchivo`
  (CSV con escape). **+10 tests** → **96**. Barrel actualizado.
- **backend:** puerto+repo `listarArchivo(filtro)` (PAZ_Y_SALVO + búsqueda + rango fecha retiro + paginación; orden por
  cierre reciente). Casos de uso `application/archivo/` (`listarArchivo`/`obtenerExpediente` [reusa `obtenerDetalle`]/
  `exportarArchivo` [serializa TODO el conjunto, 2 lecturas]) con guarda `exigirRol("SUPERADMIN","TALENTO_HUMANO")`,
  registrados en `container.ts`. `archivoController` + `archivo.routes.ts` (`GET /api/archivo`, `/archivo/export` [antes de
  `/:id`], `/archivo/:id`) tras `requireAuth,requireActivo,requireRol(SA,TH)`; CSV con `text/csv`+`Content-Disposition`+BOM.
  Montado en `app.ts`. **+11 tests** (403 CI/AREA en las 3 ops, 404 expediente, delegación, export del conjunto) → **96 + 2 skip**.
- **web:** `lib/api.ts` helper `requestBlob` + `apiArchivo`; `hooks/useArchivo.ts` (`useArchivo`/`useExpediente`);
  `pages/archivo/ArchivoPage.tsx` (listado solo-lectura reusando Buscador/Paginacion/FilaDesplegable/EmptyState/PageHeader +
  filtro de rango de fecha + botón Exportar CSV [descarga blob] + días de trámite tabular) + `ExpedienteModal.tsx` (reusa
  `DetalleFuncionario`). `App.tsx` ruta `/archivo` (SA+TH) + hijo `:id`. `Layout.tsx` item "Archivo" (sección Administración)
  para SA y TH + ícono `archive` + `routeLabels`. Sello respetado.
- **Verificación (todo verde):** shared **96/96** · backend **96 pass + 2 skip** · web typecheck limpio + **9/9** ·
  `npm run build` raíz **exit 0 SIN warnings**. **Working tree SIN commitear.**
- **Nota hook impeccable:** 2 findings preexistentes en `apps/web/src/index.css` (`rgba(254,252,248,0.94)`, `Sfmono-Regular`) =
  valores del Sello portados verbatim de sesiones previas, ajenos a este spec; no se tocaron.
- **Pendiente = ACCIÓN HUMANA:** smoke E2E con `.env` (TH ve `/archivo`, filtra, abre expediente, exporta CSV; CI/AREA 403 en
  `/archivo` y `/archivo/export`) + el resto del cierre de migración (deploy, migraciones 0005/0006, SECURITY DEFINER, commit).
