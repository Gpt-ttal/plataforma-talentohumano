# Sistema Paz y Salvo — Cerebro del Repositorio

> **Instrucción para Claude:** Este archivo es la fuente única de verdad del proyecto y el índice de
> todo el sistema documental. Léelo completo al inicio de cada sesión (~400 líneas, no 3000). El
> detalle vive en `docs/` — enlazado desde aquí. Al cerrar cada sesión exitosa, actualiza el histórico
> en `docs/historico/` (ver §8). **Nunca commitear sin que el usuario lo pida explícitamente.**
>
> **Trabajo en cooperación con CODEX:** existe un segundo agente (CODEX) que también opera este repo.
> Lee [`docs/historico/BITACORA-IA.md`](docs/historico/BITACORA-IA.md) al arrancar para saber qué tocó,
> y agrega tu entrada al cerrar. El protocolo está en [`AGENTS.md`](AGENTS.md) § 3.

---

## Mapa del sistema documental

| Necesitas… | Archivo |
|---|---|
| Reglas de trabajo, estado actual, cómo cerrar sesión | **este archivo** (`CLAUDE.md`) |
| **Qué documento actualizar/limpiar al cerrar** (matriz de decisión) | [`docs/GUIA-DOCUMENTACION.md`](docs/GUIA-DOCUMENTACION.md) |
| Punto de entrada, quickstart, comandos | [`README.md`](README.md) |
| Instrucciones para CODEX + protocolo de cooperación IA | [`AGENTS.md`](AGENTS.md) |
| Producto: misión, roles, personalidad de marca | [`PRODUCT.md`](PRODUCT.md) |
| Sistema visual: tokens crudos (formato Stitch, skill impeccable) | [`DESIGN.md`](DESIGN.md) |
| Arquitectura técnica: stack, mapa de archivos, patrones | [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) |
| **Por qué** de cada decisión de arquitectura | [`docs/architecture/adr/`](docs/architecture/adr/) |
| Dominio: roles, flujo de estados, tipos clave | [`docs/domain/DOMINIO.md`](docs/domain/DOMINIO.md) |
| Esquema real de la BD, tabla por tabla | [`docs/data/DICCIONARIO-DATOS.md`](docs/data/DICCIONARIO-DATOS.md) |
| Estado actual por feature (qué es verdad hoy) | [`docs/historico/PROGRESO.md`](docs/historico/PROGRESO.md) |
| Historial completo de sesiones (append-only) | [`docs/historico/LOG-DE-SESIONES.md`](docs/historico/LOG-DE-SESIONES.md) |
| Bitácora cruzada Claude ↔ CODEX | [`docs/historico/BITACORA-IA.md`](docs/historico/BITACORA-IA.md) |
| Specs de diseño de features grandes | [`docs/superpowers/specs/`](docs/superpowers/specs/) |

---

## 1. Identidad y Origen

**Sistema Paz y Salvo v2** — Herramienta interna de la **Corporación Universitaria Americana**
que digitaliza el trámite de paz y salvo cuando un funcionario se retira de la institución. Ha
crecido hasta ser una **plataforma de Talento Humano** con módulos adicionales (Capacitaciones,
Cursos, Planificador, Administración de Personal / Hoja de Vida 360°, Gestión de Desvinculaciones,
Vacantes).

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

## 3. Dominio y Reglas de Negocio

> Detalle completo (tipos, invariantes, ciclos de vida): [`docs/domain/DOMINIO.md`](docs/domain/DOMINIO.md).
> Tipos fuente: [`shared/src/domain.ts`](shared/src/domain.ts).

**Roles:** `SUPERADMIN` (todo) · `TALENTO_HUMANO` (supervisión + cierre oficial) · `CONTROL_INTERNO`
(genera liquidación, puede devolver áreas) · `AREA` (cola de su dependencia) · `SST` (Formación de
ámbito SST).

**Flujo del paz y salvo:** `PENDIENTE → LISTO_PARA_LIQUIDAR → LIQUIDACION_GENERADA → PAZ_Y_SALVO`.
Un área `APROBADO`/`NO_APLICA` cuenta como OK; con todas las activas OK el estado sube; `NO_APROBADO`
o `DEVUELTO_POR_CI` lo devuelve. La regla vive en la máquina de estados pura `estado.ts`
([ADR-0005](docs/architecture/adr/0005-maquina-de-estados-pura.md)).

**"Una tabla, dos proyecciones":** `funcionarios` sirve `Funcionario` (trámite) y `Empleado`
(maestro), discriminados por `fecha_retiro` ([ADR-0003](docs/architecture/adr/0003-una-tabla-dos-proyecciones.md)).
"Finalizar contrato" es el puente al trámite.

---

## 4. Arquitectura Técnica

> Detalle completo (stack, comandos, mapa de archivos, patrones, flujo de request):
> [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md). Decisiones:
> [`docs/architecture/adr/`](docs/architecture/adr/).

Monorepo npm workspaces: **`shared`** (`@pys/shared`, dominio puro) · **`apps/backend`** (`@pys/api`,
Express hexagonal) · **`apps/web`** (`@pys/web`, Vite+React+TanStack Query). TypeScript strict en las
3 capas. Persistencia Supabase (PostgreSQL) + Drizzle + `pg`. Auth híbrida: login Google (Supabase
Auth) en el frontend, el backend valida el JWT con `jose` y **centraliza toda la autorización**
([ADR-0002](docs/architecture/adr/0002-autorizacion-centralizada-backend.md)). Deploy en Vercel.

**Arranque de sesión** (crítico — `shared` exporta `dist/`, no `src/`):
```bash
npm run build --workspace=shared    # SIEMPRE primero
npm run dev                         # backend :3000 (OAuth atado) + frontend :5173
```

**Gate de cierre:** `build shared` → tests de los 3 workspaces → `tsc --noEmit` backend y web →
`npm run build` raíz, todo en verde. (Comandos completos en el README / ARCHITECTURE.)

---

## 5. Sistema Visual — "El Sello Institucional"

**North Star:** Papelería oficial de universidad seria. Chasis navy que carga toda la
estructura; oro que casi nunca aparece — porque cuando aparece, *significa* algo. (Tokens crudos
en [`DESIGN.md`](DESIGN.md), consumidos por la skill `impeccable`.)

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
- **Regla del Semáforo Único:** color de estado definido una vez en `shared/src/ui.ts`, pintado solo vía `EstadoPill`.
- **Regla de la Serif Reservada:** `.font-display` (Hoefler/Palatino) solo para wordmark y titulares, nunca en labels/botones/datos.
- **Regla Tabular:** números comparables en columna usan `font-variant-numeric: tabular-nums`.
- **Regla Hairline-Primero:** separación por defecto = línea `silver-300`, no sombra; sombra solo para elevación real.

### Bans absolutos de diseño

- Eyebrows de sección sobre pantallas.
- `text-gold-foil` / `background-clip: text` con gradiente.
- Filete lateral de color (`border-left` > 1px) en filas o callouts.
- Texto de interfaz en `silver-400/500` (usar `silver-600` mínimo para AA).
- Serif en botones, labels o datos.

### Componentes clave

- `EstadoPill` — pastilla punto+etiqueta, colores desde `shared/src/ui.ts`.
- `Avatar` — disco navy-50 con iniciales + anillo oro.
- `FilaDesplegable` — acordeón, `shadow-luxe` → `shadow-luxe-lg` en hover.
- `Segmented` — toggle de vista, server-driven por searchParams.
- `ChipFiltro`, `Buscador`, `Paginacion` — server-driven por searchParams.
- `GestionUsuario`, `AccionesArea` — acciones con confirmación inline (sin modal).

### Accesibilidad

Objetivo WCAG 2.1 AA. Contraste texto ≥ 4.5:1, foco visible (anillo oro), teclado de extremo a
extremo, `prefers-reduced-motion` en toda animación, pills con punto+texto (nunca solo color),
es-CO para fechas/números. Theming claro/oscuro por tokens CSS semánticos.

---

## 6. Infraestructura (Supabase)

- **Project ref:** `vwcnqrdicjarkorqdrue`
- **URL:** `https://vwcnqrdicjarkorqdrue.supabase.co`
- **Región:** us-east-1 · PostgreSQL 17.6 · Org: `dnuwchusxvvbsujjxnxs`
- **Secretos:** viven solo en `.env.local` (gitignored) y `~/.claude.json`. NUNCA en código ni memoria.

### Estado de la BD

Migraciones `0001`–`0018`, `0020` y `0021` **aplicadas a producción**, en orden. La
`0019_sync_personal.sql` (módulo Sync de Personal) está **escrita y espejada en Drizzle, pero NO
aplicada a prod** — pendiente de autorización (se aplicó `0020`/`0021` primero porque no dependen de
`0019`). La `0021_vacante_areas.sql` repunta `vacantes.area_id` al catálogo propio `vacante_areas`
(≠ `areas`, que es el de paz y salvo). El esquema real vive en
`supabase/migrations/*.sql` (fuente de verdad) y su espejo Drizzle en
`apps/backend/src/infrastructure/db/schema.ts`. Detalle tabla por tabla:
[`docs/data/DICCIONARIO-DATOS.md`](docs/data/DICCIONARIO-DATOS.md).

**Patrón de seguridad:** RLS "deny-directo" por defecto en tablas nuevas
([ADR-0006](docs/architecture/adr/0006-rls-deny-directo-por-defecto.md)); funciones `SECURITY DEFINER`
con `REVOKE EXECUTE` a `anon`/`authenticated`. Advisors limpios salvo los `rls_enabled_no_policy`
INFO esperados + el WARN moot de leaked-password (auth es OAuth, sin passwords).

**Aplicar una migración a prod requiere autorización explícita del usuario, por-migración**
(nombrando el archivo). Verificar `list_migrations` antes/después y re-correr advisors.

### OAuth Google

- Provider Google activado en Supabase. Proyecto GCP: `api-talento-humano`.
- Redirect URI: `https://vwcnqrdicjarkorqdrue.supabase.co/auth/v1/callback`.
- **Dev server DEBE correr en :3000** (OAuth atado a ese puerto; matar procesos viejos).

### MCP Supabase

```
Scope: local, read-write, --project-ref=vwcnqrdicjarkorqdrue
Comando: cmd /c npx -y @supabase/mcp-server-supabase@latest --project-ref=...
```
*(El `cmd /c` es obligatorio desde PowerShell; Git Bash convierte `/c` → `C:/` y rompe la conexión.)*

---

## 7. Arquitectura de Plataforma

> Detalle y trade-offs: ADRs [0007](docs/architecture/adr/0007-plataforma-modulos-declarativos.md)
> (módulos) y [0008](docs/architecture/adr/0008-concurrencia-optimista-lock-condicional.md)
> (concurrencia) + spec `docs/superpowers/specs/2026-06-30-plataforma-multi-modulo-concurrencia-design.md`.

- **Registro declarativo de módulos:** `shared/src/modulos.ts` (`MODULOS`, `modulosParaRol`) es la
  fuente única de qué módulos existen y quién los ve. Sidebar y lanzador lo consumen; nunca hardcodean.
- **Roles plataforma vs. acotados:** `rolVePlataforma()` → SA y TH ven `/inicio`; CI/AREA/SST entran
  directo a su trabajo (`rutaInicialPorRol`).
- **Sincronía en vivo (Supabase Realtime):** un canal por sesión → `queryClient.invalidateQueries`.
  WebSocket directo browser↔Supabase (no pasa por Vercel); RLS filtra los eventos.
- **Concurrencia (garantizada en BD):** `SELECT ... FOR UPDATE` + recálculo atómico
  (`recomputarEstado.ts`); hitos TH→CI con UPDATE condicional `WHERE estado_global=esperado RETURNING`.
  **No tocar estas transacciones sin TDD previo.**

---

## 8. Reglas de Trabajo (para Claude y CODEX)

### Constraints duros

- **NUNCA commitear ni hacer push** sin que el usuario lo pida explícitamente. Cero acciones git salvo
  instrucción directa.
- **NUNCA aplicar migraciones a producción** sin autorización explícita, por-migración (ver §6).
- **Toda comunicación en español** (es-CO), incluyendo traducir la salida de subagentes.

### TDD y calidad

- Escribir tests antes de implementación para lógica de dominio/permisos/repo.
- **`shared/src/estado.ts` intocable sin TDD previo** (máquina de estados verificada).
- Gate de cierre en verde antes de dar una tarea por completa: `build shared` → tests ×3 →
  `tsc --noEmit` backend y web → `npm run build` raíz.
- **Política de tests lean:** consolidar tests nuevos en archivos existentes; no testear
  plomería/presentacional.

### Patrones de implementación

- `container.ts` (composition root) para todo I/O — casos de uso reciben repos inyectados.
- `requireAuth` + `requireActivo` + `requireRol(...)` en cada router protegido; `paramUuid` en rutas
  con `:id`.
- `shared/src/ui.ts` como única fuente de color por estado (Semáforo Único).
- Tailwind: clases literales — no construir nombres en runtime.
- Buildear `shared` antes de que backend/web vean cambios de dominio.

### Diseño

- Nunca romper las Reglas Nombradas (Sello, Semáforo, Serif, Tabular, Hairline) ni los bans (§5).
- Contraste WCAG 2.1 AA en todo texto real (≥ 4.5:1).

### Al final de cada sesión exitosa

**Sigue la matriz de decisión de [`docs/GUIA-DOCUMENTACION.md`](docs/GUIA-DOCUMENTACION.md)** — dice
qué documento tocar **y qué limpiar** según lo que hizo la sesión, sin re-introducir deriva ni
duplicación. En síntesis (todo en un solo batch al cierre, ver [[feedback-memoria-solo-al-cierre]]):

1. Verificar gates: tests verdes, `tsc` limpio, `build` OK.
2. Recorrer la matriz de la guía: **siempre** entrada al final de
   [`LOG-DE-SESIONES.md`](docs/historico/LOG-DE-SESIONES.md) + entrada corta en
   [`BITACORA-IA.md`](docs/historico/BITACORA-IA.md) (para CODEX). Lo demás (PROGRESO, diccionario,
   DOMINIO, ADR nuevo, ARCHITECTURE, memoria) **solo si su disparador ocurrió**.
3. Aplicar las reglas anti-deriva: no duplicar, no dejar afirmaciones falsas, **nunca meter narrativa
   de sesión en CLAUDE.md** (es índice + reglas estables + punteros).
4. Ofrecer commit (pero no hacerlo sin instrucción).

---

## 9. Estado actual e histórico

- **Estado por feature (qué es verdad hoy):** [`docs/historico/PROGRESO.md`](docs/historico/PROGRESO.md).
- **Historial completo sesión por sesión:** [`docs/historico/LOG-DE-SESIONES.md`](docs/historico/LOG-DE-SESIONES.md).

**Resumen en 3 líneas:** producto maduro en producción (migraciones `0001`–`0018`, `0020` y `0021`
aplicadas). Módulo **Vacantes** completo (backend + UI enrutada) y **acoplado a Personal**: contratar
una vacante crea el funcionario en la misma transacción ([ADR-0009](docs/architecture/adr/0009-puente-vacante-funcionario.md)).
En curso el **Sync de Personal desde Iceberg** (`sync-personal`, Fases 1-3/7: dominio + migración
`0019` no-aplicada + aplicación con TDD, verde). Pendientes vivos = Fases 4-7 del sync, auto-inscripción
en inducción (backlog), smoke tests manuales (Desvinculaciones, Cursos/Planificador) y limpieza de
código muerto (Sesión 47). Working tree sin commitear (constraint del proyecto).
