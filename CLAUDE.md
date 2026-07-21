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
type RolUsuario = "SUPERADMIN" | "TALENTO_HUMANO" | "CONTROL_INTERNO" | "AREA" | "SST"

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
| `0004`/`0005`/`0006` | RLS+políticas SELECT, REVOKE SECURITY DEFINER, índices (aplicadas Sesión 16) |
| `0007_rol_sst.sql` | Valor de enum `rol_usuario` = `SST` (aplicada Sesión 23) |
| `0008_capacitaciones.sql` | Enums `ambito_capacitacion`/`estado_registro_capacitacion`/`tipo_vinculo` + tablas `capacitaciones`/`asistencias` (`UNIQUE(capacitacion_id, documento)`, RLS sin políticas = deny-directo) — aplicada Sesión 23 |
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

> ✅ **MODULARIZACIÓN DE GOD OBJECTS (backend + web) — COMPLETA (Sesión 50, plan
> `iterative-tumbling-grove.md`, 11 fases).** Dos archivos habían crecido por acumulación de
> sesiones sucesivas hasta volverse difíciles de navegar/testear: `funcionarioRepository.ts`
> (1327 líneas / 29 métodos, sirviendo 3 contextos acotados nacidos en sesiones distintas —
> trámite de Paz y Salvo, maestro de empleados, Hoja de Vida 360°) y
> `BloquesEditables.tsx` (1080 líneas / 7 componentes React / 55 `useState`, los editores del
> expediente 360°). Objetivo explícito del usuario: **cero cambio de comportamiento, cero
> regresión de tests, diseño de nivel senior — no un "corta y pega por conteo de líneas"**.
> **Diseño:** el puerto único `FuncionarioRepo` (interfaz) NO se fragmentó — se preservó como
> único contrato; el objeto que lo implementa ahora se ensambla por `Object.assign`/spread desde
> 3 módulos internos (`tramiteRepo.ts` 12 métodos, `empleadoRepo.ts` 6 métodos, `expedienteRepo.ts`
> 12 métodos + 9 helpers, más `mappers.compartidos.ts` para los 2 mappers compartidos), cada uno
> tipado contra un subconjunto vía `Pick<FuncionarioRepo, "método1" | ...>`. `funcionarioRepository.ts`
> quedó como **barrel puro de 12 líneas** (solo imports + spread + re-export) — mismo path de
> import, mismo shape exportado, **`container.ts` (composition root, 29 inyecciones de casos de
> uso) no se tocó ni una línea**. El único riesgo técnico real del plan (2 métodos del bloque
> trámite se llamaban entre sí vía `this.X(...)`, imposible de preservar si se fragmentaba el
> objeto) se resolvió declarando las 12 funciones de `tramiteRepo.ts` como `async function`
> nombradas de nivel superior que se llaman directo por nombre, ensambladas al final en el objeto
> exportado por shorthand — sin ambigüedad de `this`, sin cambio de firma/orden de argumentos.
> En el lado web, `BloquesEditables.tsx` se dividió en una carpeta `bloques-editables/` con
> `compartido.tsx` (7 helpers/JSX compartidos: `inputCls`/`labelCls`/`labelTextCls`/`mensajeError`/
> `BotonAbrir`/`FilaGuardarCancelar`/`FilaEliminable`) + un archivo por editor (3 editores 1-1:
> Personales/Contractual/Salarial; 3 editores 1-N: Familia/Formación/Experiencia — **deliberadamente
> NO unificados/genericizados**, quedó documentado como mejora futura opcional fuera de este plan;
> `FotoEditor` con su inconsistencia preexistente de manejo de errores conservada tal cual, sin
> "corregir" comportamiento durante una modularización) + barrel `index.ts`. `ExpedientePage.tsx`
> cambió una sola línea de import; el monolito se **borró** tras confirmar cero imports
> remanentes. **Contenido copiado verbatim en ambos lados — cero tests nuevos** (el propio plan lo
> especifica: solo si algo se rompe inesperadamente, y nada se rompió). **Verificación final
> (todo verde, re-corrida completa tras la Fase 9):** shared build OK + **246/246** · `tsc --noEmit`
> backend limpio · backend **319 pass + 11 skip** (sin regresión) · web typecheck limpio +
> **11/11** · `npm run build` raíz **exit 0 SIN warnings** (bundle sin regresión: `index` 335 KB,
> `LeccionForm`/Tiptap sigue diferido en 412 KB). **Working tree SIN commitear.** No se tocó
> `estado.ts`, `recomputarEstado.ts`, ninguna migración, ni las rutas/página de Control Interno.
> **Pendiente = ACCIÓN HUMANA:** smoke manual del expediente `/personal/:id` — abrir un empleado
> real, confirmar que los 7 bloques renderizan igual que antes, probar un ciclo completo
> editar→guardar/cancelar en al menos un editor 1-1 (`PersonalesEditor`) y uno 1-N
> (`FamiliaEditor`). **Próxima sesión:** sin checklist pendiente de este plan — trabajo nuevo, o
> el mandato de limpieza de código muerto que sigue abierto desde la Sesión 47.

> ✅ **CONSOLIDACIÓN DE VISTAS + POTENCIACIÓN "AVANCE POR ÁREA" — COMPLETA (Sesiones 48-49).** El
> usuario detectó redundancia real entre 3 vistas (catálogo Funcionarios SA, oficina Talento
> Humano, Matriz de Avance) y dio contexto de negocio: TH ahora **valida que todas las áreas dieron
> visto bueno antes de pasar el caso a Control Interno para liquidar** — un rol de supervisión/
> seguimiento, no de aprobación directa. **Parte 1 (redundancia, Sesión 48):** se eliminaron
> `FuncionariosPage.tsx`/`TalentoHumanoPage.tsx` y sus rutas; `rutaOficinaPorRol` (shared) manda a
> SA y TH a `/paz-y-salvo/avance` (la Matriz es su oficina); `MatrizPage` ganó ruta hija `:id`+
> `<Outlet/>`; `CatalogoFuncionarios.tsx` (ahora solo Control Interno) perdió el toggle de vista sin
> destinos válidos; `Layout.tsx` perdió los ítems "Funcionarios"/"Talento Humano"; `MiAreaPage.tsx`
> corrigió su enlace hardcodeado a la ruta borrada. Control Interno **no se tocó**.
> **Parte 2 (potenciar la Matriz, Sesión 49) — plan `C:\Users\Leonardo\.claude\plans\
> lazy-wibbling-sifakis.md` EJECUTADO ÍNTEGRO.** Diseñado en la Sesión 48 vía `superpowers:
> brainstorming` con compañero visual (mockups A/B/C) + investigación web (Stripe, Linear, Pencil &
> Paper) para evitar un look genérico; dirección aprobada **"C · Híbrido de precisión"**.
> **Pilar 1 (backend):** `FiltroFuncionarios.areaBloqueante?: string` (shared `domain.ts`+
> `schemas.ts`, uuid opcional) + subconsulta `EXISTS` nueva en `listarFuncionariosPaginado`
> (`funcionarioRepository.ts`, cubre `PENDIENTE`/`NO_APROBADO`/`DEVUELTO_POR_CI` en un solo
> parámetro) — sin migración, sin endpoint nuevo, `listarMatrizPaginado` lo hereda gratis por
> delegación. Test de delegación nuevo en `lecturasCatalogo.test.ts` (archivo existente, política
> lean). **Pilar 2 (datos frontend):** cero hooks nuevos — la cinta de cuellos de botella reusa
> `useMetricas().pendientesPorArea` (ya existía, ya scopeado a áreas activas) y la bandeja de
> traspaso reusa `useFuncionarios({estado:"LISTO_PARA_LIQUIDAR", porPagina:5})` tal cual; ambos
> gated a `esSuperadmin||esTalentoHumano` para que CI nunca los dispare (mismo alcance que la
> guarda real de `/metricas`). **Pilar 3 (rediseño visual):** `AvanceHero.tsx` nuevo — cabecera
> `bg-navy-deep` con la cinta de KPIs fundida debajo (no cards sueltas), cada ítem un `Link`
> clickeable que filtra (línea dorada bajo el activo); `BandejaTraspaso` nueva (hasta 5 `Avatar`+
> nombre+fecha, "Ver los N →" apunta al mismo href que el KPI de la cinta — sin lógica duplicada);
> toolbar con chip removible de `areaBloqueante` (tokens `estado-rechazoBg`/`estado-rechazo`, ya
> existentes — Semáforo Único respetado); columna de la tabla resaltada cuando coincide con el área
> bloqueante activa; afordance "Ver ficha →" revelado al hover/focus en cada fila (siempre visible
> en touch vía `[@media(hover:none)]`). Limpieza menor incluida: el botón del Panel que decía
> "Funcionarios" ahora dice "Avance por área" (`PanelControlPage.tsx`). **`estado.ts`/
> `recomputarEstado.ts`/transacciones de concurrencia/rutas de Control Interno: sin tocar.**
> Verificado todo verde: shared **246/246** · backend `tsc` limpio + **319 pass + 11 skip** · web
> typecheck limpio + **11/11** · `npm run build` raíz **exit 0 SIN warnings** (bundle sin regresión).
> **Working tree SIN commitear.** Detalle completo en §10 (Sesiones 48-49) y en la memoria
> `consolidacion-avance-area-plan.md`.

> ✅ **GESTIÓN DE DESVINCULACIONES — CÓDIGO Y MIGRACIONES COMPLETOS (13/13, Sesión 47).** Plan
> `C:\Users\Leonardo\.claude\plans\cheerful-cuddling-koala.md` cerrado íntegro. Convierte Paz y
> Salvo en "Gestión de Desvinculaciones": nuevo estado de área `DEVUELTO_POR_CI`, timestamp
> `archivadoEn`, bitácora `eventos_auditoria`, **inversión de guardas de rol** (Control Interno
> ahora valida el penúltimo hito vía `generarLiquidacion`; Talento Humano cierra oficialmente vía
> `registrarLiquidacion`), y módulo de importación masiva con previsualización + confirmación
> parcial. **Ítem 11 (backend de importación) cerrado esta sesión:** wireado `container.ts` (repo +
> 2 casos de uso), `desvinculacionesController.ts` (nuevo), `desvinculaciones.routes.ts` (nuevo,
> `multer` memoryStorage 5MB + rate-limit 10/min en `/importar`, `POST /lotes/:id/confirmar`, ambas
> tras `requireRol(SA,TH)`), montado en `app.ts` como `/api/desvinculaciones`. Tests consolidados en
> **1 archivo nuevo** `tests/desvinculaciones.test.ts` (+14: guardas 403, delegación exacta, 404/400
> de confirmar, 3 tests del parser con buffers XLSX reales vía la librería `xlsx`, sin mockear) —
> backend 304→**318 pass + 11 skip**. **Ítem 12 (frontend) cerrado esta sesión:** swap de botones
> TH/CI en `CatalogoFuncionarios.tsx`/`DetalleFuncionario.tsx` (CI ve `LISTO_PARA_LIQUIDAR`→
> `GenerarLiquidacionButton`, TH ve `LIQUIDACION_GENERADA`→`LiquidarButton`, mismos componentes
> técnicos, solo cambia qué rol/vista los muestra) + copy de `VISTA_CFG` actualizado; nuevo
> `DevolverAreaButton.tsx` (CI/SA, confirmación inline con observación obligatoria) cableado en
> `AreaList.tsx` vía prop nueva `puedeDevolver` (independiente de `puedeGestionar`, visible solo
> sobre área APROBADO/NO_APROBADO); nuevo `ArchivarButton` inline en `ArchivoPage.tsx` (visible solo
> si `archivadoEn===null`, muestra fecha de archivado si ya se archivó); módulo nuevo
> `apps/web/src/pages/desvinculaciones/` (`ImportacionPage.tsx` + `DropzoneArchivo.tsx` +
> `TablaPrevisualizacionLote.tsx` + `PillFilaLoteEstado.tsx`, ruta `/desvinculaciones/importacion`
> SA+TH) + labels/badge nuevos `FILA_LOTE_ESTADO_LABEL`/`BADGE`/`filaLoteEstadoPill` en
> `shared/src/ui.ts` (Semáforo Único); ícono `upload` nuevo en `Layout.tsx` + nav item en
> "Administracion" para SA y TH; `realtime.ts` extendido con `lotes_importacion`/`filas_lote` →
> invalida `["importacion"]`. **Ítem 13 (verificación + migraciones) cerrado esta sesión:** shared
> **246/246** · backend `tsc` limpio + **318 pass + 11 skip** · web typecheck limpio + **11/11** ·
> `npm run build` raíz **exit 0 SIN warnings** (bundle sin regresión: `index` ~333 KB). **Migraciones
> `0014`-`0017` APLICADAS a producción vía MCP** (autorización explícita del usuario por-lote antes
> de las 4, verificado `list_migrations` antes/después). El re-chequeo de advisors reveló **2
> hallazgos nuevos no previstos por el plan original**: `es_auditor` (SECURITY DEFINER de `0016`)
> ejecutable por `anon`/`authenticated`, y el trigger `fn_archivado_en_requiere_paz_y_salvo` (`0015`)
> sin `search_path` fijo — ambos cerrados con una **migración `0018_endurecer_funciones_
> desvinculaciones.sql` nueva** (autorizada explícitamente aparte), mismo patrón ya probado en
> producción desde `0005_revoke_security_definer.sql`. **Advisors finales limpios**: solo los 10
> `rls_enabled_no_policy` INFO esperados (deny-directo, patrón intencional del proyecto) + el WARN
> moot de leaked-password de siempre. **Working tree SIN commitear** (constraint respetado; la BD de
> prod sí quedó modificada con autorización explícita en cada paso). **Mandato pendiente del
> usuario, para la próxima sesión que se retome este tema**: limpieza estricta de código
> muerto/obsoleto/legacy tras el cierre del circuito completo, incluyendo archivos de test que ya no
> se vayan a usar — preferencia explícita por tests consolidados sobre uno-por-caso (no ejecutada
> todavía; es un ítem adicional posterior al plan de 13, no se hizo de oficio esta sesión). Detalle
> completo por ítem en la memoria `gestion-desvinculaciones-plan.md` y en §10 (Sesiones 45-47).
> **Pendiente = ACCIÓN HUMANA:** smoke test manual del circuito completo — CI ve/valida
> `LISTO_PARA_LIQUIDAR` en su oficina, TH cierra `LIQUIDACION_GENERADA`, CI devuelve un área
> resuelta con observación y el estado se distingue de un rechazo, TH archiva un trámite cerrado
> desde `/archivo`, subir un Excel de prueba en `/desvinculaciones/importacion` → previsualizar →
> confirmar parcialmente → verificar que las filas descartadas no crean funcionarios.

> ✅ **REMEDIACIÓN DE AUDITORÍA (idempotencia/doble-submit/caché/fallos silenciosos) — COMPLETA
> (Sesión 44).** Plan `C:\Users\Leonardo\.claude\plans\dise-a-un-plan-completo-luminous-hare.md`
> (22 hallazgos: 1 CRÍTICO + 8 IMPORTANTE + 13 MENOR, 17 tareas) **17/17 completas.** Fases 1+2
> completas desde la Sesión 43 (lock `FOR UPDATE` en Cursos, idempotencia `crearArea`, lock en
> `registrarNovedad`, catch real+logger en `requireAuth`, `notificar` muerto eliminado, `pino`
> cableado, invalidación de caché `"personal"`, Realtime extendido a Cursos/Planificador/Personal
> 360°, callback de estado + toast en `.subscribe()`) + 3/10 de la Fase 3 (23505→400 en
> `crearEmpleado`, idempotencia en Cursos/Planificador, `cambiarEstadoRegistro` atómico). **Sesión
> 44 cerró las 4 tareas restantes (3.5-3.8), todas presentacionales en `apps/web`, sin tests
> nuevos** (política lean): `useAreas.ts` invalida también `["funcionario"]` · botón "Exportar
> asistencias" con `disabled`+label dinámico durante la descarga (mismo patrón que
> `ExportarCsvButton` de Archivo) · auto-reingreso de `TomarCursoPage` muestra `toast.error` en vez
> de fallar en silencio · "copiar enlace" con `toast.success`/`toast.error` en `CapacitacionModal`
> y `CursoDetallePage`. **Verificación final completa de las 3 fases juntas, todo verde:** shared
> build OK + **240/240** · backend `tsc` limpio + **290 pass + 11 skip** (sin regresión) · web
> typecheck limpio + **10/10** · `npm run build` raíz **exit 0 SIN warnings**. **Working tree SIN
> commitear, sin migraciones a producción** (el plan no las requería — todo el cambio fue
> aplicativo o de frontend). 3.9/3.10 quedan aceptados como riesgo residual documentado (decisión
> ya tomada en el propio plan, no requieren código).

> ✅ **IMPECCABLE ACTUALIZADO + P1 DE LA CRÍTICA DE FORMACIÓN IMPLEMENTADOS (Sesión 42).**
> `PRODUCT.md`/`DESIGN.md` refrescados contra el código real (theming claro/oscuro, tokens
> semánticos, `rounded-md/lg` en vez de `rounded-full`, 6 dominios de `estado*Pill()`). Crítica
> formal (`/impeccable critique`) sobre las 3 páginas de listado de la sección Formación
> (Eventos/Cursos/Planificador, reportadas por el usuario como "genéricas, pobres, planas") —
> score 26/40, snapshot en `.impeccable/critique/`. **2 P1 implementados y verificados:** ícono de
> dominio por fila (`calendar`/`book`/`grad-cap`) reemplaza el monograma de 2 letras del ámbito;
> dato "hero" visible sin entrar al detalle (bloque de fecha en Eventos, conteo real de inscritos
> en Cursos vía nuevo campo `Curso.totalInscritos` con query agrupada sin N+1, bloque mes/año en
> Planificador). **2 P2 documentados como spec pendiente, sin implementar:**
> `docs/superpowers/specs/2026-07-07-formacion-consistencia-visual-design.md` (migrar filtros a
> `ChipFiltro` compartido; señal visual de que Cursos navega mientras Eventos/Planificador
> expanden in-place). Verificado: shared 240/240 · backend 290+2 skip · web 10/10 · build raíz exit
> 0 sin warnings. Working tree SIN commitear.

> ✅ **CURSOS & PLANIFICADOR — CÓDIGO COMPLETO Y VERIFICADO (Sesiones 34–38). Fases 0–10 de 11
> hechas: TODO EL BACKEND + TODO EL FRONTEND + navegación wireada. Migraciones `0012`/`0013`
> **APLICADAS a prod en la Sesión 40** (vía C1 de la remediación de la auditoría) — solo falta el
> smoke test manual de 11 pasos.** **Fase 9 (navegación, Sesión 38):** `Layout.tsx` (union local `IconName`
> +`book`/`calendar` de `dash/Icon.tsx`; el bloque `formacion` es byte-idéntico en SA/TH/SST → un
> `Edit replace_all` renombró "Capacitaciones"→"Eventos" y añadió los 2 NavItem `/cursos`+
> `/planificador` en las 3 ramas; `routeLabels` +2) + `App.tsx` (ruta pública `/tomar-curso/:token`
> fuera de Layout; `/cursos`, `/cursos/:id` [hermana top-level, sin Outlet] y `/planificador`
> protegidas SA/TH/SST; `modulos.ts` intacto). **2 mejoras de criterio propio** (usuario pidió "ten
> criterio propio"): (a) breadcrumb `routeLabels` de `/capacitaciones` también → "Eventos" (sidebar
> y cabecera coinciden); (b) **`React.lazy`** en las 4 páginas nuevas + `<Lazy>`/`Suspense` — el
> cableado había metido Tiptap al chunk inicial (`index` 803 KB, warning >500 KB reaparecido) → tras
> el fix `index` 803→**317 KB** y Tiptap queda diferido en chunk `LeccionForm` 412 KB (solo baja al
> abrir el editor); **warning eliminado**, ataca la raíz y sigue el precedente Fase 8.3.
> **Fase 10 (verificación, Sesión 38):** shared build OK · web typecheck limpio · web **10/10** ·
> backend **269 pass + 2 skip** · `npm run build` raíz **exit 0 SIN warnings**. Working tree SIN
> commitear. Plan (submódulos hermanos de Capacitaciones para la demo de
> socialización del 2026-07-07 ante Talento Humano): `C:\Users\Leonardo\.claude\plans\delegated-baking-corbato.md`.
> Ejecutado vía `subagent-driven-development` (un implementer fresco por pieza + revisión directa del
> controlador antes de cerrar cada una, incl. re-corrida independiente de los comandos de
> verificación — no solo confiar en el reporte del implementador). **Fase 0** (dominio
> `shared/src/cursos.ts`+`planificador.ts`+schemas+labels) ya estaba commiteada (`bf35127`) de la
> sesión de arranque. **Fase 1** (migraciones `0012_cursos.sql`/`0013_planificador.sql` + espejo
> Drizzle), **Fase 2** (backend de gestión autenticada de Cursos, 15 casos de uso, +23 tests),
> **Fase 3** (flujo público "tomar el curso por cédula" — helper `construirResultadoIngreso` del
> diseño "un solo viaje", +4 tests) y **Fase 4** (backend del Planificador — CRUD plano sin
> `db.transaction`, patrón "cargar → guardar", +19 tests) completan el **backend** (Sesiones
> 34–35): shared build OK · tsc backend limpio · **269 pass + 2 skip**.
>
> **Fase 5 (Sesión 36, cliente de datos del frontend):** `apiCursos`/`apiCursosPublico`/
> `apiPlanificador` en `apps/web/src/lib/api.ts` (mirror de `apiCapacitaciones`/`apiRegistro`) +
> hooks `useCursos.ts` (con `useInscritosCurso` a `refetchInterval:5000` — el mecanismo de
> "progreso en vivo")/`useTomarCurso.ts`/`usePlanificador.ts`. Transcripción mecánica, sin
> ambigüedades, sin tests nuevos (política lean).
>
> **Fase 6 (Sesión 36, UI de gestión de Cursos — la fase de mayor riesgo del plan):** dividida en
> 3 piezas por el controlador (6a+6b en paralelo, 6c después porque depende de 6b). **6a:**
> `npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline` (única
> dependencia nueva del plan; la extensión de subrayado se sumó porque la toolbar la necesita y
> el backend ya sanitiza `<u>`) + `CursosPage.tsx` (listado, filas `Link` directo a `/cursos/:id`,
> sin modal). **6b:** `LeccionForm.tsx` — único componente Tiptap del proyecto, formulario puro
> (negrita/cursiva/subrayado/H2/H3/listas/cita para TEXTO, input URL para VIDEO), exporta
> `PROSE_LECCION_CLS` para que la Fase 7 renderice el mismo HTML guardado con la misma
> tipografía. Tiptap resolvió como **v3.27.1** (no v2 como asumía el plan) sin necesitar ajustes
> de API. **6c:** `CursoDetallePage.tsx` — página dedicada `/cursos/:id` (precedente:
> `ExpedientePage.tsx` de Personal): cabecera con Abrir/Cerrar registro + QR + copiar enlace,
> `Segmented` Contenido/Inscritos, editor anidado módulos→lecciones (crear/renombrar/reordenar/
> eliminar con confirmación inline, delega en `LeccionForm` para crear/editar lecciones), panel
> de inscritos en vivo (`InscritosTab`, reusa el `refetchInterval` de Fase 5). Las 3 piezas sin
> tests nuevos (presentacional, política lean) y **verificadas línea por línea contra sus briefs
> por el controlador**, no solo por los reportes de los implementers.
>
> **Estado verificado (Fases 5+6, re-corrido independientemente al cierre):** shared build OK ·
> `tsc --noEmit` de `apps/web` limpio · **10/10** tests, sin regresión. **Working tree SIN
> commitear** desde la Fase 1. **Ninguna migración aplicada a Supabase** — la autorización para
> `0012`/`0013` se pide explícitamente al usuario recién al final del plan, antes del smoke test
> de la Fase 10 (decisión ya confirmada con él). **Todos los briefs/reportes de fase (0-6, incl.
> 6a/6b/6c) quedaron persistidos en `.superpowers/sdd/cursos-planificador/`** (raíz del repo,
> gitignored pero NO efímero). Detalle completo en §10 (Sesiones 34–37) y en la memoria
> `cursos-planificador-plan.md`.
>
> **Fase 7 (Sesión 37, UI pública "tomar curso"):** `pages/tomar-curso/TomarCursoPage.tsx` +
> `FormularioCedula.tsx` — mirror estructural de `RegistroAsistenciaPage.tsx`; máquina de estados
> cargando/reanudando → error → BORRADOR → preview+cédula → `VistaContenido` (barra de progreso
> que pasa a `estado-ok` al 100% + banner "Curso completado", módulos `FilaDesplegable`, TEXTO
> renderizado con `PROSE_LECCION_CLS` vía `dangerouslySetInnerHTML` [HTML ya sanitizado
> server-side], VIDEO como enlace externo). Reanudación sin login vía sessionStorage
> `curso:${token}:ingreso` con `{nombre, documento}` (el schema `.strict()` exige nombre;
> inocuo: `onConflictDoNothing`, gana el primer nombre). Auto-reingreso llama
> `apiCursosPublico.ingresar` directo (evita duplicar el useMutation del hook).
>
> **Fase 8 (Sesión 37, UI del Planificador):** `pages/planificador/PlanificadorPage.tsx`
> (URL-driven `vista=lista|calendario` + q/estado/ambito/anio/mes/pagina; form "Nueva planeación"
> colapsable con ámbito gated por `ambitosVisibles`; filas planas con pill vía
> `estadoCapacitacionPlaneadaPill` + "Mes Año · T{trimestre}" tabular; avance de estado
> PLANEADA→Iniciar→EN_CURSO→Completar→COMPLETADA vía PATCH; eliminar con confirmación inline) +
> `CalendarioPlanificador.tsx` (12 celdas mes `Link`, navegación de año ‹ ›, hasta 3 chips con
> dot de estado + "+N más", query propia `porPagina:100` = tope real del schema; exporta
> `nombreMes` con date-fns/locale es). Ambas fases vía subagent-driven-development con briefs
> grounded contra código real, revisadas línea por línea por el controlador, sin tests nuevos
> (política lean).
>
> **Estado verificado (Fases 7+8, re-corrido independientemente al cierre):** shared build OK ·
> `tsc --noEmit` de `apps/web` limpio · **10/10** tests · backend intacto (269 pass + 2 skip).
> **REGLA NUEVA de bookkeeping** (pedido del usuario, Sesión 37): ledger/CLAUDE.md/memoria se
> actualizan en UN solo batch al cierre de sesión, nunca entre fases (memoria
> `memoria-solo-al-cierre.md`).
> **Próxima sesión — retomar en la Fase 9** (navegación: `Layout.tsx` — íconos book/calendar,
> 2 NavItem en la sección Formación para SA/TH/SST, renombrar etiqueta "Capacitaciones"→"Eventos"
> sin cambiar ruta, `routeLabels`; `App.tsx` — ruta pública `/tomar-curso/:token` fuera de Layout
> junto a `/asistencia/:token`, `/cursos` + `/cursos/:id` [hermana top-level, NO hija anidada] +
> `/planificador` protegidas SA/TH/SST; `shared/src/modulos.ts` NO cambia) → Fase 10 (verificación
> final raíz + **pedir autorización explícita para aplicar `0012`/`0013` a prod** + smoke test
> manual de 11 pasos, plan maestro líneas 563-579). Leer primero `.superpowers/sdd/progress.md`
> (ledger). El brief de Fase 9 no está redactado — grounding contra `App.tsx`/`Layout.tsx` reales.

> ✅ **PERSONAL v2 (HOJA DE VIDA 360°) — Sprint 2 + Sprint 3 COMPLETOS (Sesión 33). Migraciones `0011` y ETL v2
> APLICADOS A PRODUCCIÓN.** Continuación directa de la Sesión 32 (Sprint 0+1 ya cerrados: tablas satélite + expediente
> de solo lectura `/personal/:id`). Esta sesión cerró **captura** (Sprint 2, backend+frontend) y **ETL v2** (Sprint 3).
> Detalle completo en §10 (Sesión 33). Plan: `C:\Users\Leonardo\.claude\plans\synthetic-wibbling-stroustrup.md`.
>
> **✅ Sprint 2 backend** (heredado de la sesión anterior, verificado de nuevo esta sesión): 12 endpoints nuevos bajo
> `/api/personal/*` — CRUD de los 5 bloques satélite (`guardarPersonales`, `crearFamiliar`/`eliminarFamiliar`,
> `crearFormacion`/`eliminarFormacion`, `crearExperiencia`/`eliminarExperiencia`, `guardarSalarial` con doble guarda
> rol+`veSalarial`, `editarContractual`) + infraestructura de **Supabase Storage** para la foto del expediente
> (`StoragePort`/`supabaseStorage`, flujo de URL firmada de subida/lectura, el backend nunca toca los bytes). Migración
> `0011_storage_fotos_empleados.sql` (bucket privado `fotos-empleados`, deny-directo, sin políticas RLS).
>
> **✅ Sprint 2 frontend (nuevo esta sesión)** — `apiPersonal` extendido con los 12 endpoints + `usePersonal.ts` con
> los hooks de mutación correspondientes (incl. `useSubirFoto`: orquesta los 3 pasos de la subida — pide URL firmada,
> `PUT` directo del navegador al bucket vía `supabase.storage.uploadToSignedUrl`, confirma la ruta con `guardarFoto`).
> `pages/personal/BloquesEditables.tsx` (nuevo): un editor autocontenido por bloque con el patrón de confirmación
> inline ya establecido (`AccionesEmpleado`) — `PersonalesEditor`/`ContractualEditor`/`SalarialEditor` (1-1, editan
> aparte del bloque de lectura porque cubren campos distintos a "Actualizar datos") y `FamiliaEditor`/`FormacionEditor`/
> `ExperienciaEditor` (1-N: listan+agregan+eliminan en un solo componente, con confirmación de 1 clic para eliminar,
> reemplazan el bloque de solo-lectura) + `FotoEditor` (sube/quita, sustituye el `Avatar` fijo del header). Wireados en
> `ExpedientePage.tsx`. **Verificación:** shared 199/199 · backend 223+2 skip · web 10/10 · build raíz exit 0 sin warnings.
>
> **✅ Sprint 3 (ETL v2) — `scripts/importarEmpleados.ts` extendido y CORRIDO CONTRA PRODUCCIÓN.** Lee las mismas 4
> hojas del Excel para poblar personales/contractual extendido/salarial/formación, con **COALESCE en cada campo**
> (el Excel solo rellena huecos; si un humano ya editó un campo desde la UI, el ETL NUNCA lo pisa con null) y
> formación **insert-once por empleado** (si ya tiene algún registro, se salta — sin clave natural para upsert 1-N).
> **Fuera de alcance, documentado explícitamente:** familiares (el Excel solo trae un conteo `HIJOS` sin nombre, dato
> insuficiente para un registro real) y experiencia laboral previa (sin ninguna columna de historial en las 4 hojas) —
> ambos quedan para captura manual vía la UI nueva.
> **Bug real atrapado en el dry-run antes de tocar producción:** la hoja `ACD` (377 empleados) usa **punto** como
> separador de miles (`"1.750.905"`) mientras las otras 3 hojas usan **coma** (`"1,750,905"`) — confirmado
> inspeccionando filas reales del archivo, no un error de captura aislado. El parser original solo despojaba comas →
> silenciosamente dejaba en `null` o mal-escalaba (`249.095` interpretado como pesos en vez de $249.095) los montos de
> ACD. Corregido: `normalizarDinero` ahora despoja tanto `,` como `.` sin condicionar por hoja (ningún salario en estas
> 4 hojas usa decimales). Re-verificado contra el archivo real tras el fix: montos coinciden exactamente con el Excel.
> **Migración `0011` aplicada a PROD vía MCP** (autorización explícita del usuario vía `AskUserQuestion`, verificado
> `list_migrations` antes/después + advisors limpios — solo los 3 `rls_enabled_no_policy` INFO esperados en
> `asistencias`/`capacitaciones`/`novedades` [deny-directo] + el WARN moot de leaked-password de siempre).
> **Corrida real del ETL:** la primera ejecución se cayó a mitad de camino por un `Connection terminated unexpectedly`
> de `pg` (red/pool, no un bug del script) tras cubrir ~184/534 empleados — verificado con una consulta directa antes
> de decidir el siguiente paso. Como todas las escrituras satélite son idempotentes (COALESCE + insert-once), se
> **re-corrió el mismo comando sin cambios** y esta vez completó los 534 sin caerse. **Resultado final verificado en
> BD:** 534 activos + 9 protegidos en trámite = 543 total (intacto) · `empleado_personales` 532/534 · `empleado_salarial`
> 534/534 · `empleado_formacion` 74 filas en 52/53 empleados esperados · `funcionarios.tipo_contrato` (u otro campo
> contractual) poblado en 91/534 (esperado — escalafón/modalidad son columnas dispersas, solo presentes en algunas hojas).
> **0 fallidos** en ambas corridas.
>
> **Verificación final (todo verde):** shared **199/199** · backend **223 pass + 2 skip** · web typecheck limpio +
> **10/10** · `npm run build` raíz **exit 0 SIN warnings**. **Working tree SIN commitear** (constraint respetado; la BD
> de prod sí quedó modificada — migración 0011 + datos de 543 empleados — con autorización explícita en cada paso).
>
> **Pendiente = ACCIÓN HUMANA:** smoke E2E de captura — abrir un expediente `/personal/:id`, editar cada bloque (incl.
> subir/quitar foto), confirmar que los datos importados por el ETL aparecen correctamente y que editar desde la UI
> persiste tras recargar. **Próxima sesión (Sprint 4, si se retoma):** export PDF del expediente + micro-interacciones
> del puente "Finalizar contrato". Encargos abiertos del usuario siguen sin iniciar: diccionario de datos en `docs/`,
> auditoría de código muerto.

> ✅ **MÓDULO "ADMINISTRACIÓN DE PERSONAL" v1 — COMPLETO (Sesión 31, Fases 0–7 cerradas).** Cuarto módulo pedido por la
> Jefa de TH (Laura Armenta): el `funcionario` evoluciona a **maestro de empleados** — **"una tabla, dos proyecciones"**:
> la misma tabla `funcionarios` sirve `Funcionario` (trámite, `fecha_retiro NOT NULL` en la práctica) y `Empleado`
> (maestro, todas las filas). Un empleado nace **ACTIVO** (`fechaRetiro=null`, sin aprobaciones, invisible a Paz y Salvo);
> **"Finalizar contrato" es el PUENTE**: fija `fecha_retiro` → backfill de aprobaciones por área activa →
> `recomputarEstado` → entra a la máquina de estados **intacta**. Ciclo de vida DERIVADO: `estadoVinculacion` = ACTIVO /
> EN_RETIRO / RETIRADO. Alcance v1 = **Núcleo + Puente** ("Otro sí" ligero: cargo/extensión; el 360° salarial/familia/
> formación/escalafón → fase 2, requiere RLS). Plan ejecutado íntegro:
> `C:\Users\Leonardo\.claude\plans\replicated-churning-dahl.md`.
>
> **✅ Fase 6 (pulido de páginas) COMPLETA** — `apps/web/src/pages/personal/` se dividió en archivos dedicados (mismo
> patrón que el resto de módulos): `PersonalPage.tsx` (wrapper delgado, `PageHeader`+`<CatalogoPersonal/>`) ·
> `CatalogoPersonal.tsx` (listado URL-driven: Buscador+ChipFiltro+FilaDesplegable+Paginación+`<Outlet/>`) ·
> `RegistrarEmpleadoForm.tsx` (alta manual, extraído tal cual) · `EmpleadoModal.tsx` (wrapper `Modal`+`<FichaEmpleado/>`) ·
> `FichaEmpleado.tsx` (núcleo+historial de novedades+`<AccionesEmpleado/>`) · `AccionesEmpleado.tsx` (Finalizar contrato +
> Otro sí extraídos **+ acción nueva "Actualizar datos"**: edición inline del núcleo vía `useEditarEmpleado`, mismo patrón
> de confirmación inline toggle-abierto/cerrado que las otras dos). **Spot illustration propia** `SpotSinEmpleados` en
> `components/ui/spot/Spots.tsx` (carné/gafete con "+", línea navy + acento oro, mismo lenguaje que `SpotArchivoVacio`/
> `SpotBandejaAlDia`), reemplaza el `SpotSinResultados` prestado. Sin imports huérfanos tras los splits.
>
> **✅ Fase 7 (ETL) COMPLETA y APLICADA A PRODUCCIÓN** — migración `0009_administracion_personal.sql` **aplicada a prod
> vía MCP** (autorización explícita del usuario, verificado con `list_migrations` antes y después; advisors limpios:
> solo el `rls_enabled_no_policy` esperado en `novedades` [deny-directo, mismo patrón que `capacitaciones`/`asistencias`]
> y el WARN moot de leaked-password de siempre). `scripts/importarEmpleados.ts` (nuevo, raíz del repo, con `--aplicar`
> opcional y modo DRY-RUN por defecto): lee las 4 hojas de `Base de datos 2026 th - copia.xlsx`
> (`C:\Users\Leonardo\Downloads\`), parseo de fechas robusto (prosa ES/EN con mapa de meses bilingüe, serial de Excel,
> slash-date D/M/Y vs M/D/Y según la hoja de origen), dedup por documento normalizado (gana la hoja consolidada),
> mapeo de `tipoVinculacion` por hoja (ADM→ADMINISTRATIVO, ACD→DOCENTE, ops→OPS, consolidada→por `PROGRAMA`), upsert
> idempotente `ON CONFLICT (documento) ... WHERE fecha_retiro IS NULL` (nunca sobrescribe un empleado ya en trámite).
> **Resultado real de la corrida supervisada:** 543 filas únicas tras dedup (18 omitidas por duplicado/inválidas) →
> **534 insertadas, 0 actualizados, 0 fallidos**; 9 filas protegidas correctamente por el guard (`ya en trámite de Paz y
> Salvo, no se sobrescribe` — eran el seed original). Verificado en BD: `534 ACTIVO + 9 en trámite = 543 total`. 49
> avisos no bloqueantes (fechas de ingreso/fin no reconocidas por datos sucios del Excel — guiones, `#REF!`, columnas
> desalineadas — la fila se importó igual con esos campos en `null`). Dependencias `xlsx`/`tsx`/`pg` añadidas como
> devDependencies en la raíz para correr el script.
>
> **✅ Verificación final (todo verde):** shared **186/186** · backend **169 pass + 2 skip** · web typecheck limpio +
> **10/10** · `npm run build` raíz **exit 0 SIN warnings** · `npm test` raíz (3 workspaces encadenados) sin fallos.
> **Working tree SIN commitear** (constraint respetado — BD de prod sí quedó modificada con autorización explícita).
>
> **Smoke E2E humano pendiente (no lo puede verificar el agente):** entrar como SA/TH → ver "Administracion de personal"
> en el sidebar → catálogo muestra los 534 ACTIVO importados + filtros funcionando → abrir un empleado → probar
> "Actualizar datos" (nuevo) → Finalizar contrato de un ACTIVO real de prueba (¡irreversible, no probar con datos
> reales sin plan!) → Otro sí registra novedad en el historial.
>
> **Decisiones/encargos abiertos del usuario (recordar, no asumir respuesta):**
> - Consolidar/oficializar el **diccionario de datos** (columnas/formatos/estructura/esquema) en `docs/` — aún sin iniciar.
> - **Auditar/limpiar** código muerto y columnas sin uso en BD y sistema, con evidencia — aún sin iniciar.
>
> **Próxima sesión:** módulo funcionalmente completo y en producción; lo que sigue es trabajo nuevo (rediseño visual v2
> del Sello, fase 2 del producto [360° con RLS], o los encargos abiertos de arriba) — no hay checklist pendiente de
> Personal v1.
>
> **🟢 POST-MIGRACIÓN — features sobre el monorepo Vite+Express.** Sesión 13: Panel de control (SA+TH).
> Sesión 14: **Spec 1 — TH y CI en oficinas dedicadas** (`/paz-y-salvo/talento-humano` y `/control-interno`;
> `/funcionarios` ahora SA-only; helper `rutaOficinaPorRol`).
> Sesión 15: **Spec 2 — Archivo institucional** (`/archivo` SA+TH, **solo lectura** sobre datos existentes:
> listado de trámites cerrados + filtro de rango de fecha de retiro + expediente + export CSV). **Sin bitácora**
> (el usuario eligió "detalle actual + metadata" → SIN tabla nueva, SIN migración, SIN tocar el flujo del trámite ni
> la máquina de estados). Todo verde, SIN commitear. Detalle en §10 (Sesión 15) y
> `docs/superpowers/specs/2026-06-25-archivo-institucional-design.md`.
>
> ✅ **CIERRE COMPLETADO (Sesión 16):** migraciones `0004`/`0005`/`0006` aplicadas a producción vía MCP
> (se descubrió que `0004` nunca se había aplicado: RLS sin políticas + 3 funciones inexistentes → se aplicó
> el estado completo). Advisors de seguridad **limpios** salvo "Leaked Password Protection" (moot: auth es
> Google OAuth, sin passwords). SECURITY DEFINER endurecido. Working tree **commiteado** en 3 commits
> semánticos (`feat` migración · `docs` cerebro/diseño · `chore` CI/tooling). Smoke E2E + deploy Vercel los
> dio por hechos el usuario.
>
> 🔵 **PRÓXIMA SESIÓN:** features nuevas o ajustes. Si se reactiva auth con passwords, habilitar "Leaked
> Password Protection" en el panel de Supabase. Recordar: la BD ya está alineada con las migraciones 0001–0006.
>
> ✅ **MÓDULO CAPACITACIONES COMPLETO (Sesiones 21–22):** Rol `SST` + migraciones `0007`/`0008` + backend
> completo (140/140) + **web completo**: `useCapacitaciones` · `useRegistroAsistencia` · `CapacitacionesPage` +
> `GestionCapacitacion` + `CapacitacionModal` (QR con `qrcode.react`) · `RegistroAsistenciaPage` pública
> (`/asistencia/:token`, sin auth, idempotente) · rutas en `App.tsx` · sección Formación en `Layout.tsx` (SA/TH/SST)
> · `esSst` en `useRole`. Todo verde: shared 152/152 · backend 140+2 skip · web 9/9 · typecheck limpio · build exit 0
> sin warnings.
>
> ✅ **CACERÍA DE BUGS + CIERRE CAPACITACIONES (Sesión 23):** migraciones `0007`/`0008` **APLICADAS a prod vía MCP**
> (causa raíz del bug reportado "no crea la capacitación": nunca se habían aplicado → la BD no tenía las tablas).
> Cerrados 1 CRÍTICO (desync de caché TanStack: helper `invalidarVistasTramite` que también invalida `archivo`/
> `expediente`/`funcionarios-todos`) + 4 IMPORTANTE (rango `terminaEn>iniciaEn` en schema crear/editar + caso de uso;
> `ambito` opcional al crear; refine no-vacío en editar; `normalizarDocumento` para idempotencia real). Tests de frontera:
> shared **162/162** · backend **142+2 skip** · web 9/9 · build raíz exit 0. SIN commitear. Detalle en §10 (Sesión 23).
> MENOR (#6–#13) en backlog.
>
> 📐 **ARQUITECTURA DE PLATAFORMA — DISEÑO APROBADO (Sesión 24):** Spec escrito y aprobado en
> `docs/superpowers/specs/2026-06-30-plataforma-multi-modulo-concurrencia-design.md`. Define: modelo
> plataforma/módulos, registro declarativo `shared/src/modulos.ts`, contrato de concurrencia (garantizado en BD,
> no tocar sin TDD), sincronía en vivo con Supabase Realtime (1 canal por usuario, invalida TanStack Query),
> veredicto Vercel (bien configurado; cold start mitigable con keep-alive gratuito), y §11 nuevo en este archivo.
>
> ✅ **P1 IMPLEMENTADO (Sesión 25):** registro declarativo `shared/src/modulos.ts` (`Modulo`/`MODULOS`/`modulosParaRol`,
> +8 tests) consumido por el lanzador del Panel (`ModuleLauncher` ahora recibe `{rol}` e itera `modulosParaRol`; corrige
> de paso los módulos futuros "Contratación/Bienestar" → "Reportes/Organigrama" del spec) + **Supabase Realtime**
> (`apps/web/src/lib/realtime.ts`: 1 canal `plataforma-sync` suscrito a `funcionarios`+`aprobaciones` → invalida TanStack
> Query; montado en `AuthContext` con `useEffect` ligado a `usuario?.id`/`estado`, limpieza en logout/desmontaje). Todo
> verde: shared **170/170** · backend 142+2 skip · web typecheck + 9/9 · build raíz exit 0 sin warnings. SIN commitear.
> Detalle en §10 (Sesión 25). **Próximo:** P2 keep-alive UptimeRobot (config externa) + smoke E2E del Realtime con 2 sesiones.
>
> ✅ **HERRAMIENTA DE DEV — IMPERSONACIÓN DE ROL (Sesión 26):** selector flotante (`components/dev/RoleSwitcher.tsx`)
> visible **solo para el SUPERADMIN real** para experimentar la UI/UX de cada rol (TH/CI/AREA→elige dependencia/SST) sin
> tocar la cuenta real. `AuthContext` ahora expone `usuario` (efectivo) vs `usuarioReal` (guardado) + `impersonar`/
> `detenerImpersonacion` (sessionStorage `pys_impersonacion`, se borra en logout). El JWT real sigue SUPERADMIN → el
> backend autoriza todo → datos reales (las acciones impactan la BD, no es sandbox). Todo verde: web typecheck + 9/9 ·
> build raíz exit 0. SIN commitear. Detalle en §10 (Sesión 26).

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

## 11. Arquitectura de Plataforma

**Plataforma de Gestión de Talento Humano** contiene módulos independientes. La fuente de verdad de qué
módulos existen y quién los ve vive en `shared/src/modulos.ts` (`MODULOS`, `modulosParaRol`). El sidebar
y el lanzador del Panel consumen esta lista; nunca tienen módulos hardcodeados.

**Módulos actuales:** `paz-y-salvo` (todos) · `capacitaciones` (SA, TH, SST). Próximos: `reportes`, `organigrama`.

**Roles plataforma vs. acotados:** `rolVePlataforma()` → SA y TH ven `/inicio`; CI/AREA/SST entran directo
a su trabajo (`rutaInicialPorRol`). Sin cambios en la lógica existente.

**Sincronía multi-usuario (Supabase Realtime):** un canal por sesión autenticada suscrito a `funcionarios`.
Los eventos llaman `queryClient.invalidateQueries` → TanStack Query refetcha solo lo necesario. La conexión
WebSocket va **directo browser↔Supabase**, no pasa por Vercel. RLS protege los eventos (el usuario solo
recibe filas que su política SELECT permite).

**Concurrencia (ya resuelta en BD):** `cambiarEstadoArea` usa `SELECT ... FOR UPDATE` + recálculo atómico en
la misma transacción (`recomputarEstado.ts`). Los hitos TH→CI usan UPDATE condicional (`WHERE estado_global=esperado`)
con `RETURNING` para detectar conflictos TOCTOU. **No tocar estas transacciones sin TDD previo.**

**Vercel:** bien configurado (Supavisor pool, región `iad1` colocada con Supabase `us-east-1`, code-split,
CSP ya incluye `wss://*.supabase.co`). Cold starts mitigables con ping gratuito a `/api/health` cada 5 min
(UptimeRobot). Spec completo: `docs/superpowers/specs/2026-06-30-plataforma-multi-modulo-concurrencia-design.md`.

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

### 2026-06-25 — Sesión 16: Cierre de migración — migraciones en prod, endurecimiento y commit

- **Sesión de cierre (sin features).** El usuario pidió cerrar los pendientes dando por hechas las acciones humanas
  (smoke E2E, deploy). Verificación previa **todo verde:** shared **96/96** · backend **96 + 2 skip** · web typecheck
  limpio + **9/9** · `npm run build` raíz **exit 0 sin warnings**.
- **Migraciones a producción (vía MCP Supabase, con autorización explícita del usuario por el clasificador de seguridad):**
  al inspeccionar la BD se **descubrió drift**: `0004_rls_datos.sql` **nunca se había aplicado** → las 4 tablas tenían RLS
  activo **sin políticas** y faltaban 3 funciones (`es_usuario_activo`/`es_supervisor`/`area_de`) que asumía `0005`. Decisión
  del usuario: aplicar el **estado completo**. Se aplicaron en orden `0004` (funciones + políticas SELECT) → `0005` (REVOKE
  EXECUTE de las 5 funciones SECURITY DEFINER a anon/authenticated/public) → `0006` (índices `funcionarios.estado_global`,
  `observaciones.area_id`). La BD queda alineada con las migraciones 0001–0006.
- **Advisors de seguridad re-corridos: LIMPIOS** — desaparecieron los 2 WARN de SECURITY DEFINER y los 4 INFO de
  `rls_enabled_no_policy`. Queda 1 WARN: "Leaked Password Protection Disabled" → **moot** (auth es Google OAuth, sin
  passwords); toggle del panel si algún día se usan passwords.
- **Commit del working tree (autorizado):** 15 sesiones de trabajo acumulado committeadas en **3 commits semánticos**
  coherentes (cada uno deja árbol buildeable): `feat:` migración a monorepo Vite+Express (incluye borrado del árbol Next) ·
  `docs:` cerebro/diseño/specs · `chore:` CI/loadtest/hooks de Claude. Se añadió `.claude/settings.local.json` al `.gitignore`
  (rutas absolutas de la máquina). Verificado: working tree **limpio**, sin secretos indexados (`.env`/`.mcp.json`/`secrets/`
  /`node_modules`/`dist` siguen ignorados).
- **Estado:** migración **cerrada**. Working tree commiteado (3c0671b chore · acb6ca5 docs · 7062579 feat). Falta solo
  **push** (no solicitado) si se quiere publicar a remoto.

### 2026-06-25 — Sesión 17: Rediseño Login & Pendiente "El Sello Lacrado" — PLAN APROBADO (checkpoint, sin implementar)

- **Sesión de diseño** (brainstorming + `ui-ux-pro-max` como lente de calidad). El usuario pidió trabajar el **login**;
  se investigó y se acordó un **rediseño visual premium** de `LoginPage` **y** su hermana `PendientePage` (se ven en
  secuencia tras el OAuth; hoy ambas austeras + emojis ⏳/🔒 que violan "íconos SVG, no emojis").
- **Dirección acordada — "El Sello Lacrado":** tarjeta premium centrada con **membrete navy** + **medallón (escudo)
  montado sobre la costura navy↔blanco** (recurso de diploma) + **animación de entrada coreografiada** ("el sellado":
  tarjeta sube → hairline oro se dibuja → medallón destella una vez → contenido escalona). Botón Google con **logo G
  oficial (SVG)** + **estado de carga**. Reusa el lenguaje del `Avatar` (disco navy-50 + `ring-gold`), el `Icon`
  (`clock`/`lock` ya existen), `ps-card-in`, `rule-gold`, foco oro. Respeta el Sello (oro ≤10%, serif solo wordmark,
  hairline-primero, AA, `prefers-reduced-motion`). **Cero cambios en la lógica de auth.**
- **Plan aprobado** en `C:\Users\Leonardo\.claude\plans\flickering-plotting-scroll.md`: 2 archivos nuevos
  (`components/auth/GoogleIcon.tsx`, `components/auth/AuthShell.tsx`) + 3 ediciones (`LoginPage.tsx`,
  `PendientePage.tsx`, `index.css`). Política lean → sin tests nuevos (cambio presentacional).
- **CHECKPOINT inicial — pausa solicitada ANTES de tocar código.** Tras "retoma y continúa", el plan se **ejecutó completo**
  en esta misma sesión (ver abajo).
- **✅ IMPLEMENTADO.** **2 archivos nuevos:** `components/auth/GoogleIcon.tsx` (logo "G" oficial, 4 trazos de marca,
  `aria-hidden`) · `components/auth/AuthShell.tsx` (chasis presentacional compartido: tarjeta `max-w-md` con membrete
  `bg-navy-deep` + medallón `h-20 w-20` montado sobre la costura con `-mt-10` y `ring-gold-200/60` + hairline `rule-gold` +
  cuerpo `auth-stagger`; reusa `animate-card-in`). **3 ediciones:** `index.css` (keyframes `ps-rule-draw`/`ps-seal-glint`/
  `ps-auth-rise` + clases `.auth-rule`/`.auth-seal`/`.auth-stagger` + las 3 añadidas al bloque `prefers-reduced-motion`) ·
  `LoginPage.tsx` (envuelto en `AuthShell`, medallón = `/escudo.png`, botón Google con `<GoogleIcon>` + estado `cargando`
  → "Conectando…" con spinner `animate-spin` + `disabled`/`cursor-pointer` + pie de dominio; **lógica de auth intacta**) ·
  `PendientePage.tsx` (envuelto en `AuthShell`, **emojis ⏳/🔒 reemplazados** por `<Icon name="clock|lock">` coloreado,
  botón "Cerrar sesión" consistente; lógica intacta). **Sin tocar** `AuthContext`/`CallbackPage`/`App.tsx`/routing.
- **Política lean:** sin tests nuevos (cambio presentacional). **Findings del hook impeccable** en `index.css`
  (`rgba(254,252,248,0.94)` L206, `Sfmono-Regular` L255) = **preexistentes** en `premium-card`/`plaqueta`, ajenos a este
  cambio (port verbatim del Sello ya clasificado en sesiones previas); no se tocaron.
- **Verificación (todo verde):** web typecheck limpio + **9/9** · `npm run build` raíz **exit 0 SIN warnings**.
  **Working tree SIN commitear** (constraint respetado).
- **Pendiente = ACCIÓN HUMANA:** smoke visual en `dev:web` (:5173) — entrada coreografiada en `/login` (tarjeta sube →
  hairline se dibuja → medallón destella → contenido escalona), botón "Conectando…", `/pendiente` con el mismo chasis,
  `prefers-reduced-motion` y responsive a 375px. Sigue abierto el plan de Sesión 18 (vistas por área).

### 2026-06-25 — Sesión 18: Vistas por Área (catálogo + visibilidad TH/CI) — PLAN APROBADO (checkpoint, sin implementar)

- **Sesión de diseño** (brainstorming, modo plan). El usuario pidió **"configurar las vistas por área"**. Exploración
  exhaustiva (3 agentes Explore: backend/datos · shared · web). **Hallazgo:** el código evolucionó más allá del cerebro —
  ya existen `/archivo`, oficinas dedicadas `talento-humano`/`control-interno`, `PanelControlPage`, `metricas.ts`, `archivo.ts`.
- **Diagnóstico clave:** la **independencia por área YA existe en los datos** (`aprobaciones` = fila por funcionario×área;
  `listarGestionArea` filtra por `areaId`, así que Activos Fijos no ve lo de Sistemas). El **flag `areas.activa` existe pero
  nada lo usa**. El **dolor real** = TH y Control Interno no tienen visibilidad consolidada del avance por área (solo un
  conteo agregado); no pueden ver "este funcionario solo espera a Sistemas".
- **3 decisiones de producto acordadas:** **D1** área nueva → `PENDIENTE` solo a funcionarios en proceso, cerrados quedan
  `NO_APLICA` (no se reabren). **D2** área inactiva → **deja de exigirse** (sale del cálculo de estado/colas/matriz; si era
  el único bloqueante el funcionario pasa a `LISTO_PARA_LIQUIDAR`). **D3** matriz TH/CI → **solo lectura** + clic abre ficha.
- **Plan aprobado** en `C:\Users\Leonardo\.claude\plans\desarrolla-un-plan-completo-snoopy-eich.md`. **Dos partes** sobre un
  bloque **transversal**: (Transversal) extraer `recomputar()` a `recomputarEstado.ts` y filtrar por **área activa** (alimenta
  a `calcularEstadoGlobal` intocada) + recálculo en lote tras mutar el catálogo. (**Parte A**) CRUD de áreas en todas las capas
  — schemas Zod, `AreaRepo` con `crearArea`(backfill `aprobaciones` por D1)/`renombrar`/`mover`/`cambiarActiva`, casos de uso
  SA, `areas.routes.ts`, `AreasPage`+`GestionArea` (espejo de Usuarios), nav. (**Parte B**) B1 matriz funcionario×área
  (`listarMatrizPaginado` → `MatrizGestion`, ruta `GET /funcionarios/matriz` supervisores, `MatrizPage`+`CeldaMatriz`,
  `/paz-y-salvo/avance`) + B2 cola por área pulida (`bucket` pendientes/gestionados en `MiAreaPage`). Tests lean (schemas,
  guardas 403, transiciones de estado).
- **CHECKPOINT — pausa solicitada por el usuario ANTES de tocar código.** **Nada implementado todavía.** Working tree =
  el de la Sesión 16 (commiteado, limpio). Pendientes previos que siguen abiertos: rediseño Login/Pendiente (plan Sesión 17,
  sin implementar). **Próximo:** ejecutar el plan en orden — Transversal → Parte A → Parte B.1/B.2 → verificación (build
  shared → tests×3 → typecheck web → build raíz). Sin commitear salvo orden.

### 2026-06-25 — Sesión 19: Vistas por Área — **Transversal + Parte A COMPLETAS** (Parte B preparada para sesión nueva)

- **Ejecución del plan** `desarrolla-un-plan-completo-snoopy-eich.md` (TDD lean). El usuario pidió completar **solo hasta
  Parte A**, dejar listo el terreno para Parte B en otra sesión, actualizar memoria y cerrar. **Sin commits** (constraint).
- **✅ TRANSVERSAL COMPLETO** — el corazón de integridad del estado por "área activa":
  - **shared** `src/areas.ts` (nuevo, puro): `estadoInicialAreaNueva(estadoGlobal)` (D1: cerrado→`NO_APLICA`, en proceso→
    `PENDIENTE`) + `soloActivas(areas)` (D2). Barrel actualizado. **+6 tests** (`tests/areas.test.ts`). `estado.ts` **intocado**.
  - **backend** `infrastructure/db/recomputarEstado.ts` (nuevo): se **extrajo** el `recomputar()` privado de
    `funcionarioRepository.ts` a módulo exportado, y su query de `aprobaciones` ahora **innerJoin `areas` + `activa=true`**
    → un área inactiva no entra al conjunto que alimenta a `calcularEstadoGlobal` (intocada). Exporta el tipo `Ejecutor`.
  - **Filtro de área activa** aplicado además en `listarGestionArea` (innerJoin areas + activa → cola vacía si el área se
    desactivó) y en `obtenerMetricas` → `pendientesPorArea` (solo activas). Las 3 mutaciones del trámite ahora llaman
    `recomputarEstado` (mismo comportamiento, dentro de su `tx`).
- **✅ PARTE A COMPLETA — Catálogo de áreas CRUD, todas las capas:**
  - **shared schemas:** `crearAreaSchema`/`renombrarAreaSchema`/`cambiarActivaAreaSchema`/`moverAreaSchema` (`.strict()`+
    `.uuid()`+`nombre` trim 2–80) y `filtroMatrizSchema` (= `filtroFuncionariosSchema`, **adelantado para Parte B**). **+6 tests**.
  - **backend puerto** `AreaRepo` extendido: `listarAreas(incluirInactivas?)`, `crearArea`/`renombrarArea`/`moverArea`/
    `cambiarActivaArea` (todas devuelven el **catálogo completo** actualizado). **Repo Drizzle** implementado: `crearArea`
    (orden=max+1 + **backfill `aprobaciones`** por D1 + recálculo de todos en una `tx`), `moverArea` (swap de `orden` con
    **sentinela temporal `-1`** para no violar `UNIQUE(orden)`, no-op en extremos), `cambiarActivaArea` (set + **recálculo en
    lote** de los funcionarios con fila en esa área en una `tx`), `renombrarArea` (404 si no existe).
  - **casos de uso** `application/areas/` (`crearArea`/`renombrarArea`/`moverArea`/`cambiarActivaArea`, guarda `exigirRol
    ["SUPERADMIN"]`) + `listarAreas` extendido (`incluirInactivas` exige SA). Barrel + `container.ts` cableados.
  - **HTTP:** `areasController.ts` (Zod→400) + `areas.routes.ts` montado en **`/api/areas`** (`GET /` cualquier activo;
    `POST /`, `/:id/nombre`, `/:id/mover`, `/:id/activa` con `requireRol("SUPERADMIN")`). Se **movió** `GET /areas` fuera de
    `catalogo.routes.ts` (y se quitó el método huérfano `c.areas` de `funcionariosController`). **+18 tests** (`tests/areas.test.ts`:
    guardas 403 de las 4 mutaciones + guard de `incluirInactivas` + delegación).
  - **web:** `apiAreas` (listarAdmin/crear/renombrar/mover/cambiarActiva) + `useAreas.ts` (`useAreasAdmin` + 4 mutaciones que
    revalidan `areas`/`funcionarios`/`mi-area`/`metricas`/`matriz`). Páginas `pages/areas/AreasPage.tsx` (form "Crear área" +
    `FilaDesplegable` por área con pill Activa/Inactiva) + `GestionArea.tsx` (renombrar · subir/bajar · activar/**desactivar con
    confirmación inline**, espejo de Usuarios). `App.tsx` ruta `/areas` (SA). `Layout.tsx`: ítem "Catalogo de areas"→`/areas`
    en Administracion (SA) + `routeLabels`; se **desambiguó** la entrada vieja "Areas"→`/paz-y-salvo/mi-area` ahora "Bandejas por area".
- **Verificación (todo verde):** shared **107/107** (+12) · backend **114 pass + 2 skip** (+18) · web typecheck limpio +
  **9/9** · `npm run build` raíz **exit 0 SIN warnings**. **Working tree SIN commitear.** Sin migración SQL (el esquema ya
  soporta `activa`; no se tocó la BD ni el MCP).
- **🔵 PARTE B — LISTA PARA EJECUTAR EN SESIÓN NUEVA** (plan §"Parte B", mismo doc). Ya adelantado: `filtroMatrizSchema`.
  **Pendiente B.1 (matriz funcionario×área, TH/CI/SA):** tipos `FilaMatriz`/`MatrizGestion` en `domain.ts`;
  `FuncionarioRepo.listarMatrizPaginado` (2 consultas: página de funcionarios + sus `aprobaciones` de **áreas activas** →
  columnas); caso de uso `obtenerMatriz` (guarda supervisores SA/TH/CI); ruta `GET /api/funcionarios/matriz` **antes de `/:id`**;
  `apiFuncionarios.matriz` + `useMatriz`; `MatrizPage` + `CeldaMatriz` (color desde `lib/ui.ts`); ruta `/paz-y-salvo/avance` +
  nav para los 3 supervisores. **Pendiente B.2 (cola pulida):** `bucket` pendientes/gestionados en `listarGestionArea`/ruta
  `/mi-area` (Zod) + `ChipFiltro` `?bucket=` en `MiAreaPage`. **Opcional:** `0007_indices.sql` (`aprobaciones.area_id`).
  Otros pendientes abiertos: rediseño Login/Pendiente (plan Sesión 17). **Arranque:** `npm run build --workspace=shared` primero.

### 2026-06-25 — Sesión 20: Iconografía e ilustraciones del Sello (íconos de línea, ícono por área, estados vacíos)

- **Feature presentacional** (plan `C:\Users\Leonardo\.claude\plans\resilient-inventing-teapot.md`, política lean → sin
  tests nuevos). El usuario pidió **vectores/íconos/SVG** para la app; decisión: **recrear todo como SVG inline en el Sello**
  (sin descargas de stock, sin atribución, sin gradientes morados). Autoridad del usuario: "si te lo pido, rompes la regla".
  3 entregables vía AskUserQuestion: **(1)** más íconos de línea · **(2)** ícono por área · **(3)** ilustraciones de estado vacío
  (NO hero). Iceberg/Sinu/Eva = **áreas de sistema** → monograma fallback. Integración = "mapa por nombre + fallback". Alcance =
  "crear y cablear". **Sin commits.**
- **NOTA — el código ya tiene Parte B (Sesión 19) implementada:** al cablear se confirmó que el árbol **ya contiene**
  `pages/matriz/MatrizPage.tsx` (+ `CeldaMatriz`, `useMatriz`, ruta `/paz-y-salvo/avance`) y el `bucket` pendientes/gestionados en
  `MiAreaPage` — es decir, **Parte B (B.1 matriz + B.2 cola pulida) está hecha** aunque el bloque de la Sesión 19 todavía la
  lista como "pendiente". El cerebro venía rezagado respecto al código (patrón ya visto). Al editar `MatrizPage` se observó que
  sus filas pasaron de `onClick`+`useNavigate` a `<Link to>` (refactor previo). Verde antes y después de tocar.
- **✅ ASSETS (3 archivos):** **`components/ui/dash/Icon.tsx`** ampliado de 9 → ~33 íconos de línea (mismo formato 24×24/
  `currentColor`/familia Lucide): `building`, `shield-check`, `search`, `edit`, `plus`, `close`, `chevron-down`, `mail`,
  `mail-off`, `calendar`, `coins`, `download`, `filter`, `eye`, `logout`, `badge`, `book`, `box`, `server`, `database`,
  `briefcase`, `iceberg`, `grad-cap`, `calculator`. **Acento oro** (sub-trazo con `stroke="#B68D40"` literal, no `currentColor`)
  vía mapa `ACENTO_ORO` para `mail-off` (tachado) e `iceberg` (línea de flotación). **`components/ui/AreaIcon.tsx`** (nuevo):
  helper puro `iconoDeArea(nombre): IconName | null` (reglas ordenadas palabraClave→ícono sobre el nombre normalizado sin
  acentos; `activo→box`, `sistema→server`, `tesoreria→coins`, `contabilidad→calculator`, `carnetiz→badge`, `biblioteca→book`,
  `correo→mail-off`; resto → `null` → monograma) + componente `<AreaIcon variant="disc"|"bare" size>` (disc = estética `Avatar`
  navy-50+`ring-gold`; **monograma** `iniciales()` de `@pys/shared` como fallback de Iceberg/Sinu/Eva y futuras). La variante
  `bare` **hereda `currentColor`** (se ve bien sobre chip claro o navy activo). **`components/ui/spot/Spots.tsx`** (nuevo):
  3 spot illustrations ~120px (línea navy + acento oro, `aria-hidden`): `SpotSinResultados` (lupa+destello), `SpotArchivoVacio`
  (archivador), `SpotBandejaAlDia` (bandeja+check).
- **✅ EmptyState** (`components/ui/EmptyState.tsx`): nueva prop opcional `ilustracion?: ReactNode` (spot grande centrado; si
  está, prima sobre `icono`). Retrocompatible.
- **✅ CABLEADO (5 páginas) — TODOS los emojis de estado vacío eliminados** (regla del Sello "íconos SVG, no emojis"):
  `CatalogoFuncionarios` (🔍→`SpotSinResultados`) · `ArchivoPage` (🗂️→`SpotArchivoVacio`) · `MatrizPage` (🔍→`SpotSinResultados`,
  🗂️→`<Icon name="grid">`, **cabeceras de columna** con `<AreaIcon variant="bare">` sobre el nombre) · `MiAreaPage` (🔒→
  `<Icon name="lock">`, 🗂️→`<Icon name="grid">`, ✓→`SpotBandejaAlDia`, **chips de área del SA** con `<AreaIcon variant="bare">`) ·
  `AreasPage` (disco del orden → `<AreaIcon variant="disc" size="sm">`; el orden sigue en el subtítulo "Orden N en el flujo").
  Grep final: **cero emojis** `🔍🗂️🔒✓⏳` en `icono=` de `apps/web/src`.
- **Verificación (todo verde):** web typecheck limpio + **9/9** · `npm run build` raíz **exit 0 SIN warnings** (Recharts en
  chunks lazy aparte). **Working tree SIN commitear** (constraint respetado). Sin tocar backend, `shared` ni `estado.ts`.
- **Pendiente = ACCIÓN HUMANA:** smoke visual en `dev:web` (:5173) — íconos por área en chips de Mi área, cabeceras de la matriz
  de Avance y discos del Catálogo de áreas; monograma para Iceberg/Sinu/Eva; las 3 spot illustrations en sus estados vacíos;
  confirmar que el acento oro se mantiene discreto. Pendientes abiertos previos: rediseño Login/Pendiente (Sesión 17, ya
  implementado en árbol). Si se quiere publicar: `push` (no solicitado).

### 2026-06-26 — Sesión 21: Módulo Capacitaciones — shared + backend completos (web pendiente)

- **Módulo nuevo** (plan `tranquil-shimmying-abelson.md` aprobado en sesión anterior; esta sesión = implementación). Política lean
  (tests solo en frontera: guardas 403, idempotencia, smoke público). **Sin commits** (constraint).
- **shared — rol SST + dominio capacitaciones COMPLETOS:** `domain.ts`/`permisos.ts`/`ui.ts` actualizados para SST (typecheck-driven).
  Nuevo `src/capacitaciones.ts` puro: tipos (`AmbitoCapacitacion`, `EstadoRegistro`, `TipoVinculo`, `Capacitacion`, `Asistencia`,
  `CapacitacionDetalle`, `CapacitacionPublica`, `FiltroCapacitaciones`, `ResultadoRegistro`) + funciones puras
  (`ambitoPorDefecto`, `puedeGestionarAmbito`, `ambitosVisibles`, `registroAbierto`, `construirCsvAsistencias`). Schemas Zod en
  `schemas.ts` (`crearCapacitacionSchema`, `editarCapacitacionSchema`, `filtroCapacitacionesSchema`, `registrarAsistenciaSchema`).
  Pills en `ui.ts` (`estadoRegistroPill`/`ESTADO_REGISTRO_BADGE`/`AMBITO_LABEL`/`TIPO_VINCULO_LABEL`). **152/152 tests** (+33).
- **backend COMPLETO:** 2 migraciones SQL (`0007_rol_sst.sql`, `0008_capacitaciones.sql`; NO aplicadas a prod). Schema Drizzle
  espejo (`ambitoCapacitacionEnum`, `estadoRegistroEnum`, `tipoVinculoEnum`, tablas `capacitaciones`/`asistencias` con
  UNIQUE(capacitacion_id, documento)). Puerto `CapacitacionRepo.ts`. Repo `capacitacionRepository.ts`: token = `randomBytes(16)
  .toString("base64url")`, `onConflictDoNothing` idempotente, mappers Date→ISO. **8 casos de uso** con guardas de rol+ámbito:
  `crearCapacitacion` (TH→TH, SST→SST, SA→cualquiera), `listarCapacitaciones` (filtra por ámbito automático por rol),
  `obtenerDetalleCapacitacion`, `obtenerCapacitacionPublica` (sin actor), `editarCapacitacion` (solo BORRADOR), `abrirRegistro`/
  `cerrarRegistro` (transiciones de estado), `exportarAsistencias` (CSV), `registrarAsistenciaPublica` (sin actor). Controllers
  `capacitacionesController` + `registroPublicoController`. **1 router unificado** `capacitaciones.routes.ts` en
  `/api/capacitaciones`: rutas públicas `/registro/:token` (GET+POST, rate-limit estricto 10/min) **antes** del `.use(requireAuth)`
  → `/` CRUD autenticado. Montado en `app.ts`. **140 pass + 2 skip** (+20).
- **web parcial:** `apiCapacitaciones` + `apiRegistro` añadidos a `lib/api.ts` (web typecheck limpio). Resto de la web (hooks,
  páginas, `App.tsx`, `Layout.tsx`) queda para la próxima sesión.
- **Pendiente = PRÓXIMA SESIÓN (web):** `npm install qrcode.react` · `hooks/useCapacitaciones.ts` · `hooks/useRegistroAsistencia.ts`
  · `pages/capacitaciones/CapacitacionesPage.tsx` + `CapacitacionModal.tsx` · `pages/asistencia/RegistroAsistenciaPage.tsx`
  · `App.tsx` rutas + `Layout.tsx` sección SST + `useRole.esSst` · verificación final (build raíz, tests×3, node dist).
  Plan actualizado: `C:\Users\Leonardo\.claude\plans\tranquil-shimmying-abelson.md` (§6 con checkboxes de progreso).
- **Pendiente = ACCIÓN HUMANA:** aplicar `0007`/`0008` a Supabase vía MCP cuando el web esté listo.

### 2026-06-26 — Sesión 22: Módulo Capacitaciones — web completo (hooks + páginas + QR + ruta pública)

- **Módulo Capacitaciones web COMPLETO** (continuación de Sesión 21). Skills activas: `design-taste-frontend` +
  `engineering-skills:senior-fullstack`. Política lean (sin tests nuevos — cambio presentacional + hooks de datos ya cubiertos
  por backend; typecheck es el gate). **Sin commits** (constraint respetado).
- **`npm install qrcode.react --workspace=apps/web`** → `qrcode.react@^4.2.0` añadido como depedencia.
- **hooks COMPLETOS:**
  - `hooks/useCapacitaciones.ts` (nuevo): `useCapacitaciones(filtro)` (lista paginada) · `useCapacitacionDetalle(id)` (enabled:!!id) ·
    factory `useMutacionCapacitacion` · `useCrearCapacitacion` · `useEditarCapacitacion` · `useAbrirRegistro` · `useCerrarRegistro`.
    Todas las mutaciones invalidan la clave `"capacitaciones"`.
  - `hooks/useRegistroAsistencia.ts` (nuevo): `useCapacitacionPublica(token)` (sin auth, retry:false) ·
    `useRegistrarAsistencia(token)` (mutación idempotente sin auth). Función helper `apiPublico` sin bearer.
- **páginas COMPLETAS:**
  - `pages/capacitaciones/CapacitacionesPage.tsx` (nuevo): listado con `Buscador`+`FiltroEstado`+`FiltroAmbito` (server-driven por
    searchParams) + formulario "Nueva capacitación" (grid con título/ámbito-condicional/fechas/lugar/instructor/horas/descripcion) +
    `FilaDesplegable` por capacitación con monograma de ámbito + pill de estado + `<GestionCapacitacion>` + `<Outlet/>` modal.
  - `pages/capacitaciones/GestionCapacitacion.tsx` (nuevo): dl de metadata (fechas, lugar, instructor, horas, descripcion) + acciones
    "Abrir registro" / "Cerrar registro" gateadas por `puedeGestionarAmbito(rol,ambito)` + link "Ver detalle y QR" + `ExportarButton`
    (descarga blob CSV).
  - `pages/capacitaciones/CapacitacionModal.tsx` (nuevo): abre el detalle vía `useCapacitacionDetalle(id)`, envuelto en `Modal`.
    Sección QR: `<QRCodeSVG value={urlRegistro} size={160} fgColor="#142943" level="M" />` + URL + `CopiarButton`
    (`navigator.clipboard.writeText`) + avisos de estado BORRADOR/CERRADO. Tabla de asistentes (nombre · documento · tipo de vínculo
    · fecha). `BASE_WEB = import.meta.env.VITE_WEB_URL ?? window.location.origin`.
  - `pages/asistencia/RegistroAsistenciaPage.tsx` (nuevo): página pública sin auth (ruta `/asistencia/:token` fuera del
    `<Layout>`). `PantallaBase` institucional (logo header · max-w-lg · footer). Máquina de estados: loading → error / BORRADOR /
    CERRADO → `FormularioAsistencia`. Formulario: nombre(req) · documento(req) · correo(opt) · dependencia(opt) · tipoVinculo
    (radio PLANTA/CONTRATISTA/EXTERNO). Confirmación: `ok` ("Asistencia registrada") · `ya-existia` ("Ya registrado") · `error`.
    Idempotencia por documento (el backend usa `onConflictDoNothing`).
- **`useRole.ts`:** añadido `esSst: rol === "SST"` (ya reflejado en el árbol desde sesiones previas).
- **`App.tsx`:** ruta pública `/asistencia/:token` (antes de `<Layout>`) + ruta protegida `/capacitaciones`
  (SA+TH+SST) con hijo `:id` → `<CapacitacionModal>`.
- **`Layout.tsx`:** ícono `graduation` añadido (24×24, `currentColor`). Sección "Formacion" con item Capacitaciones para SA, TH
  y nueva rama SST (sidebar acotado solo con su sección). `routeLabels` actualizado.
- **`shared/permisos.ts`:** `rutaInicialPorRol` ya tenía `case "SST": return "/capacitaciones"` — no se tocó.
- **Verificación final (todo verde):** shared **152/152** · backend **140 pass + 2 skip** · web typecheck limpio + **9/9** ·
  `npm run build` raíz **exit 0 SIN warnings** (chunks lazy: react-vendor, data-vendor, Recharts, qrcode). **Working tree SIN commitear.**
- **Pendiente = ACCIÓN HUMANA:** (1) aplicar `0007`/`0008` a Supabase vía MCP · (2) smoke E2E: SST aterriza en `/capacitaciones`,
  SA/TH ven sección "Formación" en sidebar, crear capacitación → abrir registro → QR aparece en modal → escanear QR desde móvil →
  formulario público → "Asistencia registrada" → mismo documento → "Ya registrado" → exportar CSV → CI/AREA → 403 en endpoints
  de capacitaciones · (3) confirmar que `VITE_WEB_URL` está en el `.env` del backend para que la URL del QR sea la correcta en
  producción (si no, cae a `window.location.origin` que también funciona en dev).

### 2026-06-26 — Sesión 23: Cacería de bugs (multi-agente) — CRÍTICO + IMPORTANTE cerrados + migraciones a prod

- **Cacería adversarial de bugs** (skills `code-review` · `adversarial-reviewer` · `code-reviewer` · `systematic-debugging`):
  3 agentes por capa (`shared`/`backend`/`web`) + investigación de causa raíz. El usuario pidió **atacar CRÍTICO +
  IMPORTANTE en el mismo plan** y exigió **sincronización 100%**. Plan: `ahora-construye-el-plan-agile-coral.md`. **Sin commits.**
- **🐛 BUG REPORTADO RESUELTO — "no crea la capacitación con todos los datos":** la causa raíz **no era código**. Vía MCP se
  descubrió que la BD de prod solo tenía `0004/0005/0006` aplicadas y 5 tablas → **`0007_rol_sst`/`0008_capacitaciones` nunca
  se aplicaron** (pendiente arrastrado de Sesión 21). El `INSERT` reventaba con `relation "public.capacitaciones" does not
  exist`. **Fix:** se aplicaron `0007` (valor enum `SST`) y luego `0008` (enums + tablas `capacitaciones`/`asistencias` con
  `UNIQUE(capacitacion_id, documento)` + RLS sin políticas = deny-directo) vía `apply_migration`. Verificado: ambas tablas
  existen (0 filas, RLS on). Advisors: 2 INFO `rls_enabled_no_policy` (por diseño) + 1 WARN leaked-password (moot, OAuth).
- **CRÍTICO #1 — desincronización de caché (web):** las 3 mutaciones del trámite (`useCambiarEstadoArea`/`useGenerarLiquidacion`/
  `useRegistrarPazYSalvo`) invalidaban `funcionarios/funcionario/mi-area/matriz/metricas` pero **nunca** `archivo`/`expediente`/
  `funcionarios-todos` → `/archivo` y el Panel mostraban datos viejos. **Fix:** helper `invalidarVistasTramite(qc)` en
  `useFuncionarios.ts` que invalida el conjunto completo; usado en las 3 (elimina la deriva inline).
- **IMPORTANTE #2 — rango de fechas:** `terminaEn > iniciaEn` solo lo validaba el form. **Fix:** `.refine` en
  `crearCapacitacionSchema` + `editarCapacitacionSchema` (solo cuando ambas vienen) + validación de **rango fusionado** en el
  caso de uso `editarCapacitacion.ts` (usa `obtenerDetalle` ya cargado; cierra el borde de editar un solo extremo).
- **IMPORTANTE #3 — contrato de `ambito`:** `crearCapacitacionSchema.ambito` era requerido pero el caso de uso ya derivaba para
  TH/SST. **Fix:** `ambito` ahora `.optional()` (revive la rama: TH/SST omiten, SA especifica). Backend sin cambios.
- **IMPORTANTE #4 — edición vacía:** `editarCapacitacionSchema` aceptaba `{}` (PATCH no-op). **Fix:** `.refine` no-vacío.
- **IMPORTANTE #5 — idempotencia del documento:** distintas grafías de la misma cédula ("1.234.567" vs "1234567") creaban filas
  duplicadas. **Fix:** helper puro `normalizarDocumento` en `capacitaciones.ts` (quita espacios/puntos/guiones + mayúsculas) +
  `.transform` en `registrarAsistenciaSchema` → la clave `UNIQUE(capacitacion_id, documento)` usa la forma canónica.
- **Tests de frontera (política lean):** shared schemas (rango crear/editar, ambito opcional, cuerpo vacío, normalización doc) +
  `normalizarDocumento` en capacitaciones + backend `editarCapacitacion` (rango fusionado invertido → 400 / un extremo válido → ok).
- **Verificación (todo verde):** shared **162/162** (+10) · backend **142 pass + 2 skip** (+2) · web typecheck limpio + **9/9** ·
  `npm run build` raíz **exit 0 SIN warnings**. **Working tree SIN commitear** (constraint respetado).
- **MENOR (#6–#13) DIFERIDOS al backlog:** enumeración 403-vs-404 entre ámbitos · `obtenerPorToken` expone BORRADOR ·
  `recomputarEstado` con 0 áreas activas deja PENDIENTE atascado · `iniciales("")` sin fallback · página fuera de rango ·
  tipo de `editar` permite `null` (código muerto) · refresco en vivo de asistentes · `q` sin `.trim()` en filtros.
- **Pendiente = ACCIÓN HUMANA:** smoke E2E (crear capacitación end-to-end ahora que las tablas existen · idempotencia con dos
  grafías del mismo documento · rango fin≤inicio rechazado · cerrar trámite como CI → `/archivo` actualiza sin refrescar) +
  los pendientes históricos abiertos (rediseño Login/Pendiente ya en árbol; deploy; push si se quiere publicar).

### 2026-06-30 — Sesión 24: Arquitectura de Plataforma — diseño aprobado (sin código)

- **Sesión de diseño** (`superpowers:brainstorming`). El usuario pidió formalizar la arquitectura multi-módulo y multi-usuario
  concurrente del sistema. Dos objetivos: **plataforma declarativa** (registro único de módulos que reemplaza referencias
  hardcodeadas en lanzador/sidebar/guards) + **sincronía en vivo** (Supabase Realtime, push browser↔Supabase sin pasar por Vercel).
- **Exploración técnica** (lectura de `permisos.ts`, `domain.ts`, `recomputarEstado.ts`, `funcionarioRepository.ts`, `app.ts`,
  `vercel.json`, `vite.config.ts`): se verificó que la concurrencia multi-área **ya está resuelta** en la BD (lock pesimista +
  recálculo atómico + guarda TOCTOU/idempotencia). No hay nada que "arreglar".
- **Decisiones acordadas:** Approach A (plataforma/módulos declarativa) + sincronía push en vivo. Escala real: 30–40 retiros/mes,
  1–2 personas por área, raramente todas a la vez → no se sobre-ingenieriza (sin Redis global, sin CRDT, sin presencia en tiempo real).
- **Spec escrito y aprobado:** `docs/superpowers/specs/2026-06-30-plataforma-multi-modulo-concurrencia-design.md` — 7 secciones:
  modelo plataforma, registro declarativo `MODULOS[]`, contrato de concurrencia (escrito para no tocar sin TDD), diseño Realtime
  (1 canal por sesión, invalidación TanStack Query por evento, RLS ya filtra), veredicto Vercel (bien configurado; cold start
  mitigable con keep-alive gratuito en `/api/health`), backlog priorizado (P1: `modulos.ts` + Realtime).
- **§11 "Arquitectura de Plataforma"** añadido a este CLAUDE.md como sección permanente.
- **Sin código.** Working tree SIN modificar (ningún archivo de `apps/` o `shared/` tocado esta sesión).
- **Próximo:** invocar `writing-plans` → plan de implementación para P1 (`shared/src/modulos.ts` + `lib/realtime.ts` en `AuthContext`)
  → ejecutar en sesión nueva. Sin commits hasta que el usuario lo pida.

### 2026-06-30 — Sesión 25: P1 de la Arquitectura de Plataforma — registro declarativo de módulos + Supabase Realtime

- **Ejecución del backlog P1** del spec `2026-06-30-plataforma-multi-modulo-concurrencia-design.md` (skill `engineering-architecture-pro`,
  modo DESIGN: archivos nuevos + ediciones quirúrgicas; política lean → tests solo en la lógica pura nueva). **Sin commits** (constraint).
- **✅ TAREA 1 — Registro declarativo de módulos:**
  - **shared** `src/modulos.ts` (nuevo, puro): interfaz `Modulo` (`id`/`nombre`/`icono`/`rutaBase`/`nota`/`rolesQueVen[]`/`estado`),
    array `MODULOS` (paz-y-salvo + capacitaciones ACTIVO · reportes + organigrama PROXIMO) y `modulosParaRol(rol)`. Barrel actualizado.
    **+8 tests** (`tests/modulos.test.ts`: ids únicos, invariantes de forma, filtrado y orden por rol) → shared **170/170**.
  - **web** `pages/panel/ModuleLauncher.tsx` **reescrito** para consumir `modulosParaRol(rol)` en vez de listas inline: props
    `{esSuperadmin,oficina}` → **`{rol}`**; cada módulo activo usa su propio ícono y `nota`; Paz y Salvo es **role-aware** (destino =
    `rutaOficinaPorRol(rol)`, el resto usa `rutaBase`). **Bug corregido de paso:** los módulos "Próximamente" eran "Contratación/
    Bienestar" (no existían en el spec) → ahora "Reportes/Organigrama". `PanelControlPage`: nuevo `rolEfectivo = rol ?? "SUPERADMIN"`,
    los 2 call sites pasan `rol={rolEfectivo}`, y `ErrorPanel` recibe `rol` (la prop `oficina` se conserva: la usan `PanelHeader`/`FlujoTramite`).
- **✅ TAREA 2 — Supabase Realtime (sincronía en vivo):**
  - **web** `lib/realtime.ts` (nuevo): `suscribirRealtime(qc)` abre **1 canal `plataforma-sync`** suscrito a `postgres_changes` de
    `funcionarios` y `aprobaciones`; cada evento invalida el conjunto de vistas del trámite en TanStack Query (`funcionarios`,
    `funcionarios-todos`, `metricas`, `matriz`, `mi-area`, `archivo`, y `funcionario/<id>` por payload). WebSocket directo
    browser↔Supabase (no pasa por Vercel); RLS ya filtra qué filas recibe cada rol. Devuelve cleanup (`removeChannel`).
  - **web** `context/AuthContext.tsx`: `useEffect` nuevo ligado a `usuario?.id`/`usuario?.estado` que suscribe solo si hay usuario
    **ACTIVO** y limpia al cambiar de identidad / logout / desmontaje. Usa el singleton `queryClient`. CSP de `vercel.json` ya incluía `wss://*.supabase.co`.
- **Verificación final (todo verde):** shared **170/170** (+8) · backend **142 pass + 2 skip** · web typecheck limpio + **9/9** ·
  `npm run build` raíz **exit 0 SIN warnings** (chunks lazy intactos). **Working tree SIN commitear** (constraint respetado).
  Sin tocar backend, BD, `estado.ts` ni las transacciones de concurrencia.
- **Pendiente = ACCIÓN HUMANA:** smoke E2E del Realtime — abrir 2 sesiones (p. ej. SA y un AREA), mover un área en una y confirmar
  que la otra refetcha sin recargar; verificar que el canal se cierra al cerrar sesión. P2 keep-alive UptimeRobot → `/api/health`
  (config externa, sin código). Pendientes históricos abiertos (deploy, push si se quiere publicar).

### 2026-06-30 — Sesión 26: Herramienta de dev — impersonación de rol (experimentar UI/UX por rol)

- **Petición del usuario:** poder cambiar de rol temporalmente para experimentar la UI/UX de cada encargado (probó como
  **AREA · Activos Fijos**), dejando la cuenta de **Admin guardada**. Primero se rectificó el flujo del rol AREA al entrar
  (aterriza en `/paz-y-salvo/mi-area` → sidebar de una sección "Operación" → cola de visto bueno de SU dependencia →
  acciones Aprobar/No aplica/Rechazar/Devolver; **no** ve la ficha completa, eso es supervisión SA/TH/CI).
- **Enfoque elegido — impersonación frontend (reversible, sin tocar la cuenta real):** el JWT real sigue SUPERADMIN → el
  backend autoriza todo (un SA puede consultar la cola de cualquier área y ejecutar cualquier acción) → los datos se cargan
  reales. Solo se reescribe el `usuario` **efectivo** (rol + área) que ve la UI; toda la cadena (Layout sidebar, `useRole`,
  `ProtectedRoute`, `RootRedirect`, `MiAreaPage`) se comporta idéntico a como lo vería ese rol. **Caveat consciente:** las
  acciones impactan la BD real (no es sandbox); es un banco de pruebas de experiencia.
- **Implementación (3 archivos, política lean → sin tests nuevos, cambio presentacional/infra de contexto):**
  - `context/AuthContext.tsx` **reescrito**: estado interno `usuarioReal` (backend) + `impersonacionRaw` (de sessionStorage
    `pys_impersonacion`); `usuario` efectivo vía `useMemo` (`{...usuarioReal, rol, areaId}` solo si el real es SUPERADMIN —
    guarda contra entradas huérfanas); nuevos del contrato: `usuarioReal`, `impersonacion`, `impersonar(rol, areaId?)`,
    `detenerImpersonacion()`. El `useEffect` de Realtime se religó a `usuarioReal?.id/estado` (la impersonación no cambia la
    identidad de la sesión). `logout` limpia la impersonación. `impersonar`/`detener` invalidan todas las queries.
  - `components/dev/RoleSwitcher.tsx` **(nuevo)**: pastilla flotante abajo-derecha, **visible solo si `usuarioReal.rol ===
    "SUPERADMIN"`**. Verde = Admin, dorada = impersonando. Menú: TH · CI · AREA (→ submenú con la lista de áreas de
    `useAreas`, muestra `#orden`) · SST · "← Volver a Admin". Al elegir, navega al aterrizaje del rol (`rutaInicialPorRol`).
    Sello respetado (navy `#0b1324` + oro discreto + hairlines).
  - `App.tsx`: `<RoleSwitcher/>` montado dentro de `BrowserRouter` (junto al `Toaster`) para que `useNavigate` funcione.
- **Verificación (todo verde):** shared build OK · web typecheck limpio + **9/9** · `npm run build` raíz **exit 0 SIN
  warnings**. Sin tocar backend, BD, `estado.ts` ni `shared`. **Working tree SIN commitear** (constraint respetado).
- **Findings del hook impeccable** en `index.css` (L206 `rgba(254,252,248,0.94)`, L255 `Sfmono-Regular`) = preexistentes del
  Sello, ajenos a este cambio; no se tocaron.
- **Pendiente = ACCIÓN HUMANA:** probar en `dev:web` (:5173, con `dev:api` en :3000) — entrar como Admin → pastilla → AREA →
  Activos Fijos → ver la app como ese encargado → "Volver a Admin". Pendientes históricos abiertos (Realtime E2E, deploy, push).

### 2026-06-30 - Sesion 27: Theming global light/dark

- **Plan ejecutado:** `C:\Users\Leonardo\.claude\plans\rustling-growing-hamming.md` sobre `main`, sin worktree y sin commits.
- **Spec:** `docs/superpowers/specs/2026-06-30-theming-light-dark-design.md`.
- **Infra:** `ThemeProvider` + `useTheme`, storage `pys_theme`, anti-FOUC en `index.html`, `darkMode: "class"` y toggle en sidebar/header.
- **Tokens:** CSS variables RGB semanticas (`bg/surface/card/foreground/muted/border/...`), estados y rampas `silver`/`estado.*` theme-aware, compatibilidad dark para superficies heredadas.
- **Retrofit:** componentes UI base, auth, panel/charts, matriz, areas y usuarios migrados a tokens semanticos donde el cambio era seguro; chrome navy de sidebar/RoleSwitcher se conserva por identidad de marca.
- **Limpieza prudente:** no se borro codigo sin evidencia de desuso; se evitaron cambios en backend/BD y no se tocaron transacciones ni dominio.
- **Verificacion:** se hizo RED/GREEN acotado de `ThemeContext.test.tsx` antes de la pausa. Los gates finales quedaron bloqueados porque el aprobador rechazo la escalacion por falta de creditos del workspace. Repetir cuando haya creditos: `npm run build --workspace=shared`, `npm run typecheck --workspace=apps/web`, `npm run test --workspace=apps/web`, `npm run test --workspace=shared`, `npm run build`.

### 2026-07-01 — Sesión 28: Módulo "Administración de Personal" v1 — backend Fases 0–2 (pausa)

- **Origen:** correo de la Jefa de TH (Laura Andrea Armenta Vásquez, "PROPUESTA VISUALIZACIÓN APP") → llevar el ciclo de
  vida del empleado a la plataforma (hoy la app solo resuelve la SALIDA vía Paz y Salvo). Sesión de brainstorming +
  `writing-plans` previa dejó el plan aprobado `C:\Users\Leonardo\.claude\plans\replicated-churning-dahl.md`. Esta sesión =
  ejecución de las Fases 0–2 (backend/datos), luego **pausa pedida por el usuario**. Skills activas: `engineering-architecture-pro`
  (modo DESIGN), `ui-ux-pro-max` (referencia, no se tocó web). Política lean. **Sin commits** (constraint).
- **Decisión de arquitectura (la clave):** **"una tabla, dos proyecciones"**. `funcionarios` deja de ser solo "personas en
  trámite" y pasa a ser el **maestro de empleados**. `Funcionario` (trámite, `fecha_retiro NOT NULL`) **NO se modifica**; se
  añade `Empleado` (maestro, todas las filas, `fechaRetiro` nullable). Un empleado nace **ACTIVO** (`fechaRetiro=null`, sin
  aprobaciones → invisible a Paz y Salvo); **"Finalizar contrato" es el PUENTE** que lo entrega a la máquina de estados
  intacta. El riesgo de integración se cierra con un **SCOPING aditivo** `fecha_retiro IS NOT NULL` en las lecturas de
  supervisión. Alcance v1 = Núcleo + Puente; "Otro sí" ligero (cargo/extensión); 360° (salarial/familia/formación/escalafón)
  → **fase 2** (requiere RLS de datos sensibles). Rediseño visual v2 = spec aparte (datos primero, misma paleta/ADN).
- **✅ Fase 0 (shared) COMPLETA:** `domain.ts` +`Empleado`/`Novedad`/`EmpleadoDetalle`/`FiltroEmpleados` + enums
  `TipoVinculacion`/`EstadoVinculacion`/`NovedadTipo` (`Funcionario` intacto). `personal.ts` (nuevo, puro):
  `estadoVinculacion(f)` (ACTIVO⟺fechaRetiro null · RETIRADO⟺PAZ_Y_SALVO · si no EN_RETIRO). `ui.ts`: `estadoVinculacionPill`/
  `tipoVinculacionBadge`/labels (Semáforo Único, tokens del Sello). `schemas.ts`: `crearEmpleadoSchema` (`.strict`,
  tipoVinculacion requerido, fechas ISO `yyyy-mm-dd` por regex), `editarEmpleadoSchema` (`.strict`+refine no-vacío, nullable
  para borrar), `finalizarContratoSchema`, `registrarNovedadSchema` (`z.discriminatedUnion` por tipo), `filtroEmpleadosSchema`.
  Barrel + `personal.test.ts` **+16 tests → shared 186/186**.
- **✅ Fase 1 (BD) COMPLETA en código:** migración `supabase/migrations/0009_administracion_personal.sql` (**escrita, NO
  aplicada a prod**): enums `tipo_vinculacion`/`novedad_tipo`, `alter fecha_retiro drop not null`, +5 columnas núcleo
  (`tipo_vinculacion`, `fecha_ingreso` date, `fecha_fin_contrato` date, `correo_institucional`, `telefono`), índice
  `funcionarios_fecha_retiro_idx`, tabla `novedades` (append-only, FK cascade + índice) con RLS deny-directo. Schema Drizzle
  `schema.ts` reflejado 1:1 (`fechaRetiro` sin `.notNull()`, 2 enums, 5 columnas, tabla `novedades`).
- **✅ Fase 2 (puerto + repo + scoping) COMPLETA y verificada:** `FuncionarioRepo` +6 métodos. `funcionarioRepository.ts`:
  `mapEmpleado`/`mapNovedad`; `crearEmpleado` (pre-chequeo de documento único → `ErrorValidacion`; inserta ACTIVO);
  `editarEmpleado` (patch parcial, `null` borra opcional); **`finalizarContrato`** (en `db.transaction`: UPDATE condicionado a
  `fecha_retiro IS NULL` = guarda TOCTOU → 400 si ya estaba en trámite / 404 si no existe; backfill de aprobaciones PENDIENTE
  para áreas ACTIVAS con `onConflictDoNothing`; `recomputarEstado` — reusa la máquina de estados sin tocarla);
  `registrarNovedad` (tx: aplica cargo/fechaFin + inserta novedad append-only + devuelve `EmpleadoDetalle`);
  `listarEmpleadosPaginado` (q ILIKE nombre/documento + `tipoVinculacion` + `vinculoEstado` traducido a predicado sobre
  `fecha_retiro`/`estado_global`, orden alfabético); `obtenerEmpleado` (empleado + novedades DESC). **SCOPING crítico:**
  `isNotNull(funcionarios.fechaRetiro)` añadido a `listarFuncionariosPaginado` (la matriz lo hereda por reuso) y a
  `obtenerMetricas` → un empleado ACTIVO no aparece en la supervisión ni infla el panel. `listarFuncionarios()` sin paginar =
  sin llamadores (no requirió scoping).
- **Verificación:** shared **186/186** · backend `tsc` **limpio** + **142 pass + 2 skip** (los 2 skip = integración con BD,
  gated). **Working tree SIN commitear.**
- **🔵 PRÓXIMA SESIÓN — retomar en Fase 3:** casos de uso `application/personal/*` (crear/editar/finalizarContrato/
  registrarNovedad/listarEmpleados/obtenerEmpleado, guarda `exigirRol("SUPERADMIN","TALENTO_HUMANO")`) + barrel +
  `container.ts` (cablear los 6 con `funcionarioRepository`) + `personalController` (Zod→400, patrón `funcionariosController`) +
  `personal.routes.ts` bajo `requireAuth,requireActivo,requireRol(SA,TH)` montado en `/api/personal` en `app.ts` + tests de
  frontera (403 CI/AREA/SST, puente feliz ACTIVO→trámite con backfill+estadoGlobal, TOCTOU 2º intento→400, scoping). Luego
  **Fases 4–7** (web + ETL import del Excel real). **Encargos del usuario abiertos:** (1) consolidar/oficializar el
  **diccionario de datos** (columnas/formatos/estructura/esquema) en `docs/`; (2) **auditar/limpiar** código muerto/columnas
  sin uso en BD y sistema (con evidencia, sin borrar a ciegas). **Decisión humana:** aplicar `0009` a prod vía MCP (requiere
  OK explícito). Arranque: `npm run build --workspace=shared` primero.

### 2026-07-01 — Sesión 29: Módulo "Administración de Personal" v1 — backend Fase 3 completa (casos de uso + HTTP)

- **Continuación de la Sesión 28**, retomando exactamente en Fase 3 según lo dejado en §8/§10. Skills activas:
  `engineering-skills:senior-backend`, `senior-frontend`, `senior-fullstack`, `design-taste-frontend` (las 3 primeras
  aplicadas; la de frontend/diseño queda lista para las Fases 4–7). Estudio previo del plan + patrón `areas` (más simple que
  `capacitaciones`) antes de tocar código, confirmado con el usuario. Política lean. **Sin commits** (constraint).
- **`application/personal/` (6 casos de uso nuevos), patrón idéntico a `areas`:** `crearEmpleado`, `editarEmpleado`,
  `finalizarContrato` (recibe `fechaRetiro` + delega `actor.nombre ?? actor.email` como autor al repo),
  `registrarNovedad` (mismo patrón de autor), `listarEmpleados`, `obtenerEmpleado` (404 vía `ErrorNoEncontrado` si el repo
  devuelve `null`, espejo de `obtenerDetalle`). Los 6 con `exigirRol(actor, ["SUPERADMIN","TALENTO_HUMANO"])`. Barrel
  `application/index.ts` +6 exports.
- **Capa HTTP:** `interface/container.ts` cablea los 6 con `funcionarioRepository`. `interface/controllers/
  personalController.ts` (nuevo, Zod→400 vía `safeParse`+`ErrorValidacion`, `String(req.params.id)` — mismo patrón que
  `capacitacionesController`/`funcionariosController`). `interface/routes/personal.routes.ts` (nuevo): todo el router bajo
  `requireAuth, requireActivo, requireRol("SUPERADMIN","TALENTO_HUMANO")` (guarda de ruta + guarda del caso de uso,
  defensa en profundidad). Rutas: `GET /` listar · `POST /` crear (201) · `GET /:id` detalle · `POST /:id` editar ·
  `POST /:id/finalizar-contrato` puente · `POST /:id/novedad` otro sí. Montado en `app.ts` como `/api/personal`.
- **`tests/personal.test.ts` (nuevo, +27 tests, política lean — solo frontera):** 403 para CI/AREA/SST en los 6 casos de uso
  (`it.each`, patrón de `areas.test.ts`); delegación exacta de argumentos al repo (incl. `finalizarContrato`/
  `registrarNovedad` pasando el `autor` correcto desde `actor.nombre`); transición feliz de `finalizarContrato`
  (ACTIVO→`{estadoGlobal:"PENDIENTE", hayRechazo:false}`); **TOCTOU**: el repo mockeado rechaza con `ErrorValidacion` en un
  segundo intento y el caso de uso la propaga sin envolverla; `obtenerEmpleado` 404 si el repo devuelve `null`. No se
  reprobó el scoping de Fase 2 (ya cubierto por sus propios tests de repo, sigue verde).
- **Fricción menor resuelta:** 4 errores de tipos en `personalController.ts` (`req.params.id` es `string | undefined` en
  este `tsconfig`) — mismo fix que el resto de controllers: `String(req.params.id)`.
- **Verificación (todo verde):** `npm run build --workspace=shared` OK · `npx tsc --noEmit` backend limpio ·
  `npm run test --workspace=shared` **186/186** (sin cambios, Fase 3 es solo backend) · `npm run test --workspace=apps/
  backend` **169 pass + 2 skip** (142 previos + 27 nuevos) · `npm run build --workspace=apps/backend` exit 0 ·
  `node apps/backend/dist/interface/serverless.js` carga el bundle y falla únicamente por `.env` ausente en esta sesión
  (`DATABASE_URL`/`SUPABASE_URL` requeridas) — confirma que el ESM/build de Fase 3 está sano. **Working tree SIN
  commitear** (constraint respetado). No se tocó `estado.ts`, `recomputarEstado.ts`, la migración `0009` (sigue sin
  aplicar a prod) ni `apps/web`.
- **Backend de "Administración de Personal" queda funcionalmente completo y testeable por HTTP** (falta solo `.env` real +
  aplicar la migración `0009` para probarlo end-to-end contra la BD).
- **🔵 PRÓXIMA SESIÓN — retomar en Fase 4 (web):** ver el bloque §8 actualizado — `apiPersonal`+`usePersonal.ts` (exportar
  `invalidarVistasTramite` desde `useFuncionarios.ts`) → Fase 5 (registro de módulo + rutas + nav) → Fase 6 (páginas) →
  Fase 7 (ETL). Mismos encargos abiertos del usuario (diccionario de datos, auditoría de código muerto) y misma decisión
  pendiente (aplicar `0009` a prod vía MCP, requiere OK explícito). Arranque: `npm run build --workspace=shared` primero.

### 2026-07-01 — Sesión 30: Módulo "Administración de Personal" v1 — Fases 4 y 5 (web: datos + registro/rutas/nav)

- **Continuación de la Sesión 29**, retomando en Fase 4 según §8/§10. El usuario pidió Fase 4 + Fase 5 "en circuito
  sincronizado, completo y limpio" (sin rutas rotas ni piezas a medias) y reporte al cierre de Fase 5. Estudio previo de
  `lib/api.ts`, `useFuncionarios.ts`, `hooks/useCapacitaciones.ts`, `shared/src/modulos.ts`, `Icon.tsx` (dash y Layout),
  `App.tsx`, `Layout.tsx` y `useRole.ts` antes de tocar código. **Sin commits** (constraint).
- **Fase 4 (datos):** `apiPersonal` nuevo en `lib/api.ts` (listar/detalle/crear/editar/finalizarContrato/registrarNovedad,
  mismo patrón que `apiFuncionarios`/`apiCapacitaciones`). `invalidarVistasTramite` en `useFuncionarios.ts` pasó de privado
  a **exportado**. `hooks/usePersonal.ts` nuevo: `usePersonal`/`useEmpleadoDetalle`/`useCrearEmpleado`/`useEditarEmpleado`/
  `useRegistrarNovedad` (invalidan `"personal"`) y **`useFinalizarContrato`** (invalida `"personal"` **+** llama
  `invalidarVistasTramite` — el puente crea un trámite, así que también deben refrescar catálogo/mi-área/matriz/métricas/
  archivo, igual que las 3 mutaciones del trámite en Paz y Salvo).
- **Fase 5 (registro + rutas + nav):** fila `{id:"personal", nombre:"Administración de Personal", icono:"users",
  rutaBase:"/personal", rolesQueVen:[SA,TH], estado:"ACTIVO"}` en `shared/src/modulos.ts` insertada tras `capacitaciones`
  (orden preservado, tests `modulos.test.ts` siguen en **8/8** sin tocarlos — el ícono `users` **ya existía** en
  `dash/Icon.tsx`, no hizo falta añadirlo). `App.tsx`: ruta `/personal` (`ProtectedRoute` SA+TH) con hija `:id`→
  `EmpleadoModal` (hereda la guarda vía `Outlet`, mismo patrón que `/archivo` y `/capacitaciones`). `Layout.tsx`: ícono
  nuevo `badge` (tarjeta con foto, misma familia 24×24/`currentColor` que el resto) + ítem "Administracion de personal" en
  la sección Administración para **SA y TH** + `routeLabels`.
- **Desviación deliberada (justificada por "circuito completo y limpio"):** el plan reservaba las páginas para Fase 6, pero
  la ruta `/personal` de Fase 5 exige un elemento real — un stub tipo "en construcción" habría violado el patrón ya
  abandonado en Sesión 11. Se adelantó una porción **lean** de Fase 6: `pages/personal/PersonalPage.tsx` (catálogo
  URL-driven en un solo archivo, mismo patrón que `CapacitacionesPage`: `Buscador` + `ChipFiltro` de tipo/estado de
  vinculación + `FilaDesplegable` con `Avatar`+`estadoVinculacionPill` + `Paginación` + formulario "Registrar empleado"
  inline + `Outlet`) y `pages/personal/EmpleadoModal.tsx` (ficha núcleo + historial de novedades + **Finalizar contrato**
  con confirmación inline irreversible [puente a Paz y Salvo, enlaza a la oficina del rol vía `rutaOficinaPorRol`] +
  **Otro sí** con confirmación inline [`CAMBIO_CARGO`/`EXTENSION_CONTRATO`]). Ambas reusan `estadoVinculacion`/
  `estadoVinculacionPill`/`TIPO_VINCULACION_LABEL`/`NOVEDAD_TIPO_LABEL` de `@pys/shared` sin duplicar lógica. **Queda
  fuera** (Fase 6 real, próxima sesión): separar `RegistrarEmpleadoForm`/`AccionesEmpleado`/`FichaEmpleado` en archivos
  propios si el archivo crece, UI de `useEditarEmpleado` (edición inline del núcleo — el hook existe, sin consumidor
  todavía), spot illustration propia del estado vacío (hoy reusa `SpotSinResultados` de capacitaciones).
- **Verificación final (todo verde):** shared **186/186** (incl. `modulos.test.ts` 8/8 intactos) · backend sin tocar
  (169 pass + 2 skip) · web typecheck limpio + **10/10** (9 previos + `ThemeContext.test.tsx` de Sesión 27, ya existente)
  · `npm run build` raíz **exit 0 SIN warnings** (bundle en chunks lazy, el inicial no creció). **Working tree SIN
  commitear** (constraint respetado). No se tocó backend, BD, `estado.ts`, `recomputarEstado.ts` ni la migración `0009`.
- **Pendiente = ACCIÓN HUMANA:** smoke E2E — registrar empleado (aparece ACTIVO) → Finalizar contrato (aparece en Paz y
  Salvo, oficina TH/CI según rol) → Otro sí registra la novedad en el historial → nav "Administracion de personal"
  visible solo para SA/TH. **Próxima sesión:** cerrar Fase 6 (pulido de las páginas ya adelantadas) → Fase 7 (ETL del
  Excel real). Encargos abiertos: diccionario de datos, auditoría de código muerto. Decisión pendiente: aplicar `0009` a
  prod vía MCP (requiere OK explícito).

### 2026-07-01 — Sesión 31: Módulo "Administración de Personal" v1 — Fases 6 y 7 CERRADAS, migración 0009 y ETL en PRODUCCIÓN

- **Cierre completo del módulo** (continuación directa de la Sesión 30, ejecutando el checklist exacto de CLAUDE.md §8 +
  `administracion-personal.md`). Skills activas: `design-taste-frontend`, `ui-ux-pro-max`, `senior-frontend`. **Sin
  commits** (constraint del proyecto); la BD de producción sí quedó modificada, con autorización explícita del usuario
  vía `AskUserQuestion` antes de tocarla (el clasificador de seguridad bloqueó el primer intento por ser una autorización
  genérica "aplica todo para producción" — se repreguntó nombrando la migración exacta y se procedió tras el sí explícito).
- **Fase 6 (pulido de páginas) COMPLETA** — los 6 puntos del checklist, en orden: `CatalogoPersonal.tsx` extraído de
  `PersonalPage.tsx` (que quedó wrapper delgado, patrón `FuncionariosPage`→`CatalogoFuncionarios`) · `RegistrarEmpleadoForm.tsx`
  extraído tal cual · `FichaEmpleado.tsx` extraído de `EmpleadoModal.tsx` (que quedó wrapper `Modal`+`<FichaEmpleado/>`,
  patrón `ExpedienteModal`) · `AccionesEmpleado.tsx` con `FinalizarContrato`+`OtroSi` extraídos **+ acción nueva
  "Actualizar datos"** (`useEditarEmpleado`, ya existía sin consumidor desde la Sesión 30 — mismo patrón de confirmación
  inline toggle que las otras dos: campos núcleo editables, `null` para borrar opcionales, `ApiError`→mensaje,
  `toast.success`) · `SpotSinEmpleados` nuevo en `Spots.tsx` (carné con "+", mismo lenguaje SVG 120px navy+oro que los
  3 spots existentes) reemplaza el `SpotSinResultados` prestado de Capacitaciones · sin imports huérfanos tras los splits.
- **Fase 7 (ETL) COMPLETA** — `scripts/importarEmpleados.ts` (nuevo, raíz del repo, con dry-run por defecto y flag
  `--aplicar`): lee las 4 hojas reales de `Base de datos 2026 th - copia.xlsx` (confirmado que seguía en `Downloads`).
  **Hallazgos de la inspección real del Excel** (no asumidos del plan): hoja consolidada se llama `"Base de datos "`
  (con espacio trailing) y usa fechas en formato US M/D/Y, mientras ADM/ACD/ops usan D/M/Y o prosa española/inglesa
  mezclada (`"30 de November de 2026"`) — el parser de fechas soporta ambos formatos por hoja + serial de Excel. Mapeo
  `tipoVinculacion` implementado exactamente como especificaba el plan (ADM/ACD/ops fijo, consolidada por columna
  `PROGRAMA`). Dedup por documento normalizado a solo dígitos, consolidada gana. Upsert `ON CONFLICT (documento) ...
  WHERE fecha_retiro IS NULL` — protege a cualquier empleado que ya esté en trámite de Paz y Salvo (no lo sobrescribe).
  Se separaron explícitamente "omitidas" (fila excluida: duplicado/documento inválido/ya en trámite) de "avisos no
  bloqueantes" (fecha no reconocida pero la fila se importa igual) para no ocultar información en el log de supervisión.
  Dependencias `xlsx`, `tsx`, `pg` instaladas como devDependencies en la raíz.
- **Migración `0009_administracion_personal.sql` APLICADA A PRODUCCIÓN vía MCP** — verificado antes (`list_migrations`
  no la listaba) y después (aparece como `20260701204323`). Advisors de seguridad re-corridos tras aplicar: **limpios**
  salvo el `rls_enabled_no_policy` esperado en `novedades` (deny-directo, mismo patrón intencional que `capacitaciones`/
  `asistencias` desde la Sesión 23) y el WARN moot de leaked-password de siempre (OAuth, sin passwords).
- **ETL corrido en modo supervisado contra producción** (`--aplicar`): 543 filas únicas tras dedup (18 omitidas por
  duplicado o documento inválido) → **534 insertadas, 0 actualizados, 0 fallidos** · 9 filas protegidas por el guard
  TOCTOU (`ya en trámite de Paz y Salvo, no se sobrescribe` — eran las 9 del seed original con `fecha_retiro` ya
  poblado) · 49 avisos no bloqueantes de fechas no reconocidas (datos genuinamente sucios del Excel: guiones, celdas
  `#REF!`, columnas desalineadas en algunas filas de ACD — no bugs de parseo, verificado con una query de conteo
  directa: `534 ACTIVO + 9 en trámite = 543 total` en la BD real).
- **Verificación final (todo verde):** shared **186/186** · backend **169 pass + 2 skip** (sin tocar) · web typecheck
  limpio + **10/10** · `npm run build` raíz **exit 0 SIN warnings** · `npm test` raíz (3 workspaces encadenados) sin
  fallos, corrido después de instalar las nuevas devDependencies para confirmar que no rompieron nada. **Working tree
  SIN commitear** (constraint respetado).
- **Módulo "Administración de Personal" v1 queda funcionalmente COMPLETO y en producción** (Fases 0–7 cerradas). Lo que
  sigue ya no es parte de este plan: rediseño visual v2 del Sello (spec aparte), fase 2 del producto (360° con RLS), o
  los encargos abiertos del usuario (diccionario de datos en `docs/`, auditoría de código muerto — ninguno iniciado,
  ninguno asumido).
- **Pendiente = ACCIÓN HUMANA:** smoke E2E con los 534 empleados reales ya en el catálogo — entrar como SA/TH, filtrar,
  abrir una ficha, probar "Actualizar datos", y (con cautela, es irreversible) probar "Finalizar contrato" en un
  registro de prueba, no en un empleado real sin planearlo primero.

### 2026-07-01 — Sesión 32: Personal v2 (Hoja de Vida 360°) — Sprint 0 + Sprint 1 + migración 0010 a PROD

- **Origen:** correo de la Jefa de TH (Laura Armenta, "PROPUESTA VISUALIZACIÓN APP") → llevar el módulo de Personal al
  **expediente 360°** del trabajador. Sesión de análisis (4 tareas + investigación web de HRIS reales) → plan consolidado
  aprobado `C:\Users\Leonardo\.claude\plans\synthetic-wibbling-stroustrup.md` (5 sprints). Skills usadas:
  `design-taste-frontend` (frontend, activada a pedido) + patrón hexagonal existente. Política lean. **Sin commits.**
- **Arquitectura de datos:** núcleo + **tablas satélite** (rompe "una tabla, dos proyecciones" solo para el 360°). El bloque
  **salarial es tabla aparte** (`empleado_salarial`) con **RLS estricta** (SELECT solo SA/TH vía `ve_salarial()`), defensa en
  profundidad de 3 capas (RLS de BD + decisión en caso de uso + UI "restringido"). Campos derivados (edad/antigüedad/grupo
  etario/rango salarial) = funciones puras, nunca columnas.
- **✅ SPRINT 0 (cimientos de datos):** migración `0010_hoja_de_vida_360.sql` (5 enums, +9 columnas contractuales en
  `funcionarios` incl. FK `area_id` con backfill, `foto_path`, 5 tablas satélite). Espejo Drizzle en `schema.ts`. shared:
  tipos (`EmpleadoContractual`/`DatosPersonales`/`Familiar`/`Formacion`/`Experiencia`/`DatosSalariales`/`ExpedienteCompleto`
  con `salarialVisible`) + 5 enums + 6 schemas Zod + 4 derivadas puras en `personal.ts`. **shared 186→199** (+13).
- **✅ SPRINT 1 (expediente en lectura, el salto visual):**
  - **backend:** `FuncionarioRepo.obtenerExpediente(id, incluyeSalarial)` (lee empleado + 5 satélites en paralelo, salarial
    solo si procede, mappers dedicados numeric→number). Caso de uso `obtenerExpedientePersonal` (nombre distinto para no
    chocar con el `obtenerExpediente` del archivo) + helper `veSalarial(rol)`, guarda SA/TH, 404. Ruta
    `GET /api/personal/:id/expediente` (antes de `/:id`). **+6 tests** → backend **169→175 pass + 2 skip**.
  - **shared `ui.ts`:** labels de los 5 enums nuevos + `formatMoneda` (COP).
  - **web:** `apiPersonal.expediente` + `useExpediente`. **`ExpedientePage`** (ruta propia `/personal/:id`): header pegajoso
    (Avatar lg + nombre display + pills estado/tipo vínculo) + navegación por secciones (anclas `scroll-mt`) + 7 secciones
    (Personales·Familia·Formación·Experiencia·Contractual·**Salarial acordonado**·Historial) + Acciones (reusa
    `AccionesEmpleado`). Estados skeleton/error/vacío-por-bloque/**restringido** (candado si el rol no ve salario). Reemplaza
    el modal: se **borraron** `EmpleadoModal.tsx` y `FichaEmpleado.tsx` (huérfanos). `App.tsx` ruta top-level `/personal/:id`;
    `CatalogoPersonal` sin `<Outlet/>`. web **10/10** typecheck limpio.
  - **Decisión abierta marcada:** el router `/api/personal` es SA/TH, así que el expediente NO se expuso a CI/AREA/SST (no se
    ampliaron datos personales/familia a esos roles sin confirmación). La maquinaria de `salarialVisible` quedó completa para
    ampliarlo sin refactor si se decide.
- **✅ MIGRACIÓN `0010` APLICADA A PRODUCCIÓN vía MCP** (autorización explícita del usuario vía `AskUserQuestion` — el
  clasificador bloqueó el primer intento por autorización implícita; se repreguntó nombrando la migración exacta y se procedió
  tras el sí). Verificado antes (`list_migrations` sin 0010, `es_usuario_activo` presente) y después
  (`20260701220829` registrada · 5 tablas satélite · `ve_salarial` · 5 policies · backfill `area_id` = 17/543 por match
  exacto de nombre, resto conserva `area_origen`). **Advisors limpios:** solo el `rls_enabled_no_policy` INFO esperado
  (`asistencias`/`capacitaciones`/`novedades`, deny-directo) + WARN moot leaked-password. **Ningún hallazgo nuevo de 0010.**
- **Verificación final (todo verde):** shared build OK + **199/199** · backend typecheck limpio + **175 pass + 2 skip** ·
  web typecheck limpio + **10/10** · `npm run build` raíz **exit 0 SIN warnings**. **Working tree SIN commitear** (BD de prod
  sí modificada, con autorización). `estado.ts`/`recomputarEstado.ts`/puente `finalizarContrato` **intactos**.
- **🔵 PRÓXIMA SESIÓN — Sprint 2:** captura por bloque (formularios de alta/edición de personales/familia/formación/
  experiencia/salarial, casos de uso CRUD con guarda SA/TH + `ve_salarial` para el salarial) + foto en **Supabase Storage**
  (bucket privado + signed URL, `foto_path`). Luego Sprint 3 (ETL v2 de los 36 campos) + Sprint 4 (export PDF + micro-
  interacciones del puente). Encargos abiertos del usuario siguen: diccionario de datos en `docs/`, auditoría de código muerto.

### 2026-07-02 — Sesión 33: Personal v2 — Sprint 2 (frontend) + Sprint 3 (ETL v2) COMPLETOS, migración 0011 y ETL v2 en PRODUCCIÓN

- **Continuación directa de la Sesión 32.** El backend de Sprint 2 (12 endpoints `/api/personal/*` de captura por
  bloque + infraestructura de Supabase Storage para la foto) ya estaba hecho al retomar (heredado de contexto previo
  a la compactación de esta sesión); se re-verificó verde (tsc limpio + 223 pass + 2 skip) y se construyó el resto:
  **frontend de Sprint 2 completo** + **Sprint 3 (ETL v2) completo y corrido contra producción**. Pausa intermedia
  solicitada por el usuario ("realiza una pausa por favor, segura") honrada en el checkpoint de backend-only; retomada
  con "retoma el hilo y continua". **Sin commits** (constraint); la BD de prod sí quedó modificada esta sesión —
  migración `0011` + datos de 543 empleados — con autorización explícita en cada paso vía `AskUserQuestion`.
- **Sprint 2 frontend:** `apiPersonal` (`lib/api.ts`) extendido con los 12 endpoints nuevos (incl. `UrlSubidaFoto` local
  y `BUCKET_FOTOS_EMPLEADOS`). `usePersonal.ts`: helper `useMutacionBloque` (invalida `["personal"]`, cubre la
  invalidación del expediente por prefijo) + un hook por endpoint + `useSubirFoto` (orquesta pedir URL firmada → `PUT`
  directo del navegador vía `supabase.storage.from(bucket).uploadToSignedUrl` → confirmar con `guardarFoto`, el backend
  nunca ve los bytes) + `useEliminarFoto` + `useFotoUrl` (URL firmada de lectura, `staleTime` 50min < TTL 1h del backend).
  `pages/personal/BloquesEditables.tsx` (nuevo): 7 editores autocontenidos con el patrón de confirmación inline de
  `AccionesEmpleado` — `PersonalesEditor`/`ContractualEditor`/`SalarialEditor` (1-1, se renderizan junto al bloque de
  solo-lectura existente porque cubren campos distintos) y `FamiliaEditor`/`FormacionEditor`/`ExperienciaEditor` (1-N,
  **reemplazan** el bloque de lectura — listan+agregan+eliminan en un solo componente con confirmación de 1 clic para
  eliminar) + `FotoEditor` (reemplaza el `Avatar` fijo del header). `ExpedientePage.tsx`: bloques `BloqueFamilia`/
  `BloqueFormacion`/`BloqueExperiencia` de solo-lectura **eliminados** (dead code tras el reemplazo) + imports podados.
- **Sprint 3 (ETL v2):** `scripts/importarEmpleados.ts` extendido con `leerHojaExtendida`/`dedupExtendido` (mismas 4
  hojas, columnas nuevas) + `aplicarBloquesExtendidos` (escribe con **COALESCE en cada campo** — el Excel solo rellena
  huecos, nunca pisa una edición manual ya hecha desde la UI — y formación **insert-once por empleado**, sin clave
  natural para upsert 1-N). **Fuera de alcance, documentado en el propio script:** familiares (el Excel solo trae un
  conteo `HIJOS` sin nombre — dato insuficiente para un registro real) y experiencia laboral previa (cero columnas de
  historial en las 4 hojas). Ambos quedan para captura manual vía la UI nueva.
- **Bug real atrapado en dry-run, antes de tocar producción:** inspección directa de las 4 hojas (`npx tsx` ad-hoc,
  archivos descartados después) reveló que `ACD` (377 empleados) usa **punto** como separador de miles (`"1.750.905"`)
  mientras `ADM`/consolidada/`ops` usan **coma** (`"1,750,905"`) — confirmado con filas reales, no un error de captura
  aislado. El parser original solo despojaba comas → en ACD, montos con un solo punto se mal-escalaban (`"249.095"` →
  interpretado como `$249.095` en vez de `$249.095` → en realidad `$249,095`... el valor real era **249095 pesos**,
  quedaba mal-escalado ~1000x) y montos con dos puntos (`"1.750.905"`) daban `NaN`→`null` (salario perdido por completo).
  **Fix:** `normalizarDinero` despoja `,` y `.` sin condicionar por hoja (ningún salario en estas 4 hojas usa decimales
  — son pesos colombianos enteros). Re-verificado contra el archivo real: los montos coinciden exactamente con el Excel.
- **Migración `0011_storage_fotos_empleados.sql` aplicada a PROD vía MCP** (bucket privado `fotos-empleados`,
  deny-directo, cero políticas RLS — mismo patrón que `novedades`/`capacitaciones`; solo el backend con service role
  accede). Autorización explícita del usuario vía `AskUserQuestion` nombrando la migración exacta. Verificado
  `list_migrations` antes/después (`20260702135115`) + `get_advisors` limpios (solo los 3 `rls_enabled_no_policy` INFO
  esperados + el WARN moot de leaked-password de siempre — ningún hallazgo nuevo).
- **Corrida real del ETL contra producción:** la primera ejecución (`--aplicar`) se cayó a mitad de camino con
  `Error: Connection terminated unexpectedly` de `pg` (red/pool de Supabase, no un bug del script) tras cubrir
  ~184/534 empleados — se verificó el estado exacto con una consulta directa (`empleado_personales`/`empleado_salarial`/
  `empleado_formacion` counts) antes de decidir el siguiente paso. Como todas las escrituras satélite son idempotentes
  por diseño (COALESCE + insert-once), se **re-corrió el mismo comando sin cambios** y esta vez completó los 534 sin
  caerse, con **0 fallidos** en ambas corridas. **Resultado final verificado en BD:** 534 activos + 9 protegidos en
  trámite (guard `WHERE fecha_retiro IS NULL` intacto) = 543 total · `empleado_personales` 532/534 · `empleado_salarial`
  534/534 · `empleado_formacion` 74 filas en 52/53 empleados esperados (1 corto, severidad baja — bloque suplementario
  editable desde la UI) · campo contractual poblado en 91/534 (esperado — escalafón/modalidad son columnas dispersas,
  solo presentes en algunas hojas del Excel).
- **Verificación final (todo verde):** shared **199/199** · backend **223 pass + 2 skip** · web typecheck limpio +
  **10/10** · `npm run build` raíz **exit 0 SIN warnings**. **Working tree SIN commitear** (constraint respetado).
  `estado.ts`/`recomputarEstado.ts`/puente `finalizarContrato` **intactos** — nada de esto tocó la máquina de estados.
- **Pendiente = ACCIÓN HUMANA:** smoke E2E de captura — abrir `/personal/:id` para un empleado real ya importado,
  confirmar que los datos del ETL se ven correctos en cada bloque, editar un campo desde cada editor (incl. subir/quitar
  foto) y confirmar que persiste tras recargar; confirmar que el bloque salarial sigue oculto para roles ≠ SA/TH.
- **Próxima sesión (si se retoma):** Sprint 4 del plan — export PDF del expediente + micro-interacciones del puente
  "Finalizar contrato". Encargos abiertos del usuario, aún sin iniciar: diccionario de datos en `docs/`, auditoría de
  código muerto en BD y sistema (con evidencia).

### 2026-07-03 — Sesión 34: Cursos & Planificador — Fases 0-2/11 ejecutadas, PAUSA a petición del usuario

- **Origen:** correo/convocatoria de Fiorella Paccini (TH) para una "Reunión de Socialización Plataforma del Plan
  Institucional de Capacitaciones" el **martes 2026-07-07, 10:00am**. El usuario decidió (sesión previa, brainstorming)
  construir un MVP real (no simulado) de dos submódulos nuevos hermanos de Capacitaciones: **Cursos** (pieza insignia:
  crear→publicar→tomar por cédula sin login→completar lección→ver progreso en vivo) y **Planificador** (CRUD simple +
  calendario "año de un vistazo"). Plan completo ya escrito y aprobado en sesión previa:
  `C:\Users\Leonardo\.claude\plans\delegated-baking-corbato.md` (11 fases, 0-10, con tipos/rutas/SQL exactos).
- **Ejecución vía `subagent-driven-development`** (implementer fresco por fase, con brief extraído del plan + revisión
  directa del controlador leyendo el diff real antes de cerrar cada fase — no solo confiando en el reporte del
  implementador). Sin commits salvo pedido explícito.
- **Fase 0** (dominio `shared/`: `cursos.ts`+`planificador.ts`+schemas+labels, +47 tests → shared 240/240) ya estaba
  commiteada de la sesión de arranque (commit `bf35127`).
- **✅ Fase 1 COMPLETA** — `supabase/migrations/0012_cursos.sql` (enum `tipo_contenido_leccion` + tablas
  `cursos`/`curso_modulos`/`curso_lecciones`/`inscripciones`/`progreso_lecciones`, RLS deny-directo) +
  `0013_planificador.sql` (enum `estado_capacitacion_planeada` + tabla `capacitaciones_planeadas`) — **NO aplicadas a
  Supabase**. Espejo en `apps/backend/src/infrastructure/db/schema.ts`: 2 enums + 6 tablas nuevas. El gotcha de Drizzle
  ya documentado en el plan (`unique()` compuesto necesita la forma de 3 argumentos `pgTable(name,cols,(t)=>[...])` o
  `onConflictDoNothing` truena en runtime) se verificó resuelto correctamente en las 4 tablas que lo requieren
  (`cursoModulos`/`cursoLecciones`/`inscripciones`/`progresoLecciones`) — revisado con `git diff` directamente, no solo
  confiando en el reporte.
- **✅ Fase 2 COMPLETA** — backend de gestión autenticada de Cursos: `CursoRepo.ts` (puerto con 13 métodos de gestión;
  **decisión de fasificación deliberada**: los 3 métodos del flujo público — `obtenerPorToken`/`ingresarInscripcion`/
  `marcarLeccionCompletada` — NO se incluyen todavía, quedan para que la Fase 3 extienda la interfaz, así cada fase
  compila y verifica de forma independiente) + `cursoRepository.ts` (mappers + swap-con-sentinela para reordenar
  módulos/lecciones, **scopeado por padre** — a diferencia de `moverArea` que es un catálogo único global, aquí el
  "vecino" se busca filtrando también por `cursoId`/`moduloId` porque `orden` es único por padre, no global — verificado
  correcto en el código real) + 15 casos de uso (`application/cursos/*.ts`, guardas de rol/ámbito, autorización vía
  `obtenerDetalle(cursoId)` antes de cada mutación de módulo/lección, regla nueva de "doble ámbito" en `editarCurso` para
  que ni TH ni SST puedan reasignar un curso fuera de su propio ámbito) + `cursosController.ts` + `cursos.routes.ts`
  (montado `/api/cursos`, `requireAuth+requireActivo` dejado al inicio del router a propósito para que la Fase 3 inserte
  las rutas públicas antes, edición mecánica) + wiring en `application/index.ts`/`container.ts`/`app.ts`. Nueva
  dependencia backend `isomorphic-dompurify` (trae `jsdom` empaquetado) usada en `crearLeccionCurso`/`editarLeccionCurso`
  para sanitizar `contenidoTexto` (HTML de Tiptap) antes de persistir. **+23 tests** en `tests/cursos.test.ts` (guardas
  de rol/ámbito, la regla de doble-ámbito, sanitización verificada por el argumento exacto pasado al mock del repo, no
  solo ausencia de throw, smoke HTTP 401).
- **PAUSA a petición explícita del usuario** ("Actualiza la memoria y finalicemos la sesión, que la siguiente sesión
  retoma desde la fase 3 con total contexto") — justo después de cerrar la Fase 2, antes de dispatchar el implementer de
  la Fase 3. El brief de la Fase 3 ya está redactado (flujo público "tomar el curso por cédula": las 2 transacciones más
  delicadas de toda la feature, `ingresarInscripcion`/`marcarLeccionCompletada`, con el helper compartido
  `construirResultadoIngreso` que arma el mismo payload `IngresoCursoResultado` para ambas — el diseño de "un solo
  viaje" del plan).
- **Persistencia para la continuidad entre sesiones:** el `.superpowers/sdd/progress.md` (ledger, raíz del repo,
  gitignored pero persistente) tiene una entrada por cada fase cerrada. Además, se copiaron TODOS los briefs/reportes de
  fase (incluido el de la Fase 3, listo para dispatch) del scratchpad efímero de esta sesión a
  **`.superpowers/sdd/cursos-planificador/`** (raíz del repo — a diferencia del scratchpad de sesión, este directorio
  sobrevive entre sesiones porque vive en el disco del proyecto, no en el temp de la sesión). La próxima sesión no
  necesita releer el plan completo ni re-redactar el brief de la Fase 3 — puede dispatchar directamente con el brief ya
  persistido.
- **Verificación final de esta sesión (todo verde):** shared build OK · `tsc` backend limpio · `npm run test
  --workspace=apps/backend` → **246 pass + 2 skip** (223 previos + 23 de Cursos, sin regresiones). **Working tree SIN
  commitear** desde la Fase 1 en adelante (constraint respetado). **Ninguna migración aplicada a Supabase** — la
  autorización para `0012`/`0013` se pide explícitamente al usuario recién al final del plan, antes del smoke test de
  la Fase 10 (decisión ya confirmada con él en la sesión de arranque).
- **Próxima sesión — retomar EXACTAMENTE en la Fase 3.** Orden de lectura: `.superpowers/sdd/progress.md` (ledger) →
  `.superpowers/sdd/cursos-planificador/fase-3-brief.md` (ya redactado, dispatchar directo) → tras cerrarla, Fase 4
  (Planificador, backend más simple sin flujo público) → Fases 5-9 (frontend: hooks, UI de gestión de Cursos con Tiptap,
  UI pública "tomar curso", UI del Planificador con calendario de 12 meses, navegación en `Layout.tsx`/`App.tsx`) →
  Fase 10 (verificación final + revisión de rama + **pedir autorización explícita** para aplicar `0012`/`0013` a
  producción antes del smoke test manual de 11 pasos, literal listón de prueba para la demo del martes).

### 2026-07-03 — Sesión 35: Cursos & Planificador — Fase 3 (flujo público) + Fase 4 (Planificador) ejecutadas, backend íntegro

- **Continuación directa de la Sesión 34**, misma fecha calendario. El usuario pidió primero estudiar a fondo lo hecho
  del plan original ("dominio absoluto del contexto + impacto") antes de autorizar — se releyó el ledger completo, el
  brief de Fase 3 ya persistido, y el plan maestro completo (las 11 fases), verificando además contra el código real
  (`CursoRepo.ts`, `cursoRepository.ts`, `cursos.routes.ts`, `application/index.ts`, `container.ts`) que cada referencia
  del brief seguía coincidiendo línea por línea con el estado del working tree. Confirmado el contexto, el usuario
  autorizó explícitamente ("Procede, a cocinar") antes de tocar código.
- **✅ Fase 3 COMPLETA** — flujo público "tomar el curso por cédula", dispatchada con el brief ya redactado en la
  sesión anterior (sin releer el plan completo, tal como estaba previsto). `CursoRepo.ts`/`cursoRepository.ts`
  extendidos con `obtenerPorToken`/`ingresarInscripcion`/`marcarLeccionCompletada` + helper privado
  `construirResultadoIngreso(tx, cursoId, documento)` (el mecanismo concreto del diseño de "un solo viaje": ambas
  transacciones terminan llamándolo y devuelven la misma forma `IngresoCursoResultado`, así el cliente puede reemplazar
  todo su estado local sin merge). `ingresarInscripcion` valida `cursoAccesible` (400 si BORRADOR) y usa
  `onConflictDoNothing` en `(cursoId,documento)` para que "gane el primer nombre escrito" sin ramificación extra;
  actualiza `ultimaActividadEn` siempre, incluso si el curso está CERRADO. `marcarLeccionCompletada` **deliberadamente
  no** valida `cursoAccesible` (BORRADOR es inalcanzable sin inscripción previa; CERRADO debe seguir permitiendo
  completar a quien ya estaba inscrito) pero sí verifica que `leccionId` pertenezca a un módulo de ESE curso vía join
  — sin ese chequeo, un cliente malicioso podría contaminar el progreso de una inscripción con una lección de otro
  curso. 3 casos de uso proxy sin `actor` + `cursosPublicoController.ts` (mirror de `registroPublicoController.ts`) +
  3 rutas públicas (`GET /tomar/:token`, `POST /tomar/:token/ingresar`, `POST /tomar/:token/lecciones/:leccionId/completar`)
  con `rateLimit(10/min)` propio, insertadas antes de `.use(requireAuth, requireActivo)` en `cursos.routes.ts`. +4 tests
  (delegación exacta vía `toBe` + 2 smoke HTTP de rutas públicas sin JWT). **Sin ambigüedades** — todos los nombres de
  helpers internos coincidieron literalmente con el brief. Verificado independientemente por el controlador (no solo el
  reporte): shared build OK · tsc backend limpio · backend **250 pass + 2 skip** (antes 246+2 skip).
- **✅ Fase 4 COMPLETA** — backend del Planificador. A diferencia de Fase 3, su brief **no existía de antemano**; lo
  redactó el propio controlador esta sesión (`.superpowers/sdd/cursos-planificador/fase-4-brief.md`), releyendo primero
  los patrones reales a mirror (`crearCapacitacion.ts`/`editarCapacitacion.ts`/`abrirRegistro.ts` para el patrón "cargar
  → guardar" de autorización por ámbito de la fila ya persistida, `listarCursos.ts` para el ámbito forzado por rol,
  `areas.routes.ts` para un router simple sin rutas públicas, y las columnas reales de la tabla `capacitacionesPlaneadas`
  en `schema.ts`, ya creada desde la Fase 1) antes de escribir código de referencia — mismo nivel de rigor que si
  hubiera venido del plan maestro. `PlanificadorRepo.ts` (puerto) + `planificadorRepository.ts` (repo Drizzle CRUD
  plano de una sola tabla, **sin `db.transaction`** — el Planificador no tiene invariantes multi-tabla que proteger, a
  diferencia de Cursos). 4 casos de uso (`crear`/`listar`/`editar`/`eliminar` CapacitacionPlaneada); `editar`/`eliminar`
  siguen el patrón "cargar → guardar" (sin la guarda de "solo editable en BORRADOR" que sí tiene Capacitaciones — el
  Planificador no tiene esa restricción de ciclo de vida). `planificadorController.ts` + `planificador.routes.ts`
  (montado en `/api/planificador`, todo autenticado desde la primera línea, sin rutas públicas; 4 rutas: `GET /`,
  `POST /`, `PATCH /:id`, `POST /:id/eliminar` — **sin** `GET /:id` porque el payload de la lista ya es autocontenido,
  igual que `AreasPage`; **sin** endpoints dedicados de transición de estado, `estado` se edita vía el PATCH normal,
  decisión ya tomada en el plan maestro). +19 tests. **Ambigüedad resuelta por el implementer:** el brief asumía
  "bloques" de imports por módulo en `container.ts`, pero el archivo real ya tiene un solo import flat alfabetizado de
  todos los módulos — insertó los 4 nombres nuevos en su posición alfabética correcta (consistente con el archivo real).
  Verificado independientemente por el controlador: shared build OK · tsc backend limpio · backend **269 pass + 2 skip**
  (antes 250+2 skip). Diff de `planificadorRepository.ts`/casos de uso/rutas/wiring revisado directamente.
- **PAUSA a petición explícita del usuario** ("Haces pausa al finalizar la fase 4 por favor, que sea segura") —
  justo después de cerrar la Fase 4, con el backend de **ambos** submódulos (Cursos completo incl. flujo público, y
  Planificador completo) ya terminado y verificado. Antes de esta pausa, el usuario también pidió explícitamente
  diferir las actualizaciones de memoria a solo el cierre de sesión ("Actualiza la memoria solo al final de la sesión")
  — aplicado: ninguna actualización de `CLAUDE.md`/memoria se hizo entre la Fase 3 y la Fase 4, todas se batchearon aquí.
- **Verificación final de esta sesión (todo verde):** shared build OK · `tsc` backend limpio · `npm run test
  --workspace=apps/backend` → **269 pass + 2 skip** (223 base → 246 tras Fase 2 → 250 tras Fase 3 → 269 tras Fase 4,
  sin regresiones en ningún punto). **Working tree SIN commitear** desde la Fase 1 en adelante (constraint respetado).
  **Ninguna migración aplicada a Supabase.**
- **Próxima sesión — retomar en la Fase 5** (frontend: cliente API `apiCursos`/`apiCursosPublico`/`apiPlanificador` en
  `lib/api.ts` + hooks `useCursos.ts`/`useTomarCurso.ts`/`usePlanificador.ts`) → Fase 6 (UI de gestión de Cursos, incluye
  la única dependencia nueva de todo el plan: editor Tiptap) → Fase 7 (UI pública "tomar curso") → Fase 8 (UI del
  Planificador con calendario de 12 meses) → Fase 9 (navegación) → Fase 10 (verificación final + autorización explícita
  de migraciones a prod antes del smoke test manual de 11 pasos). **Ningún brief de Fase 5-10 está redactado todavía**
  — extraerlos de la sección correspondiente del plan maestro al retomar, siguiendo el mismo patrón de grounding usado
  para el de Fase 4 esta sesión (leer los archivos reales que se van a mirror antes de escribir el brief, no transcribir
  el plan maestro a ciegas). Orden de lectura al retomar: `.superpowers/sdd/progress.md` (ledger, tiene el detalle
  completo de Fases 3 y 4) → memoria `cursos-planificador-plan.md`.

### 2026-07-03 — Sesión 36: Cursos & Planificador — Fase 5 (cliente API + hooks) + Fase 6 (UI de gestión de Cursos, Tiptap) ejecutadas

- **Sesión nueva, retoma exactamente en la Fase 5** según lo dejado por la Sesión 35. El usuario pidió "retoma el hilo y
  comienza a ejecutar la fase 5" — se estudió primero el código real (`lib/api.ts`, `useCapacitaciones.ts`,
  `useRegistroAsistencia.ts`, `CursoRepo.ts`/`PlanificadorRepo.ts`, `cursos.routes.ts`/`planificador.routes.ts`,
  controllers, `schemas.ts`) antes de escribir el brief de Fase 5, mismo rigor de grounding que las fases anteriores.
- **✅ Fase 5 COMPLETA** — `apiCursos`/`apiCursosPublico`/`apiPlanificador` agregados a `apps/web/src/lib/api.ts` (mirror
  exacto de `apiCapacitaciones`/`apiRegistro` ya existentes) + 3 hooks nuevos: `useCursos.ts` (con helper de mutación
  genérico `useMutacionCurso<TArgs,TResult>` — a diferencia de Capacitaciones, las mutaciones de Cursos devuelven formas
  distintas; `useInscritosCurso` con `refetchInterval:5000`, el mecanismo de "progreso en vivo" sin Realtime nuevo),
  `useTomarCurso.ts` (mirror de `useRegistroAsistencia.ts`, sin invalidación de caché), `usePlanificador.ts`. Sin
  ambigüedades, transcripción mecánica del brief. Verificado independientemente por el controlador (no solo el
  reporte): shared build OK · `tsc --noEmit` de `apps/web` limpio · **10/10** tests, sin regresión (sin tests nuevos,
  política lean). Ledger actualizado con el detalle completo.
- **Checkpoint intermedio:** tras cerrar Fase 5, el controlador marcó explícitamente que la Fase 6 es la de mayor riesgo
  de todo el plan (única dependencia nueva del proyecto — Tiptap — + la pieza de UI con más superficie, según el propio
  plan maestro) y usó `AskUserQuestion` para confirmar si continuar de inmediato o pausar ahí. El usuario eligió
  continuar ("Continuar con Fase 6").
- **✅ Fase 6 COMPLETA** — dividida en 3 piezas por el controlador (no venían del plan maestro como piezas separadas;
  fue una decisión de ejecución para aislar el riesgo de Tiptap y permitir verificación independiente de cada una):
  - **6a** (dispatchada en paralelo con 6b): `npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
    @tiptap/extension-underline --workspace=apps/web` (el plan maestro solo mencionaba los primeros 3 paquetes; se
    agregó la extensión de subrayado porque la toolbar especificada en la Fase 6 del plan la requiere explícitamente y
    el backend de la Fase 2 ya sanitiza la etiqueta `<u>` en su `ALLOWED_TAGS` — inconsistencia menor del plan resuelta,
    no una desviación de producto) + `apps/web/src/pages/cursos/CursosPage.tsx` (listado, mirror de
    `CapacitacionesPage.tsx` sin campos de fecha/lugar/instructor que un curso no tiene; cada fila es un `Link` directo
    a `/cursos/:id`, sin acordeón ni modal — decisión de página dedicada del plan).
  - **6b** (en paralelo con 6a): `apps/web/src/pages/cursos/LeccionForm.tsx` — el único componente Tiptap de todo el
    proyecto, formulario puro sin llamadas a la API (reporta `onGuardar(valores)` al padre). Toolbar restringida
    (negrita/cursiva/subrayado/H2/H3/listas con y sin numerar/cita) para contenido TEXTO, campo URL para VIDEO. Exporta
    `PROSE_LECCION_CLS` (clases Tailwind vía arbitrary variants, sin tocar `index.css`) para que la Fase 7 renderice el
    HTML guardado con la misma tipografía. **Detalle real descubierto en la ejecución:** Tiptap se resolvió como
    **v3.27.1** (el brief/plan asumían v2) — la API usada (`useEditor`/`EditorContent`/`.chain().focus()...run()`/
    `.isActive()`/`.getHTML()`/`.isEmpty`) resultó compatible sin ningún ajuste, confirmado por `tsc --noEmit` limpio.
    El implementer de 6b tuvo que correr él mismo el `npm install` de la pieza 6a porque arrancó antes de que esa pieza
    paralela terminara — anticipado explícitamente en ambos briefs, sin fricción real.
  - **6c** (dispatchada solo después de que el controlador verificó — lectura línea por línea + re-corrida de `tsc`/
    tests — que 6a y 6b ya estaban correctas y en verde): `apps/web/src/pages/cursos/CursoDetallePage.tsx`, la pieza
    más grande de la fase. Página dedicada `/cursos/:id` (mismo precedente que `ExpedientePage.tsx` de Administración
    de Personal): cabecera con transición Abrir/Cerrar registro (gateada por `puedeGestionarAmbito`) + QR
    (`qrcode.react`) + copiar enlace; `Segmented` `?vista=contenido|inscritos`; editor anidado módulos→lecciones
    (`ModuloRow`/`LeccionRow`: crear/renombrar/reordenar/eliminar en ambos niveles con confirmación inline de 1 clic
    para eliminar — mismo patrón que `AccionesArea`/`AccionesEmpleado`; crear/editar lección delega en `LeccionForm` de
    6b); panel de inscritos en vivo (`InscritosTab`, reusa el `refetchInterval` de 5s ya construido en Fase 5 —
    cumple el requisito literal de "ver progreso en vivo" sin infraestructura nueva). **Desviación documentada:**
    `ultimaActividadEn` se muestra con `formatFechaHora` (absoluto) en vez de "tiempo relativo" como sugería la prosa
    del plan — `shared/src/ui.ts` no tiene ningún formateador de tiempo relativo y construir uno nuevo era alcance
    fuera de esta pieza (una utilidad compartida nueva, no parte de una página); simplificación lean documentada, no
    un defecto — cambio aislado de una línea si se pide después.
  - Ninguna de las 3 piezas agregó tests nuevos (política lean: 100% presentacional, sin guardas de auth ni
    transiciones de estado nuevas en el frontend — todo ya cubierto por la frontera backend de las Fases 2-4).
  - Verificación final de la fase completa (re-corrida por el controlador tras las 3 piezas, no solo confiando en los
    reportes de los implementers): `npm run build --workspace=shared` exit 0 · `npm run typecheck --workspace=apps/web`
    (`tsc --noEmit`) limpio · `npm run test --workspace=apps/web` → **10/10**, sin regresión. Los 3 archivos nuevos
    (`CursosPage.tsx`, `LeccionForm.tsx`, `CursoDetallePage.tsx`) fueron leídos línea por línea por el controlador
    contra sus briefs respectivos antes de dar la fase por cerrada — coinciden exactamente, sin desviaciones de
    sustancia más allá de las ya documentadas arriba.
- **PAUSA a petición explícita del usuario** — mensaje recibido a mitad de la ejecución de 6a/6b: "Pausas al finalizar
  la sesión 6" / "fase" (interpretado, y confirmado por el contexto, como "pausa al finalizar la Fase 6", no la sesión
  completa de inmediato) — se completó la Fase 6 entera (incl. 6c, que todavía no se había dispatchado en ese momento)
  antes de detenerse, tal como se había hecho con la pausa de Fase 4 en la Sesión 35.
- **Verificación final de esta sesión (todo verde):** shared build OK · `tsc --noEmit` de `apps/web` limpio ·
  `npm run test --workspace=apps/web` → **10/10** (Fase 5 y Fase 6 no agregaron tests, política lean). Backend
  (heredado de la Sesión 35, no tocado esta sesión): **269 pass + 2 skip**. **Working tree SIN commitear** desde la
  Fase 1 en adelante (constraint respetado). **Ninguna migración aplicada a Supabase.** `apps/web/package.json` ahora
  incluye las 4 dependencias de Tiptap (única dependencia nueva de todo el plan).
- **Próxima sesión — retomar en la Fase 7** (UI pública "tomar curso": `TomarCursoPage.tsx` + `FormularioCedula.tsx`,
  mirror estructural de `RegistroAsistenciaPage.tsx`, máquina de estados cédula→contenido→completado, reutiliza
  `PROSE_LECCION_CLS` de `LeccionForm.tsx` para renderizar `contenidoTexto` vía `dangerouslySetInnerHTML`) → Fase 8 (UI
  del Planificador con calendario de 12 meses) → Fase 9 (navegación: `Layout.tsx`+`App.tsx` — wireará por fin las
  rutas `/cursos`, `/cursos/:id`, `/planificador`, `/tomar-curso/:token` que hasta ahora existen sin ruta) → Fase 10
  (verificación final + autorización explícita de migraciones `0012`/`0013` a prod antes del smoke test manual de 11
  pasos). **Ningún brief de Fase 7-10 está redactado todavía** — extraerlos del plan maestro al retomar, siguiendo el
  mismo patrón de grounding contra código real usado en las Fases 4-6. Orden de lectura al retomar:
  `.superpowers/sdd/progress.md` (ledger, tiene el detalle completo de Fases 5 y 6) → memoria
  `cursos-planificador-plan.md`.

### 2026-07-04 — Sesión 37: Cursos & Planificador — Fase 7 (UI pública "tomar curso") + Fase 8 (UI del Planificador) ejecutadas, pausa segura

- **Sesión nueva, retoma exactamente en la Fase 7** según lo dejado por la Sesión 36. El usuario activó 3 skills
  (`engineering-architecture-pro`, `design-taste-frontend`, `ui-ux-pro-max`), pidió dominio total del contexto antes de
  autorizar (se leyó ledger → memoria → plan maestro líneas 460-596 → código real a espejar) y autorizó con "Comienza a
  cocinar, usa las skills". Ejecución vía `subagent-driven-development`: brief grounded por fase (leyendo primero los
  archivos reales a mirror, no transcribiendo el plan maestro) + implementer fresco + revisión línea por línea del
  controlador + re-corrida independiente de la verificación. **Sin commits** (constraint respetado).
- **✅ Fase 7 COMPLETA** — UI pública "tomar el curso por cédula", 2 archivos nuevos en `pages/tomar-curso/`:
  - `TomarCursoPage.tsx` (373 líneas): máquina de estados cargando/reanudando → error → BORRADOR (aviso tono gold) →
    preview del curso sin progreso + `FormularioCedula` → `VistaContenido`. Reanudación sin login vía sessionStorage
    `curso:${token}:ingreso` guardando `{nombre, documento}` como JSON — **ambigüedad del plan resuelta**: el plan decía
    guardar solo `documento`, pero `ingresarCursoSchema` es `.strict()` y exige `nombre`; se guardan ambos (inocuo:
    `onConflictDoNothing` en BD, gana el primer nombre escrito). Auto-reingreso con `useEffect`+`intentoRef` llamando
    `apiCursosPublico.ingresar` directo (decisión del implementer aceptada: evita dos `useMutation` con el mismo
    propósito). `VistaContenido`: barra de progreso (fill `bg-gold-500` → `bg-estado-ok` al 100% + banner "Curso
    completado"), módulos como `FilaDesplegable` (`defaultOpen` solo el primero), lecciones con badge
    `TIPO_CONTENIDO_LABEL`; TEXTO → `PROSE_LECCION_CLS` + `dangerouslySetInnerHTML` (HTML ya sanitizado server-side con
    isomorphic-dompurify en Fase 2); VIDEO → enlace externo `noopener noreferrer`. Completar lección → el resultado
    "un solo viaje" reemplaza TODO el estado local sin merge. Nota registrada (no defecto): en dev con StrictMode el
    auto-reingreso puede disparar 2 POST — idempotente por diseño.
  - `FormularioCedula.tsx` (112 líneas): nombre (2-120) + documento (3-30, inputMode numeric), máquina idle/enviando/
    error, reporta `onIngresado(resultado, datos)` al padre.
- **✅ Fase 8 COMPLETA** — UI del Planificador, 2 archivos nuevos en `pages/planificador/`:
  - `PlanificadorPage.tsx` (603 líneas): URL-driven por searchParams (`vista=lista|calendario`, q, estado, ambito,
    anio, mes, pagina). Form "Nueva planeación" colapsable (título/área objetivo/ámbito gated `ambitosVisibles(rol)>1`/
    año actual−1…+2/mes/notas; opcionales con `|| undefined` por el `.strict()` del backend). `Segmented`
    Lista/Calendario preservando params. Filtros de estado/ámbito + chip removible "Mes: <nombre>" cuando se llega
    desde el calendario. Filas planas `premium-card` con pill vía `estadoCapacitacionPlaneadaPill` (Semáforo Único) +
    "Mes Año · T{trimestreDe(mes)}" `tabular-nums` + avance de estado PLANEADA→"Iniciar"→EN_CURSO→"Completar"→
    COMPLETADA vía `useEditarPlaneada` + eliminar con confirmación inline de 1 clic (patrón `GestionArea`).
  - `CalendarioPlanificador.tsx` (147 líneas): "año de un vistazo" — 12 celdas mes (`grid-cols-2 sm:3 lg:4`), cada
    celda un `Link` a la vista lista filtrada por mes/año; navegación de año ‹ ›; hasta 3 chips de título con dot de
    estado + "+N más"; celda vacía apagada; skeleton de 12 celdas. Query propia `usePlanificador({anio, porPagina:100})`
    — **validado contra el schema real**: `.max(100)` es el tope, riesgo runtime que tsc no atrapa. Exporta `nombreMes`
    (date-fns `format` con locale `es`, capitalizado), importado por la página para el chip de mes.
- **Verificación (re-corrida por el controlador tras cada fase):** shared build OK · `tsc --noEmit` de `apps/web`
  limpio · **10/10** tests, sin regresión · `git status` confirma alcance exacto (solo `pages/tomar-curso/` y
  `pages/planificador/` nuevos en web). Backend intacto: **269 pass + 2 skip**. Sin tests nuevos (política lean:
  100% presentacional, frontera ya cubierta por backend Fases 2-4). **Working tree SIN commitear.** **Ninguna
  migración aplicada a Supabase.**
- **⚙️ REGLA NUEVA DE PROCESO (feedback del usuario, 2 veces):** "No me está gustando ese mecanismo de que actualices
  la memoria antes de que finalicemos la sesión. Me estás gastando muchos tokens." → ledger/CLAUDE.md/memoria se
  actualizan en **UN solo batch al cierre de sesión**, nunca entre fases. Persistida en la memoria
  `memoria-solo-al-cierre.md` (+ índice MEMORY.md). También pidió: tests al final de cada fase (cumplido) y mayor
  eficiencia de tokens (menos narración, operaciones batcheadas).
- **PAUSA SEGURA a petición explícita del usuario** ("Haces pausa segura al finalizar la fase 8") — ejecutada al
  cerrar la Fase 8: ledger actualizado (Fases 7+8 + próximo paso), CLAUDE.md §8+§10 actualizados, memoria al día.
- **Próxima sesión — retomar en la Fase 9 (navegación):** `Layout.tsx` (íconos book/calendar del set local, 2 NavItem
  en sección Formación para SA/TH/SST, renombrar etiqueta "Capacitaciones"→"Eventos" sin cambiar ruta, `routeLabels`)
  + `App.tsx` (ruta pública `/tomar-curso/:token` fuera de Layout junto a `/asistencia/:token`; `/cursos` y
  `/cursos/:id` como hermana top-level [NO hija anidada] y `/planificador`, protegidas SA/TH/SST). `shared/src/
  modulos.ts` NO cambia. Brief de Fase 9 sin redactar — grounding contra `App.tsx`/`Layout.tsx` reales. Luego Fase 10:
  verificación final raíz + **pedir autorización explícita para aplicar `0012`/`0013` a prod** + smoke test manual de
  11 pasos (plan maestro líneas 563-579; corte seguro si falta tiempo = recortar la cuadrícula de 12 meses). Orden de
  lectura al retomar: `.superpowers/sdd/progress.md` (ledger) → memoria `cursos-planificador-plan.md`. Demo:
  **martes 2026-07-07, 10:00am**.

### 2026-07-04 — Sesión 38: Cursos & Planificador — Fase 9 (navegación) + Fase 10 (verificación) → CÓDIGO COMPLETO

- **Continuación directa de la Sesión 37**, misma fecha. El usuario pidió retomar la Fase 9 con dominio total del
  contexto antes de autorizar; se estudió ledger + `App.tsx`/`Layout.tsx` reales + plan maestro §Fase 9-10 + exports
  de las 4 páginas nuevas antes de tocar código. Skills activas: `ui-ux-pro-max` + `design-taste-frontend` como lente
  de consistencia sobre el Sello (no re-skin). El usuario dio criterio propio explícito ("quiero que tengas criterio
  propio y encuentres oportunidad de mejora para esta fase y la apliques") + pidió Fase 10 en el mismo hilo y memoria
  **solo al cierre**, nunca intermedia. Cambio quirúrgico de 2 archivos → ejecutado por el controlador directo (sin
  dispatch de implementer). **Sin commits.**
- **✅ Fase 9 (navegación):** `Layout.tsx` — union local `IconName` + `iconPath` con `book`/`calendar` (paths
  replicados verbatim de `components/ui/dash/Icon.tsx`, que es un set aparte; el de Layout es cerrado propio). El
  bloque de la sección `formacion` es **byte-idéntico** en las 3 ramas SA/TH/SST → un solo `Edit replace_all` renombró
  la etiqueta "Capacitaciones"→"Eventos" y añadió los 2 NavItem (`/cursos` book, `/planificador` calendar,
  `status:"live"`) en las tres a la vez. `routeLabels` +2 entradas (`/cursos`, `/planificador`). `App.tsx` — 4 imports,
  ruta pública `/tomar-curso/:token` fuera de `<Layout>` (junto a `/asistencia/:token`), y `/cursos`, `/cursos/:id`
  (hermana top-level, **NO** hija anidada — página dedicada sin `<Outlet/>`), `/planificador`, las 3 protegidas
  SA/TH/SST. `shared/src/modulos.ts` intacto (confirmado por el plan).
- **✅ MEJORA DE CRITERIO PROPIO #1 (consistencia):** el breadcrumb de la barra superior lee de `routeLabels`; el plan
  solo renombraba el sidebar → habría dejado sidebar="Eventos" / cabecera="Capacitaciones". Se renombró **también** el
  `routeLabels` de `/capacitaciones`→"Eventos" para que sidebar y breadcrumb coincidan.
- **✅ MEJORA DE CRITERIO PROPIO #2 (regresión de bundle atrapada y resuelta):** al montar las rutas, las páginas
  nuevas (incl. **Tiptap**, la dep más pesada del proyecto) entraron al chunk inicial → `index` saltó a **803 KB** y
  reapareció el warning de >500 KB (el proyecto tiene "build SIN warnings" como estándar, resuelto en su día en Fase
  8.3). Fix: **`React.lazy`** en las 4 páginas nuevas + helper `<Lazy>` con `Suspense` (fallback sobrio "Cargando…").
  Resultado: `index` 803→**317 KB**, Tiptap aislado en chunk `LeccionForm` **412 KB diferido** (solo baja al abrir el
  editor de un curso). Login/Panel/aprendiz público (`/tomar-curso`) ya no descargan Tiptap (130 KB gzip menos en el
  arranque). **Warning eliminado.** Ataca la raíz (carga diferida), no el síntoma; alineado con la guía de las skills
  ("lazy-load lo no-above-the-fold") y con el precedente Fase 8.3 (code-split).
- **✅ Fase 10 (verificación final, todo verde, re-corrida independientemente):** `shared` build OK · `apps/web`
  typecheck limpio · `apps/web` **10/10** · `apps/backend` **269 pass + 2 skip** (sin regresión) · `npm run build`
  raíz **exit 0 SIN warnings**. Hook impeccable de `index.css` (`Sfmono-Regular` L445) = preexistente ya clasificado
  intencional (stack mono del Sello, port verbatim), no tocado esta fase.
- **CÓDIGO DE CURSOS & PLANIFICADOR COMPLETO (Fases 0-10).** **Working tree SIN commitear.** **Migraciones
  `0012`/`0013` NO aplicadas a prod** — vía `AskUserQuestion` el usuario eligió explícitamente "cerrar solo en código,
  aplicar migraciones después". Memoria actualizada en UN solo batch al cierre (ledger + CLAUDE.md §8/§10 + memorias
  `cursos-planificador-plan.md`/MEMORY.md), respetando la regla de `memoria-solo-al-cierre.md`.
- **Pendiente = ACCIÓN HUMANA (no código):** (1) autorizar y aplicar `0012`+`0013` a prod vía MCP (sin ellas la BD no
  tiene las tablas y el runtime de Cursos/Planificador falla — mismo patrón del bug de Capacitaciones Sesión 23);
  (2) smoke test manual de 11 pasos del plan maestro (líneas 563-579) contra el stack en vivo. Demo: **martes
  2026-07-07, 10:00am**.

### 2026-07-04 — Sesión 39: Auditoría de backend + BD (modo interpretativo) → informe consolidado + plan de remediación (sin código)

- **Sesión de auditoría + diseño de plan, sin tocar código.** Skills: `engineering-skills:senior-backend`,
  `senior-fullstack`, `engineering-architecture-pro` (modo AUDIT + interpretativo al máximo). Alcance confirmado con
  el usuario: **todo el backend `apps/backend` + su conexión con la BD** (web excluida), con **verificación en vivo**
  (269 tests ✓, MCP contra prod, 3 agentes senior por capa + lectura directa). **Sin commits, sin migraciones
  aplicadas, sin ediciones de código.**
- **Informe único rankeado entregado — 11 hallazgos:**
  - **🔴 C1** · Cursos & Planificador 100% desconectado de la BD: `0012_cursos`/`0013_planificador` **NO aplicadas**
    (BD llega a `0011`) → toda ruta `/api/cursos` y `/api/planificador` lanza `relation does not exist` (mismo patrón
    que el bug de Capacitaciones Sesión 23). Migraciones revisadas: correctas/aplicables. **Bloquea la demo del martes.**
  - **🔴 C2 (+I1)** · IDOR/BOLA cross-ámbito en gestión de Cursos: los casos de uso autorizan sobre `cursoId` pero el
    repo muta el hijo solo por su id (`eq(cursoModulos.id, moduloId)` / `eq(cursoLecciones.id, leccionId)`) sin cotejar
    pertenencia al padre → un TALENTO_HUMANO edita/borra/reordena módulos/lecciones de un curso SST ajeno. Verificado
    línea por línea; el patrón correcto YA existe en `marcarLeccionCompletada` (repo:574-580).
  - **🟠 I2** · `mapFuncionario` (repo:92) `String(null)`→`"null"` vía `obtenerDetalle` sin scope → viaja a
    `GET /api/funcionarios/:id` y `/api/archivo/:id`. **I3** · N+1 ~1.634 queries en `crearArea`/`cambiarActivaArea`
    (loops `for…await recomputarEstado`; backfill ya es batch). **I4** · rate-limit público 10/min (riesgo WiFi
    compartido en la demo).
  - **🟡 M1** (0-áreas→PENDIENTE, seguridad por diseño `estado.ts:41`) · **M2** (N+1 `construirResultadoIngreso`) ·
    **M3** (deadlock swap-sentinela) · **M4** (param no-UUID→500) · **M5** (BORRADOR por token, intencional).
  - **Verificado sano:** cero drift en 13 tablas + 14 enums; advisors limpios; cableado Cursos/Planificador correcto;
    máquina de estados, JWT, errorHandler, TOCTOU, guarda salarial sólidos.
- **Plan de remediación diseñado y APROBADO por el usuario para ejecutar en la PRÓXIMA SESIÓN:**
  `C:\Users\Leonardo\.claude\plans\recursive-finding-raven.md` (6 fases, file:line exactos, patrones a espejar,
  trade-offs explícitos, política de tests lean + migraciones gated). Dato clave que habilita el fix limpio del IDOR:
  `obtenerDetalle(cursoId)` YA devuelve el árbol completo (`CursoDetalle.modulos[].lecciones[]`) → cotejo de
  pertenencia en memoria en el caso de uso (unit-testeable) + hardening de repo. I2: dominio confirma
  `Funcionario.fechaRetiro:string` no-null ("nulabilidad vive solo en Empleado") → scope de `obtenerDetalle` con
  `isNotNull(fechaRetiro)`.
- **Estado:** working tree sin cambios de código (solo se escribió el plan + memoria al cierre). **Próxima sesión:**
  ejecutar el plan en orden C1→C2/I1→I2→I3→I4/M2/M4→M1/M3/M5. Memoria nueva: `auditoria-backend-plan.md`.

### 2026-07-04 — Sesión 40: Remediación de la auditoría — C1 + C2/I1 + I2 + I3 + I4 ejecutados (faltan solo los MENOR)

- **Ejecución del plan** `recursive-finding-raven.md` (skills `engineering-architecture-pro`, `code-reviewer`,
  `senior-backend`). El usuario pidió ejecutar en fases con validación intermedia; se hicieron 3 tramos con pausa
  (C1+C2/I1 → I2 → I3+I4). **Cerrados los 2 CRÍTICO + los 4 IMPORTANTE.** Los 5 MENOR (M2/M4 rápidos, M1/M3/M5
  decisiones) quedan explícitamente para la **próxima sesión** (decisión del usuario). **Sin commitear** (constraint);
  la BD de prod sí quedó modificada (C1) con autorización explícita por-migración.
- **✅ C1 (desbloquea la demo):** migraciones `0012_cursos` (`20260704170940`) y `0013_planificador`
  (`20260704170956`) **APLICADAS a prod vía MCP** (autorización explícita del usuario por-migración; verificado
  `list_migrations` antes/después + `get_advisors` limpios: solo los `rls_enabled_no_policy` INFO esperados de las 6
  tablas deny-directo + el WARN moot de leaked-password). `/api/cursos` y `/api/planificador` ya no lanzan
  `relation does not exist`.
- **✅ C2 + I1 (IDOR/BOLA cross-ámbito, defensa en profundidad):** un gestor autorizado en un curso podía
  editar/borrar/reordenar módulos/lecciones de un curso de OTRO ámbito. Cerrado en **2 capas**: (primaria) cotejo de
  pertenencia en memoria en los 7 casos de uso `{editar,eliminar,mover}ModuloCurso`/`{crear,editar,mover,eliminar}LeccionCurso`,
  reusando el `detalle` ya cargado (cero queries) → 404 si el hijo es ajeno; (repo) 6 métodos de `cursoRepository`
  acotados al padre en el `WHERE` (espejo de `marcarLeccionCompletada`), y 5 firmas del puerto `CursoRepo` extendidas
  con `cursoId`. El controller ya pasaba los ids. **+9 tests** (7 rechazos cross-curso verificando que el repo NO se
  llama + 2 happy-path del reenvío de `cursoId`); fixture de sanitización actualizado a la firma nueva.
- **✅ I2 (el string `"null"` fabricado):** `mapFuncionario` (repo) hacía `String(null)`→`"null"` sobre empleados
  ACTIVOS que se colaban por `obtenerDetalle` (única lectura por-id sin scope) → el `"null"` viajaba a
  `GET /api/funcionarios/:id` y `/api/archivo/:id`. Fix en 3 puntos: (1) scope autoritativo `isNotNull(fechaRetiro)`
  en `obtenerDetalle` → un ACTIVO devuelve `null` → 404 (correcto: tiene su `GET /api/personal/:id`); (2) mapper
  endurecido `r.fechaRetiro ?? ""` (elimina el `typeof/String` raíz del bug); (3) **poda** del método muerto
  `listarFuncionarios()` (sin-args, cero callers vivos — el caso de uso homónimo usa `listarFuncionariosPaginado`,
  que ya scopeaba desde Sesión 28) del puerto + repo. `mapFuncionario` exportado; **+2 tests** de regresión.
- **✅ I3 (N+1 ~1.634 queries en el catálogo de áreas):** `crearArea`/`cambiarActivaArea` hacían
  `for (f) await recomputarEstado(f)` — 3 queries × 543 en una sola `tx` (pool `max:1`) → riesgo de statement-timeout.
  Fix: extraje la decisión **pura** `decidirRecalculo(estadosAreas, hitos)` (el núcleo que alimenta a
  `calcularEstadoGlobal`), refactoricé `recomputarEstado` para consumirla (extracción fiel 1:1) y añadí
  `recomputarEstadoEnLote` que la reusa → **equivalencia por construcción**. El helper de lote colapsa el I/O a
  **2 lecturas** (aprobaciones de áreas activas + hitos, agrupadas en memoria) + **escrituras agrupadas por estado
  destino** (`UPDATE … IN (…)`, ≤ 8) → ~1.634 → ~8 queries, constante respecto a N. Reemplazados los 2 loops de
  `areaRepository` (:64, :131). **`estado.ts` intacto.** **+6 tests** de la matriz de estados sobre `decidirRecalculo`.
- **✅ I4 (rate-limit público estrangulaba la demo):** `limit: 10/min/IP` → **60** en `cursos.routes.ts` y
  `capacitaciones.routes.ts` (una sala de TH tras el mismo NAT/WiFi comparte IP saliente → el 11.º toque recibía 429).
  Sigue protegiendo endpoints anónimos idempotentes; el token de ~131 bits es la barrera principal. El progreso-en-vivo
  (refetch 5s) pega al endpoint autenticado, no a este limiter.
- **Verificación final (todo verde):** shared build OK · `tsc --noEmit` backend limpio · backend **286 pass + 2 skip**
  (269 base → 278 C2 → 280 I2 → 286 I3) · `npm run build` raíz **exit 0 SIN warnings** (index 317 KB, Tiptap diferido
  en `LeccionForm` 412 KB). **Working tree SIN commitear.** No se tocó `estado.ts` ni las transacciones de concurrencia.
- **🔵 PRÓXIMA SESIÓN — los MENOR:** **M2** (N+1 en `construirResultadoIngreso` `cursoRepository.ts:129-131`, hot path
  del progreso vivo → 1 query con `inArray(moduloId, ids)`) · **M4** (param no-UUID → 500; guard `paramUuid` → 400
  antes del repo, opción (a) del plan) · **M1/M3/M5** (puntos de decisión — exponer, no cambiar en silencio: M1
  0-áreas→PENDIENTE es seguridad por diseño; M3 deadlock swap-sentinela raro; M5 BORRADOR por token intencional).
  Detalle en la memoria `auditoria-backend-plan.md`. **Pendiente humano aparte:** smoke test manual de 11 pasos de
  Cursos/Planificador contra el stack en vivo (ahora que `0012`/`0013` están en prod). Demo: **martes 2026-07-07, 10am.**

### 2026-07-04 — Sesión 41: Auditoría de backend — cierre de los MENOR (M2, M4, M1/M3/M5) → AUDITORÍA COMPLETA

- **Continuación directa de la Sesión 40**, mismo día. Skills activas: `engineering-skills:senior-fullstack` +
  `engineering-skills:senior-backend` (activadas a pedido del usuario al abrir sesión). Se releyó primero el plan
  `recursive-finding-raven.md` + la memoria `auditoria-backend-plan.md` + el código real de `cursoRepository.ts`,
  `errorHandler.ts` y los 8 routers del backend antes de tocar nada. **Sin commits** (constraint).
- **✅ M2 (N+1 en el hot path del progreso vivo):** `construirResultadoIngreso` (`cursoRepository.ts`) hacía
  `for (m of modulosBase) await listarLeccionesDeModulo(m.id, tx)` — N queries por curso, en el path que
  `ingresarInscripcion`/`marcarLeccionCompletada` ejecutan en cada toque del alumno. Fix: nuevo helper
  `listarLeccionesDeModulos(moduloIds, ex)` (1 query con `inArray` + agrupación en memoria, mismo patrón que ya usaba
  `obtenerDetalle`). **Bonus de limpieza (no pedido, de bajo riesgo):** `obtenerDetalle` tenía la MISMA lógica
  duplicada a mano (no era N+1, ya usaba `inArray`, pero repetía el ensamblado) → se unificó para consumir el mismo
  helper, eliminando la duplicación entre los dos ensambladores gemelos del árbol curso→módulos→lecciones.
- **✅ M4 (param no-UUID → 500):** el `errorHandler` solo traduce errores con `.status`; un id malformado llegaba
  intacto a Postgres (`22P02 invalid input syntax for type uuid`) → 500 genérico en vez de 400 legible. Fix (opción
  (a) del plan, la recomendada): middleware `paramUuid(nombre)` nuevo (`interface/middleware/paramUuid.ts`), cableado
  vía `router.param(nombre, paramUuid(nombre))` en los **8 routers** que tienen params de fila (`cursos`,
  `planificador`, `capacitaciones`, `areas`, `archivo`, `funcionarios`, `personal`, `usuarios`) — **nunca** sobre
  `:token` (Cursos/Capacitaciones), que es un string base64url, no un UUID. `router.param` de Express se dispara solo
  cuando el nombre del param aparece en la ruta que matcheó, así que una sola línea por router cubre todas sus rutas
  sin tocarlas una por una. **+4 tests**: 3 unitarios de `paramUuid` (mismo patrón que `requireAuth.test.ts`: llamar
  el middleware directo con stubs, sin levantar Express) + 1 smoke HTTP end-to-end sobre la ruta pública
  `POST /tomar/:token/lecciones/:leccionId/completar` (confirma 400, no 500, sin necesitar JWT ni BD real porque es
  pública).
- **✅ M1/M3/M5 — expuestos al usuario vía `AskUserQuestion`, sin tocar código a ciegas:** las 3 decisiones se
  presentaron con la recomendación del plan de auditoría; el usuario confirmó **las 3 por defecto**: **M1** (0 áreas
  activas → PENDIENTE atascado) es seguridad por diseño, se acepta tal cual — **`estado.ts` sigue intocado**. **M3**
  (deadlock raro del swap-sentinela en reordenamientos concurrentes, SA-only) se acepta/difiere — mitigación solo si
  se materializa alguna vez. **M5** (metadata de curso BORRADOR visible por token público) se acepta como intencional
  — es el aviso de "aún no disponible" de la UI pública, el token de ~131 bits no es enumerable.
- **Verificación final (todo verde):** shared build OK + **240/240** · `tsc --noEmit` backend limpio · backend
  **290 pass + 2 skip** (286→290, +4 de M4) · web typecheck limpio + **10/10** · `npm run build` raíz **exit 0 SIN
  warnings** (bundle sin cambios de tamaño relevantes: index 317 KB, Tiptap diferido en `LeccionForm` 412 KB).
  **Working tree SIN commitear.** No se tocó `estado.ts`, `recomputarEstado.ts` ni ninguna migración.
- **AUDITORÍA DE BACKEND + BD COMPLETA — los 11 hallazgos (2 CRÍTICO + 4 IMPORTANTE + 5 MENOR) están cerrados o
  explícitamente aceptados con decisión del usuario.** No queda ningún punto abierto del plan
  `recursive-finding-raven.md`. **Pendiente = ACCIÓN HUMANA (sin cambios):** smoke test manual de 11 pasos de
  Cursos/Planificador contra el stack en vivo. Demo: **martes 2026-07-07, 10am.**

### 2026-07-07 — Sesión 42: Impeccable activado/actualizado + crítica de la sección Formación + P1 implementados

- **Petición del usuario:** activar la skill `impeccable` en modo actualización, luego atacar un problema concreto de
  diseño que adelantó: la sección Formación (Eventos/Capacitaciones, Cursos, Planificador) tiene 3 páginas
  "genéricas, pobres, planas", todas iguales. **Sin commits** (constraint del proyecto).
- **Impeccable activado y actualizado.** `node context.mjs --target apps/web` cargó `PRODUCT.md`/`DESIGN.md`
  existentes (marcaban el proyecto como "~5% del desarrollo" — claramente desactualizado dado el estado real).
  Vía `AskUserQuestion` el usuario eligió **"Refrescar"** (no sobrescribir a ciegas). Se re-extrajeron los tokens
  reales del código (`tailwind.config.ts` + `index.css` + componentes `EstadoPill`/`FilaDesplegable`/`Avatar`/
  `ChipFiltro`/`Segmented`/`Buscador`/`PageHeader`/`GenerarLiquidacionButton`) y se reescribieron ambos archivos:
  **`PRODUCT.md`** (5 roles incl. SST, plataforma multi-módulo real, estado "producto maduro en producción" en vez
  de "~5%", nota de theming claro/oscuro) y **`DESIGN.md`** (formato Stitch de 6 secciones + frontmatter — colores
  resueltos de los tokens CSS reales `--bg`/`--card`/`--foreground`/`--estado-*`, tipografía real `text-3xl
  font-bold` sin fuente web, esquinas `rounded-md`/`rounded-lg` documentadas como el default actual — reemplazando
  el `rounded-full` de la primera versión —, y una nueva regla explícita contra dejar páginas nuevas genéricas
  reusando componentes de forma literal).
- **Crítica formal de la sección Formación** (`/impeccable critique`, siguiendo `reference/critique.md`): Assessment
  A (revisión de diseño manual sobre `CapacitacionesPage.tsx`/`CursosPage.tsx`/`PlanificadorPage.tsx`/
  `GestionCapacitacion.tsx` reales) + Assessment B (`detect.mjs --json` sobre los 3 directorios → 0 hallazgos, exit
  0 — el detector cubre anti-patrones CSS puntuales, no "sameness" holístico entre páginas). **Score 26/40
  (Aceptable).** Hallazgo central: las 3 páginas comparten literalmente el mismo `premium-card` de filtros, el
  mismo formulario "Nuevo X", y la misma fila (monograma de 2 letras del ámbito + título + pill) — pese a que el
  proyecto ya tiene íconos `calendar`/`book`/`grad-cap` sin usar en `dash/Icon.tsx`. 2 P1 + 2 P2 identificados,
  con personas Alex (power user de TH) y Sam (lector de pantalla, badge sin `aria-label`). Snapshot persistido en
  `.impeccable/critique/2026-07-07T14-13-30Z__macion-capacitaciones-cursos-planificador-listados.md`.
- **2 P1 implementados en la misma sesión** (el usuario eligió atacarlos primero vía `AskUserQuestion`):
  - **Identidad de dominio:** el monograma de 2 letras se reemplazó por un ícono real por página —
    `calendar` en `CapacitacionesPage`, `book` en `CursosPage`, `grad-cap` en `PlanificadorPage` (todos ya
    existían en `dash/Icon.tsx`, cero íconos nuevos).
  - **Dato "hero" visible en la fila:** Eventos ahora muestra un bloque día/mes (`BloqueFecha`, nuevo) en vez de
    la fecha en texto pequeño; Cursos muestra el **conteo real de inscritos** — requirió un cambio de backend
    contenido: `Curso.totalInscritos: number` nuevo en `shared/src/cursos.ts`, poblado en
    `cursoRepository.listarCursos` con **una sola query agrupada** (`groupBy(inscripciones.cursoId)` +
    `inArray` sobre los ids de la página, sin N+1) y en `obtenerDetalle` (reusa el conteo que ya calculaba);
    `CursoRepo.crearCurso`/la implementación excluyen `totalInscritos` de su `Omit` de entrada (no es un campo de
    creación). Planificador muestra un bloque mes/año junto al trimestre (que ya existía en texto, ahora también
    como bloque visual, con ícono `grad-cap` junto al título).
  - **2 P2 quedaron documentados, sin implementar** (decisión explícita del usuario: cerrar la sesión con spec):
    migrar los filtros hechos a mano (`FiltroEstado`/`FiltroAmbito`, duplicados letra por letra entre
    `CapacitacionesPage`/`CursosPage`) al componente compartido `ChipFiltro`; y añadir una señal visual de que
    `CursosPage` navega (Link a página dedicada) mientras `CapacitacionesPage`/`PlanificadorPage` expanden
    in-place (`FilaDesplegable`) — hoy visualmente indistinguibles hasta el clic.
- **Spec escrito para la próxima sesión:** `docs/superpowers/specs/2026-07-07-formacion-consistencia-visual-design.md`
  — contexto, diseño propuesto para cada P2 (con decisión a tomar sobre `ChipFiltro` vs `Link`+`hrefCon`), alcance
  explícito de qué NO tocar (arquitectura de `CursosPage` como página dedicada, `CursoDetallePage`,
  `GestionCapacitacion`, `CalendarioPlanificador`, sin backend/migraciones nuevas) y pasos de verificación.
- **Verificación final (todo verde):** `npm run build --workspace=shared` OK · `npx tsc --noEmit` backend limpio ·
  `npm run typecheck --workspace=apps/web` limpio · shared **240/240** · backend **290 pass + 2 skip** (sin
  regresión) · web **10/10** · `npm run build` raíz **exit 0 SIN warnings** (bundle sin cambios de tamaño
  relevantes: `index` 318 KB). **Working tree SIN commitear.** No se tocó `estado.ts`, `recomputarEstado.ts` ni
  ninguna migración — el único cambio de backend fue el campo `totalInscritos` (agregado puro sobre datos
  existentes, sin tocar la máquina de estados ni las transacciones de concurrencia).
- **Próxima sesión:** ejecutar el spec de los 2 P2 (`2026-07-07-formacion-consistencia-visual-design.md`) →
  re-correr `/impeccable critique` sobre el mismo target para confirmar la subida de score. Pendiente humano
  aparte, sin cambios: smoke test manual de 11 pasos de Cursos/Planificador (Sesión 40/41). Demo ya pasada
  (2026-07-07, hoy) — confirmar con el usuario si sigue vigente o se reprogramó.

### 2026-07-07 — Sesión 43: Remediación de auditoría idempotencia/doble-submit/caché/fallos silenciosos — 11/17 tareas (PAUSA a mitad de plan)

- **Origen:** el usuario pidió ejecutar el plan ya escrito y aprobado
  `C:\Users\Leonardo\.claude\plans\dise-a-un-plan-completo-luminous-hare.md` — remediación de una auditoría
  fullstack previa (6 finders + verificación adversarial, fuera de esta sesión) sobre idempotencia, doble-submit,
  desincronización de caché y fallos silenciosos: **22 hallazgos confirmados** (1 CRÍTICO, 8 IMPORTANTE, 13 MENOR),
  organizados en 3 fases. Skills activas: `engineering-architecture-pro` + `senior-fullstack`.
- **Decisión de ejecución:** el plan trae plantillas de `subagent-driven-development` (commits por tarea +
  worktree), pero eso choca con la regla dura del proyecto ("nunca commitear sin que el usuario lo pida" +
  construcción siempre in-place) — se ejecutó **directamente por el controlador**, fase por fase, sin worktree ni
  commits, verificando build/tsc/tests al cierre de cada bloque. **Sin commits** (constraint respetado).
- **El usuario pidió explícitamente pausar al superar el 50% del plan** y dejar la memoria lista para que la
  próxima sesión retome el 50% restante con dominio total del contexto — esta entrada cumple ese pedido.
  **11 de 17 tareas del plan completas** (toda la Fase 1 + toda la Fase 2 + 3.1/3.2/3.3 de la Fase 3).
- **✅ FASE 1 — CRÍTICO (1.1) completa:** lost-update al reordenar módulos/lecciones de un curso.
  `cursoRepository.ts` `moverModulo`/`moverLeccion` ahora abren con un `SELECT...FOR UPDATE` sobre la fila raíz del
  scope (`cursos`/`cursoModulos` respectivamente, mismo patrón que `cambiarEstadoArea` en
  `funcionarioRepository.ts:369-379`) **antes** de leer `actual`/`vecino`, serializando dos reordenamientos
  concurrentes del mismo curso/módulo. Test nuevo `tests/concurrencia-cursos.integration.test.ts` (gated por
  `DATABASE_URL_TEST`, mismo molde que `concurrencia-estadoArea.integration.test.ts`, 10 iteraciones × 2 casos):
  verifica que el orden final tras dos `moverModulo`/`moverLeccion` en paralelo nunca queda duplicado ni perdido.
- **✅ FASE 2 — IMPORTANTE (2.1–2.8) completa:**
  - **2.1** `areaRepository.crearArea` — pre-chequeo `SELECT` normalizado (`lower(trim(...))`, Drizzle `sql`)
    **dentro de la misma tx**, antes del insert/backfill → `ErrorValidacion` si hay match. **2.2**
    `funcionarioRepository.registrarNovedad` — el `SELECT` inicial de `emp` ahora es `.for("update")` (lock
    pesimista, no UPDATE-condicional: aquí no hay "estado esperado", es un cambio de valor libre) → serializa dos
    ediciones concurrentes del mismo empleado, evitando un `valorAnterior` incorrecto en la bitácora append-only.
    Test nuevo `tests/concurrencia-personal.integration.test.ts` (gated, 10 iteraciones): verifica que dos
    `CAMBIO_CARGO` concurrentes producen una bitácora encadenada (`valorAnterior` de la 2ª fila = `valorNuevo` de
    la 1ª, nunca el valor original — eso sería el salto que el lock evita). **2.3** `requireAuth.ts` — el
    `catch {}` mudo pasó a `catch (e)` + `logger.error({err:e}, ...)` antes de traducir a `ErrorAutenticacion` (el
    cliente sigue recibiendo el mismo 401 genérico). Test nuevo en `requireAuth.test.ts`: el logger se invoca con
    el error real, el mensaje al cliente no cambia. **2.4** `generarLiquidacion.ts` — eliminado el parámetro muerto
    `notificar?` (nunca lo pasaba `container.ts`) + su bloque `if` + docstring corregido; test obsoleto de
    `liquidacion.test.ts` que lo ejercía, eliminado. **2.5** `npm install pino --workspace=apps/backend` (única
    dependencia nueva del plan) → `infrastructure/logging/logger.ts` (instancia única, nivel `debug`/`info` según
    `NODE_ENV`, sin `pino-pretty`) → `errorHandler.ts` y `interface/index.ts` migrados de `console.error`/
    `console.log` al logger real; los tests que espiaban `console.error` en `requireAuth.test.ts` migrados a espiar
    `logger.error`. **2.6** `useFuncionarios.ts` (`invalidarVistasTramite`) y `realtime.ts` (`invalidarTramite`)
    ahora incluyen el prefijo `"personal"` — el expediente 360° (`["personal","expediente",id]`, distinto del
    `["expediente",id]` de Archivo) ya se refresca tras un cambio de trámite del mismo funcionario. **2.7+3.4**
    (mismo cambio cohesivo en `realtime.ts`, documentados juntos según el plan): el canal `"plataforma-sync"`
    ahora escucha también `cursos`/`curso_modulos`/`curso_lecciones`/`inscripciones`/`progreso_lecciones` (→
    invalidan `["cursos"]`), `capacitaciones_planeadas` (→ `["planificador"]`), y las 6 tablas satélite de
    Personal 360° (`empleado_personales`/`_familiares`/`_formacion`/`_experiencia`/`_salarial`/`novedades`, → ya
    cubierto por el mismo prefijo `"personal"` de 2.6). **2.8** `.subscribe()` ahora recibe un callback de estado:
    en `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` loguea (`console.warn`, es código de frontend) y muestra **un solo**
    `toast.warning` (bandera local `avisoMostrado`, se resetea en silencio al volver a `SUBSCRIBED`, sin toast de
    "reconectado" para no ser ruidoso).
- **✅ FASE 3 — MENOR, 3/10 completas (3.1, 3.2, 3.3):**
  - **3.1** `funcionarioRepository.crearEmpleado` — el `insert` se envolvió en `try/catch`: si la carrera ocurre
    igual (pasa el pre-chequeo de 3.1-histórico pero pierde la carrera del insert), el código Postgres `23505` se
    traduce al mismo `ErrorValidacion("Ya existe un empleado con ese documento.")` de la ruta feliz, en vez de
    dejar salir un 500 crudo. Test nuevo `tests/crearEmpleado.integration.test.ts` (gated): dos `crearEmpleado`
    concurrentes con el mismo documento vía `Promise.allSettled` → exactamente 1 éxito + 1 `ErrorValidacion`.
    **3.2** (implementado junto con 2.1 por ser el mismo patrón, tal como indicaba el plan): mismo pre-chequeo
    normalizado dentro de tx aplicado a `cursoRepository.crearModulo` (scope `cursoId`), `crearLeccion` (scope
    `moduloId`) y `planificadorRepository.crear` (mismo `titulo`+`anio`+`mes`+`ambito`; este último se envolvió en
    `db.transaction` porque antes era un insert plano fuera de tx). Los 4 casos (área/módulo/lección/planificador)
    quedaron cubiertos en un único archivo nuevo `tests/idempotencia-crear.integration.test.ts` (gated) — la lógica
    vive en el repo (DB), no en el caso de uso, así que no es unit-testeable con un repo mockeado como el resto de
    `areas.test.ts`/`cursos.test.ts`. **3.3** — la guarda de estado de `abrirRegistroCurso`/`cerrarRegistroCurso`
    no era atómica con la escritura (`obtenerDetalle` + luego `UPDATE` incondicional por id). Fix: la firma del
    puerto `CursoRepo.cambiarEstadoRegistro` ganó un 3er parámetro `estadoEsperado`; el repo ahora hace
    `UPDATE...WHERE id=X AND estado_registro=estadoEsperado RETURNING` (mismo molde que
    `generarLiquidacion`/`registrarLiquidacion` en `funcionarioRepository.ts:407-436`) — si 0 filas, un `SELECT`
    adicional distingue "no existe" (`ErrorNoEncontrado`) de "ya cambió de estado" (`ErrorValidacion`). Los 2 casos
    de uso pasan el estado esperado (`abrir`: `"BORRADOR"`; `cerrar`: `"ABIERTO"`). Test agregado al mismo archivo
    de idempotencia (gated): un `estadoEsperado` equivocado → `ErrorValidacion`, la transición correcta sí aplica.
    **Nota:** `capacitacionRepository.cambiarEstadoRegistro` es un método homónimo de un *puerto distinto*
    (`CapacitacionRepo`, módulo Capacitaciones) — no tocado, no forma parte de este hallazgo.
- **Riesgos residuales aceptados por el plan, sin implementar (no son deuda olvidada):** 3.9 (duplicado de
  bitácora en `registrarNovedad` por reintento de red, no concurrencia — el lock de 2.2 no lo cubre) y 3.10
  (duplicado en `crearFamiliar`/`crearFormacion`/`crearExperiencia` — la UI ya deshabilita el botón durante
  `isPending`, el único vector residual es un reintento de red genuino sobre datos legítimamente 1-N). Mismo
  criterio de aceptación que M1/M3/M5 de la auditoría de la Sesión 41 — documentado en el propio plan, no
  requieren código.
- **Verificación de este checkpoint (todo verde, re-corrida por el controlador antes de pausar):**
  `npm run build --workspace=shared` OK · `npx tsc --noEmit --project apps/backend` limpio ·
  `npm run test --workspace=apps/backend` → **290 pass + 11 skip** (290 sin cambio neto: -1 test obsoleto de
  `notificar` +1 test nuevo de `requireAuth` = 0; +9 nuevos tests de integración gated, todos `skip` sin
  `DATABASE_URL_TEST` — antes eran 2 skip) · `npm run typecheck --workspace=apps/web` limpio. **No se corrió
  `npm run build` raíz completo ni `npm run test --workspace=apps/web`** en este checkpoint intermedio (quedan en
  la lista de verificación final del cierre real de sesión). **Working tree SIN commitear.** No se tocó
  `estado.ts` ni ninguna migración SQL — todo el plan es aplicativo (SELECT/lock/UPDATE-condicional dentro de
  transacciones ya existentes) o de frontend (invalidación de caché).
- **🔵 PRÓXIMA SESIÓN — retomar exactamente en la Fase 3, tarea 3.5 del plan** (leer el plan completo primero,
  ya tiene todo el detalle file:line):
  - **3.5** `apps/web/src/hooks/useAreas.ts` — `useMutacionArea` (líneas ~34-52) invalida
    `areas/funcionarios/funcionarios-todos/mi-area/metricas/matriz` pero no `["funcionario", id]` → agregar
    `"funcionario"` a esa lista (el modal de detalle abierto de un funcionario no se entera si su área bloqueante
    se desactiva).
  - **3.6** `apps/web/src/pages/capacitaciones/GestionCapacitacion.tsx` — el botón "Exportar asistencias"
    (`ExportarButton`, líneas ~105-131) no tiene `disabled` durante la descarga. Aplicar el patrón ya existente de
    `ArchivoPage.tsx:100-139` (`ExportarCsvButton`): `useState(descargando)` + `try/finally` + `disabled={descargando}`
    + label dinámico "Exportando…".
  - **3.7** `apps/web/src/pages/tomar-curso/TomarCursoPage.tsx` — el `.catch` del auto-reingreso (línea ~52) falla
    en silencio. Agregar `import { toast } from "sonner"` + `toast.error(...)` antes/junto al
    `sessionStorage.removeItem(...)`.
  - **3.8** — dos "copiar enlace" sin feedback: `CapacitacionModal.tsx:170-177` (`copiar()`, hoy sin ningún toast
    en try/catch) necesita `toast.success("Enlace copiado.")` + `toast.error(...)`; `CursoDetallePage.tsx:148-155`
    ya tiene el `toast.success`, solo falta el `toast.error` en el catch (hoy vacío).
  - Luego: **verificación final completa** (todas las fases juntas) — `npm run build --workspace=shared` →
    `npm run test --workspace=shared` (esperado sin cambios de dominio) → `npx tsc --noEmit --project apps/backend`
    → `npm run test --workspace=apps/backend` (290+ pass, mismo conteo de skip) → `npm run typecheck --workspace=apps/web`
    → `npm run test --workspace=apps/web` (10/10, sin tests nuevos — 3.5-3.8 son presentacionales, política lean) →
    `npm run build` raíz (exit 0 sin warnings). Si hay `DATABASE_URL_TEST` configurado, correr también los 4
    archivos de integración nuevos de esta sesión (`concurrencia-cursos`, `concurrencia-personal`,
    `idempotencia-crear`, `crearEmpleado`) para confirmar en una BD real que los locks/UPDATE-condicionales
    efectivamente serializan. **Smoke manual no bloqueante** (sugerido por el plan, opcional): dos pestañas
    reordenando módulos de un mismo curso casi a la vez; registrar una novedad del mismo empleado desde 2 pestañas;
    confirmar que el expediente 360° se refresca solo tras un cambio de trámite; confirmar sincronía en vivo de
    Cursos/Planificador entre 2 sesiones. **Sin commits ni migraciones a producción** — el plan lo especifica
    explícitamente, el usuario decide cuándo commitear.

### 2026-07-07 — Sesión 44: Remediación de auditoría idempotencia/doble-submit/caché/fallos silenciosos — CIERRE (17/17)

- **Continuación directa de la Sesión 43**, retomando exactamente en la tarea 3.5 del plan
  `dise-a-un-plan-completo-luminous-hare.md` tal como quedó indicado en el checkpoint anterior.
  Sesión corta y quirúrgica: 4 tareas presentacionales + verificación final. **Sin commits**
  (constraint del proyecto).
- **✅ 3.5** — `apps/web/src/hooks/useAreas.ts`, `useMutacionArea`: se agregó `["funcionario"]` a
  la lista de invalidación (junto a `areas/funcionarios/funcionarios-todos/mi-area/metricas/matriz`)
  — el modal de detalle de un funcionario ahora se entera si su área bloqueante se desactiva/activa.
- **✅ 3.6** — `apps/web/src/pages/capacitaciones/GestionCapacitacion.tsx`, `ExportarButton`: mismo
  patrón que `ExportarCsvButton` de `ArchivoPage.tsx` — `useState(descargando)` + `try/finally` +
  `disabled={descargando}` + label dinámico "Exportando…" mientras dura la descarga del CSV.
- **✅ 3.7** — `apps/web/src/pages/tomar-curso/TomarCursoPage.tsx`: el `.catch` del auto-reingreso
  (reanudación de sesión sin login vía `sessionStorage`) ahora hace `toast.error(e instanceof
  ApiError ? e.message : "No se pudo reanudar la sesión.")` antes de limpiar la clave de sesión —
  ya no falla en silencio.
- **✅ 3.8** — dos "copiar enlace" sin feedback cerrados: `CapacitacionModal.tsx` (`copiar()`) ganó
  `toast.success("Enlace copiado.")` en el try y `toast.error("No se pudo copiar el enlace.")` en
  el catch (antes, ambos vacíos); `CursoDetallePage.tsx` (`copiar()`) ya tenía el `toast.success`,
  solo le faltaba el `toast.error` en el catch (antes vacío) — agregado.
- **Sin tests nuevos** (las 4 tareas son 100% presentacionales, política lean del plan — la
  frontera ya está cubierta por los tests de backend de las Fases 1-2).
- **Verificación final completa de las 3 fases juntas (todo verde):**
  `npm run build --workspace=shared` OK · `npm run test --workspace=shared` **240/240** ·
  `npx tsc --noEmit --project apps/backend` limpio · `npm run test --workspace=apps/backend`
  **290 pass + 11 skip** (sin regresión, mismo conteo que el checkpoint de la Sesión 43 — los 4
  archivos de integración nuevos de esa sesión siguen `skip` sin `DATABASE_URL_TEST`) ·
  `npm run typecheck --workspace=apps/web` limpio · `npm run test --workspace=apps/web` **10/10**
  (sin tests nuevos, confirmando la política lean) · `npm run build` raíz **exit 0 SIN warnings**
  (bundle sin cambios de tamaño relevantes: `index` 320 KB, Tiptap diferido en `LeccionForm` 412 KB).
- **PLAN DE REMEDIACIÓN COMPLETO — 17/17 tareas.** Los 2 riesgos residuales (3.9 duplicado de
  bitácora por reintento de red en `registrarNovedad`, 3.10 duplicado en los formularios 1-N de
  Personal 360°) quedan **aceptados según el propio plan**, sin código adicional — mismo criterio
  que M1/M3/M5 de la auditoría anterior (Sesión 41). **Working tree SIN commitear. Sin migraciones
  a producción** (el plan completo no requería ninguna — todas las decisiones de idempotencia son
  a nivel de aplicación, confirmado con el usuario al aprobar el plan).
- **Pendiente = ACCIÓN HUMANA (opcional, no bloqueante):** si hay `DATABASE_URL_TEST` configurado,
  correr los 4 archivos de integración de concurrencia (`concurrencia-cursos`,
  `concurrencia-personal`, `idempotencia-crear`, `crearEmpleado`) contra una BD real para confirmar
  que los locks/UPDATE-condicionales serializan de verdad. Smoke manual sugerido por el plan (no
  bloqueante): dos pestañas reordenando módulos de un mismo curso casi a la vez; registrar una
  novedad del mismo empleado desde 2 pestañas; confirmar refresco del expediente 360° tras un
  cambio de trámite; confirmar sincronía en vivo de Cursos/Planificador entre 2 sesiones.
- **Próxima sesión:** sin checklist pendiente de este plan — trabajo nuevo (commit del working
  tree si el usuario lo pide, smoke test manual de Cursos/Planificador de la Sesión 40/41 aún
  aparte, o cualquier otra iniciativa).

### 2026-07-08 — Sesión 45: Gestión de Desvinculaciones — ítems 1-6/13 ejecutados, pausa breve solicitada

- **Ejecución del plan** `C:\Users\Leonardo\.claude\plans\cheerful-cuddling-koala.md` (13 ítems,
  orden estricto). Igual que en la remediación de la Sesión 43-44, se ejecutó **directamente por el
  controlador** (sin worktree, sin commits) en vez de con las plantillas de commit-por-tarea de
  `subagent-driven-development`, por chocar con la regla dura del proyecto de construir siempre
  in-place en `main` sin commitear sin pedido explícito. **Sin commits** (constraint respetado).
- **Feedback nuevo del usuario, ya guardado en memoria** (`feedback-test-files-lean.md`):
  *"No hagas tantos archivos de test, eso gasta muchos tokens"* — desde este punto, los tests nuevos
  se consolidaron en archivos ya existentes (`recomputarEstado.test.ts` extendido,
  `liquidacion.test.ts` reescrito en el mismo archivo) en vez de crear uno por caso de uso. Aplica
  también a los ítems pendientes 7-11.
- **✅ Ítem 2 — migración `0014_devuelto_por_ci.sql`:** nuevo valor de enum `estado_area` (patrón de
  migración propia para extender enum, precedente `0007_rol_sst.sql`) + espejo en `schema.ts`.
- **✅ Ítem 3 — TDD `hayDevolucion`:** `shared/src/estado.ts` — `ResultadoEstado.hayDevolucion`
  calculado junto a `hayRechazo` (`estadosAreas.some(e => e === "DEVUELTO_POR_CI")`), en las 3 ramas
  de retorno. `+6 tests` en `estado.test.ts` (19 totales). `recomputarEstado.ts` —
  `decidirRecalculo`/`recomputarEstado` propagan `hayDevolucion` (extraído de `calcularEstadoGlobal`,
  sin tocar su lógica). `ui.ts` — `ESTADO_AREA_LABEL`/`ESTADO_AREA_BADGE`/`ESTADO_AREA_CELDA`
  completados con `DEVUELTO_POR_CI` (3 errores de exhaustividad de `tsc` detectados y corregidos).
  Un archivo de test **huérfano preexistente** (`shared/tests/desvinculaciones.test.ts`, de un
  intento previo con un dominio incompatible — `EstadoGlobal` con valores nuevos que la Decisión #3
  del plan descarta explícitamente) fue detectado, señalado al usuario vía `AskUserQuestion`, y
  **descartado** por elección explícita (movido a backup fuera del repo, no borrado a ciegas).
- **✅ Ítem 4 — migración `0015_archivado_en.sql`:** columna `archivado_en timestamptz` en
  `funcionarios` + trigger `fn_archivado_en_requiere_paz_y_salvo` (rechaza si se intenta archivar sin
  `estado_global='PAZ_Y_SALVO'` — defensa en profundidad en BD, no solo en el caso de uso) + espejo
  `schema.ts` + mapeo en `mapFuncionario`.
- **✅ Ítem 5 — migración `0016_eventos_auditoria.sql`:** tabla `eventos_auditoria` (entidad/acción/
  actor/estado-anterior/estado-nuevo en jsonb/observación/metadata + índice, RLS SELECT solo
  SA/CI vía función `es_auditor` nueva, mismo patrón que `0004_rls_datos.sql`) + espejo `schema.ts` +
  `eventoAuditoriaRepository.ts` (función standalone `registrarEvento(evento, ex=db)`, se invoca
  DENTRO de transacciones ya existentes — mismo molde que `recomputarEstado(id, tx)`).
- **✅ Ítem 6 — swap de guardas de rol (el cambio de negocio central del plan):**
  `generarLiquidacion.ts` ahora exige `CONTROL_INTERNO`/`SUPERADMIN` (antes TH/SA);
  `registrarLiquidacion.ts` ahora exige `TALENTO_HUMANO`/`SUPERADMIN` (antes CI/SA); guarda de ruta
  invertida en `funcionarios.routes.ts` (`/:id/liquidacion`→SA+CI, `/:id/paz-y-salvo`→SA+TH);
  `funcionarioRepository.ts` — ambos métodos ahora escriben `registrarEvento(...)` dentro de su
  propia `tx` (antes de `recomputarEstado`) con `estadoAnterior`/`estadoNuevo` en jsonb, y el autor
  fallback se intercambió (`"Control Interno"` para `generarLiquidacion`, `"Talento Humano"` para
  `registrarLiquidacion"`, reflejando qué rol invoca ahora cada uno). Docstrings de ambos casos de
  uso actualizados explicando la inversión (el nombre técnico NO cambia, solo el rol autorizado, para
  no migrar el enum de hitos en BD). `liquidacion.test.ts` **reescrito en el mismo archivo** (no uno
  nuevo) con los roles invertidos + `hayDevolucion: false` agregado a los mocks de `ResultadoMutacion`.
- **Verificación (todo verde, re-confirmada en esta sesión leyendo los archivos reales):** shared
  build OK + **246/246** tests · backend `tsc --noEmit` limpio · **292 pass + 11 skip** (sin
  regresión). **Working tree SIN commitear. Ninguna migración (`0014`/`0015`/`0016`) aplicada a
  Supabase** — se pedirá autorización explícita, por-migración, recién en el ítem 13 (verificación
  final), igual que en planes anteriores.
- **PAUSA BREVE a petición explícita del usuario** ("Haz una pausa y recapitulación corta y breve"),
  distinta de una pausa "urgente pero segura" — se detuvo el trabajo a mitad de la investigación del
  ítem 7 (solo lectura de `cambiarEstadoArea.ts`/`cambiarEstadoAreaSchema` como referencia, sin
  ninguna edición de archivo iniciada) y se dio un recap conciso en vez de seguir codificando.
- **🔵 PRÓXIMA SESIÓN — retomar exactamente en el ítem 7 del plan:** **`devolverCasoAArea`** (repo +
  caso de uso + ruta + tests). Patrón a espejar: `cambiarEstadoArea.ts` (guarda `areaPermitida`,
  observación obligatoria, `obtenerDetalle` + rechazo si `PAZ_Y_SALVO`, delega en repo con
  `autor: usuario.nombre`) + `cambiarEstadoAreaSchema` de `shared/src/schemas.ts` (merge de
  `funcionarioId`/`areaId` de los params de URL con el body). Ya existen en `domain.ts`:
  `DevolverCasoAAreaInput{areaId,observacion}` y `EstadoArea`/`ESTADOS_AREA` con `DEVUELTO_POR_CI`.
  Después: ítem 8 `archivarCaso` → ítem 9 refactor `finalizarContrato`→`iniciarTramiteDesvinculacion`
  → ítem 10 migración `0017_lotes_importacion` → ítem 11 importación masiva (multer/xlsx) → ítem 12
  frontend (swap botones TH/CI, Devolver, Archivar, módulo importación, `realtime.ts`) → ítem 13
  verificación final + autorización explícita por-migración de `0014-0017`. Detalle completo,
  file:line y patrones exactos en la memoria `gestion-desvinculaciones-plan.md` y en el plan original
  `cheerful-cuddling-koala.md`. Seguir aplicando [[feedback-test-files-lean]] en los ítems 7-11.
  Sin commits ni migraciones sin pedido explícito.

### 2026-07-08 — Sesión 46: Gestión de Desvinculaciones — ítems 7-10 completos + ítem 11 iniciado, pausa segura inmediata

- **Continuación directa de la Sesión 45**, retomando exactamente en el ítem 7 tras releer el plan
  completo + la memoria `gestion-desvinculaciones-plan.md`. Skills activas: `engineering-architecture-pro`
  + `senior-fullstack`. Misma disciplina de ejecución (directo por el controlador, sin worktree, sin
  commits). **Sin commits** (constraint respetado).
- **✅ Ítem 7 — `devolverCasoAArea` completo:** `shared/src/schemas.ts` (`devolverCasoAAreaSchema`,
  merge funcionarioId+areaId+observacion) · puerto `FuncionarioRepo.devolverCasoAArea` ·
  `funcionarioRepository.ts` (lock `FOR UPDATE` + UPDATE aprobaciones→`DEVUELTO_POR_CI` + INSERT
  observaciones + `registrarEvento` + `recomputarEstado`, todo en una tx) ·
  `application/funcionarios/devolverCasoAArea.ts` (guarda CI/SA, observación obligatoria, 404 si no
  existe, 400 si `PAZ_Y_SALVO`) · wireado en barrel+`container.ts`+`funcionariosController.ts` · ruta
  `POST /:id/areas/:areaId/devolver` (`requireRol` CI/SA) · **+7 tests añadidos a
  `cambiarEstadoArea.test.ts`** (NO archivo nuevo, [[feedback-test-files-lean]]).
- **✅ Ítem 8 — `archivarCaso` completo:** puerto `FuncionarioRepo.archivarCaso` ·
  `funcionarioRepository.ts` (UPDATE condicionado `WHERE estadoGlobal='PAZ_Y_SALVO' AND
  archivadoEn IS NULL RETURNING`, 0 filas → `ErrorValidacion`, + `registrarEvento`) ·
  `application/funcionarios/archivarCaso.ts` (guarda SA/TH, 404/400) · wireado en
  barrel+`container.ts`+`funcionariosController.ts` · ruta `POST /:id/archivar` (`requireRol` SA/TH)
  · **+4 tests añadidos a `archivo.test.ts`** (NO archivo nuevo).
- **✅ Ítem 9 — refactor `finalizarContrato`→`iniciarTramiteDesvinculacion` completo:** nuevo
  `apps/backend/src/infrastructure/db/iniciarTramiteDesvinculacion.ts` — función standalone
  `(args, ex=db) => Promise<ResultadoMutacion>` que extrae TODA la lógica del puente (TOCTOU flip,
  backfill de aprobaciones, `registrarEvento`, `recomputarEstado`) de dentro de
  `funcionarioRepository.finalizarContrato`, que ahora es un wrapper de 3 líneas
  (`db.transaction(tx => iniciarTramiteDesvinculacion({id,fechaRetiro,autor}, tx))`). Sin tests
  nuevos (refactor puro, `personal.test.ts` con repo mockeado no se ve afectado). Esta función
  standalone es la pieza clave que el ítem 11 (importación masiva) reusa para confirmar cada fila.
- **✅ Ítem 10 — migración `0017_lotes_importacion.sql` completa:** enums `lote_estado`
  (PREVISUALIZADO/CONFIRMADO_PARCIAL/CONFIRMADO_TOTAL) y `fila_lote_estado`
  (VALIDA/CON_ERROR/DUPLICADA/CONFIRMADA/DESCARTADA), tablas `lotes_importacion`+`filas_lote` (FK
  cascade, `unique(lote_id, numero_fila)`), RLS deny-directo (mismo patrón que `eventos_auditoria`)
  — espejo 1:1 en `schema.ts`. **NO aplicada a Supabase.**
- **✅ Ítem 2 (tipos compartidos, prerrequisito del 11) completo:** `shared/src/desvinculaciones.ts`
  (nuevo) — `LoteEstado`, `FilaLoteEstado`, `FilaLote`, `LotePrevisualizacion` (con
  `erroresParseo: {numeroFila,motivo}[]`, mejora deliberada sobre el plan original: los errores de
  *parseo* de una fila del Excel — sin descartarlos en silencio — se distinguen de los errores de
  *validación contra BD*), `ResultadoConfirmacionLote` + barrel `shared/src/index.ts` +
  `schemas.ts` (`confirmarImportacionParcialSchema`/`ConfirmarImportacionParcialInput`). **Fricción
  resuelta:** un primer intento declaró el mismo nombre de tipo en dos archivos (interfaz en
  `desvinculaciones.ts` + `z.infer` en `schemas.ts`) → colisión de export en el barrel `export *`;
  corregido dejando solo la versión inferida de `schemas.ts` (patrón ya establecido por
  `CambiarEstadoAreaInput`), detectado antes de correr `tsc`.
- **🔧 Ítem 11 (importación masiva) INICIADO — escrito pero SIN CONECTAR aún:**
  `apps/backend/package.json` +`multer@^2.2.0`+`xlsx@^0.18.5`+`@types/multer` (instaladas) · puerto
  `LoteImportacionRepo.ts` (`FilaCruda`, `ErrorParseoFila`, interfaz `{crearLoteConFilas,
  obtenerLote, confirmarParcial}`) · `infrastructure/importacion/parsearArchivoDesvinculaciones.ts`
  (parser XLSX vía `XLSX.read`+`sheet_to_json`, alias de encabezados case/acento-insensibles, filas
  inválidas → `errores` sin abortar el archivo completo; **fix de robustez**: el primer intento de
  `normalizarClave` usaba un regex literal con caracteres Unicode combinantes incrustados —
  reemplazado por `new RegExp("[\\u0300-\\u036f]", "g")` con puntos de código escapados
  explícitamente, inmune a problemas de encoding del archivo) · `loteImportacionRepository.ts`
  (`crearLoteConFilas` clasifica cada fila VALIDA/CON_ERROR/DUPLICADA contra la BD en una tx;
  `confirmarParcial` con lock `FOR UPDATE` sobre el lote — serializa dos confirmaciones concurrentes
  del mismo lote — y reusa `iniciarTramiteDesvinculacion` por fila dentro de un `try/catch` que
  **no aborta el lote completo** si una fila individual falla por TOCTOU, marcándola `DESCARTADA`
  con el motivo en vez de perder las demás) · casos de uso
  `application/desvinculaciones/previsualizarImportacionDesvinculaciones.ts` (guarda SA/TH, parsea +
  delega) y `confirmarImportacionParcial.ts` (guarda SA/TH, 404 si no existe el lote, 400 si ya
  `CONFIRMADO_TOTAL`) · ambos ya exportados en `application/index.ts`. **Falta:** wireado en
  `container.ts`, `desvinculacionesController.ts` (nuevo), `desvinculaciones.routes.ts` (nuevo,
  multer memoryStorage + rate-limit estricto en el upload), montaje en `app.ts`, y **un solo
  archivo de test consolidado** `tests/desvinculaciones.test.ts` (guardas 403 de ambos casos de uso
  + 404/400 de confirmar + 2-3 tests del parser con un buffer XLSX real, sin mockear la librería).
- **Verificación de este checkpoint (todo verde):** `npm run build --workspace=shared` OK ·
  `npx tsc --noEmit --project apps/backend` limpio · `npm run test --workspace=apps/backend` →
  **304 pass + 11 skip** (sin regresión — el conteo no sube todavía porque los archivos del ítem 11
  no están conectados a ningún router). shared **246/246**. **Working tree SIN commitear. Ninguna
  migración aplicada a Supabase** (`0014`-`0017` siguen pendientes de autorización explícita en el
  ítem 13).
- **PAUSA SEGURA a petición explícita y urgente del usuario** ("Haz una pausa segura, por favor" +
  "ya mismo" inmediatamente después) — a mitad de la escritura del ítem 11, justo tras cerrar el
  barrel de casos de uso. **Feedback nuevo del usuario, guardado en memoria**
  (`feedback-pausa-inmediata.md`): un pedido de pausa exige detenerse en el acto, sin ninguna tool
  call adicional de verificación "para dejar todo prolijo" antes de responder — incluso una
  intención bien intencionada de cerrar con evidencia se lee como no haber escuchado la instrucción
  si llega después del pedido de detenerse.
- **🔵 PRÓXIMA SESIÓN — retomar exactamente en el ítem 11, punto "Falta" de arriba** (wireado de
  `container.ts` → controller → rutas con multer/rate-limit → montaje en `app.ts` → tests
  consolidados → verificar build+tsc+test). Después: ítem 12 (frontend: swap de botones TH/CI,
  botón Devolver, botón Archivar, módulo de importación masiva, `realtime.ts`) → ítem 13
  (verificación end-to-end + **autorización explícita, por-migración**, de `0014`-`0017` a Supabase
  + smoke test manual). **Mandato adicional del usuario, para ejecutar DESPUÉS del ítem 13**:
  limpieza estricta de código muerto/obsoleto/legacy/residual, incluyendo archivos de test que ya no
  se vayan a usar — reforzó su preferencia por tests consolidados sobre uno-por-caso. Detalle
  completo, file:line y patrones exactos en la memoria `gestion-desvinculaciones-plan.md`. Seguir
  aplicando [[feedback-test-files-lean]] y [[feedback-pausa-inmediata]]. Sin commits ni migraciones
  sin pedido explícito.

### 2026-07-08 — Sesión 47: Gestión de Desvinculaciones — CIERRE COMPLETO (ítems 11-13/13) + migraciones 0014-0018 en producción

- **Continuación directa de la Sesión 46**, retomando exactamente en el ítem 11 tras releer a fondo
  el plan `cheerful-cuddling-koala.md`, la memoria `gestion-desvinculaciones-plan.md`, `feedback-
  test-files-lean.md`, `feedback-pausa-inmediata.md` y `memoria-solo-al-cierre.md` (pedido explícito
  del usuario: "estudia, explora y domina el contexto + impacto por completo" antes de tocar código).
  Skills activas: `senior-fullstack`, `senior-backend`, `senior-frontend`. **Sin commits** (constraint
  respetado); el usuario pidió ejecutar el circuito completo y dejar todo sincronizado.
- **✅ Ítem 11 (backend de importación masiva) COMPLETO** — se verificó primero el estado real del
  código (puerto `LoteImportacionRepo`, `parsearArchivoDesvinculaciones.ts`,
  `loteImportacionRepository.ts` y los 2 casos de uso ya escritos y compilando desde la Sesión 46, sin
  wireear). `container.ts`: import + instancia de `loteImportacionRepository` +
  `previsualizarImportacionDesvinculaciones`/`confirmarImportacionParcial`.
  `interface/controllers/desvinculacionesController.ts` (nuevo): `importar` (lee `req.file` de
  multer) + `confirmar` (Zod `confirmarImportacionParcialSchema` sobre el body).
  `interface/routes/desvinculaciones.routes.ts` (nuevo): `multer({storage: memoryStorage(), limits:
  {fileSize: 5MB}})`, rate-limit 10/min en `/importar` (operación pesada: parseo + N validaciones
  contra BD, distinto del límite 60/min de endpoints públicos idempotentes), `POST /importar` y
  `POST /lotes/:id/confirmar`, ambas tras `requireAuth, requireActivo, requireRol(SA,TH)`. Montado en
  `app.ts` como `/api/desvinculaciones`. **1 solo archivo de test nuevo**
  `tests/desvinculaciones.test.ts` (+14, [[feedback-test-files-lean]]): guardas 403 de ambos casos de
  uso, delegación exacta de argumentos (incl. `toHaveBeenCalledWith` verificando el parseo real del
  Excel), 404/400 de `confirmarImportacionParcial`, y 3 tests de
  `parsearArchivoDesvinculaciones` construyendo buffers `.xlsx` reales con la librería `xlsx`
  (`XLSX.utils.json_to_sheet`+`book_new`+`write`) — sin mockear la librería, tal como pedía el plan.
  Backend **304→318 pass + 11 skip**.
- **✅ Ítem 12 (frontend) COMPLETO — 8 piezas:**
  1. **Swap de botones TH/CI**: `CatalogoFuncionarios.tsx` — `VISTA_CFG.th`/`ci` intercambian
     `estadoAccionable` (CI ahora `LISTO_PARA_LIQUIDAR`, TH ahora `LIQUIDACION_GENERADA`) + copy
     actualizado; `AccionRol` intercambia qué vista muestra `GenerarLiquidacionButton`/
     `LiquidarButton` (mismos componentes técnicos — el plan explícitamente no renombra nada, solo
     invierte qué rol/vista los ve). `DetalleFuncionario.tsx`: `mostrarGenerar`/`mostrarLiquidar`
     invierten su `tieneRol(...)`.
  2. **`DevolverAreaButton.tsx`** (nuevo): confirmación inline con observación obligatoria, mismo
     molde visual que `AccionesArea`, usa `useDevolverCasoAArea` (hook nuevo en `useFuncionarios.ts`).
     Cableado en `AreaList.tsx` vía prop nueva `puedeDevolver` (independiente de `puedeGestionar` —
     Control Interno no gestiona el resto de acciones de área), visible solo si
     `ap.estado==="APROBADO"||"NO_APROBADO"`. `DetalleFuncionario.tsx` pasa
     `puedeDevolver={tieneRol("CONTROL_INTERNO","SUPERADMIN")}`.
  3. **`ArchivarButton`** (inline en `ArchivoPage.tsx`): confirmación inline, `useArchivarCaso` (hook
     nuevo), visible solo si `f.archivadoEn===null`; se agregó además el dato "Archivado" a
     `DetalleResumen` (fecha si ya se archivó, "Sin archivar" si no).
  4. **`apiFuncionarios.devolverCasoAArea`/`archivarCaso`** + **`apiDesvinculaciones`** (nuevo, con
     helper `requestMultipart`/`api.multipart` — primer uso de `multipart/form-data` en el proyecto,
     sin fijar `Content-Type` a mano para que el navegador agregue el boundary) en `lib/api.ts`.
  5. **Módulo nuevo `apps/web/src/pages/desvinculaciones/`**: `ImportacionPage.tsx` (sube→previsualiza
     →selecciona filas VALIDA→confirma parcial/total, toasts de resultado), `DropzoneArchivo.tsx`
     (drag&drop + input file, presentacional puro), `TablaPrevisualizacionLote.tsx` (checkboxes por
     fila VALIDA + sección aparte de `erroresParseo`, nunca mezclados con filas persistidas),
     `PillFilaLoteEstado.tsx`. Ruta `/desvinculaciones/importacion` (SA+TH) en `App.tsx`.
  6. **`shared/src/ui.ts`**: `FILA_LOTE_ESTADO_LABEL`/`FILA_LOTE_ESTADO_BADGE`/`filaLoteEstadoPill`
     nuevos (Regla del Semáforo Único — la fuente de color vive en shared, no en el componente).
  7. **`Layout.tsx`**: ícono `upload` nuevo (flecha+bandeja) + nav item "Importacion masiva" en la
     sección "Administracion" de SA y TH + entrada en `routeLabels`.
  8. **`realtime.ts`**: `lotes_importacion`/`filas_lote` → invalida `["importacion"]`; docstring del
     módulo actualizado.
  Web typecheck limpio + **11/11** (10 previos + ninguno nuevo — presentacional, política lean; el
  test 11 ya existía de `ThemeContext`).
- **✅ Ítem 13 (verificación + migraciones) COMPLETO:**
  - Verificación final: shared **246/246** · backend `tsc` limpio + **318 pass + 11 skip** · web
    typecheck limpio + **11/11** · `npm run build` raíz **exit 0 SIN warnings** (bundle sin
    regresión: `index` ~333 KB, Tiptap sigue diferido en `LeccionForm`).
  - **Autorización explícita del usuario** (vía `AskUserQuestion`, nombrando las 4 migraciones) →
    **`0014`/`0015`/`0016`/`0017` aplicadas a producción vía MCP en orden**, verificado
    `list_migrations` antes (BD en `0013`) y después (`0014`-`0017` registradas,
    `20260708212956`-`213041`).
  - **Hallazgo no previsto por el plan**: el re-chequeo de advisors reveló 2 WARN nuevos —
    `es_auditor` (SECURITY DEFINER de `0016`) ejecutable por `anon`/`authenticated` (mismo patrón que
    `rol_de`/`es_superadmin` antes de `0005_revoke_security_definer.sql`), y el trigger
    `fn_archivado_en_requiere_paz_y_salvo` (`0015`) sin `search_path` fijo. **Reportado al usuario
    con `AskUserQuestion`** (no se aplicó a ciegas) → autorización explícita → **migración
    `0018_endurecer_funciones_desvinculaciones.sql` nueva**, mismo `REVOKE EXECUTE ... FROM anon,
    authenticated, public` que `0005` (razonamiento documentado en el propio SQL: RLS se evalúa con
    los privilegios del *definer*, revocar `EXECUTE` a los roles públicos NO rompe las policies, ya
    probado en producción desde la Sesión 16) + `fn_archivado_en_requiere_paz_y_salvo` reescrita con
    `set search_path = public`. **Advisors finales limpios**: solo los 10 `rls_enabled_no_policy`
    INFO esperados (deny-directo, patrón intencional del proyecto en `asistencias`/`capacitaciones`/
    `capacitaciones_planeadas`/`curso_*`/`cursos`/`filas_lote`/`inscripciones`/`lotes_importacion`/
    `novedades`/`progreso_lecciones`) + el WARN moot de leaked-password de siempre.
- **PLAN COMPLETO — 13/13 ítems cerrados.** `estado.ts`/`recomputarEstado.ts` no se tocaron esta
  sesión (ya intervenidos con TDD en la Sesión 45); las 3 transacciones de concurrencia existentes
  (`cambiarEstadoArea`, hitos, `finalizarContrato`/`iniciarTramiteDesvinculacion`) tampoco se
  tocaron. **Working tree SIN commitear** (constraint respetado — la BD de prod sí quedó modificada
  con autorización explícita en cada una de las 5 migraciones de esta sesión).
- **Mandato pendiente del usuario, NO ejecutado esta sesión** (era "posterior al ítem 13", no una
  acción automática de cierre): limpieza estricta de código muerto/obsoleto/legacy/residual,
  incluyendo archivos de test que ya no se vayan a usar. Queda para cuando el usuario la pida
  explícitamente — no se asumió que "cerrar el circuito" incluyera este mandato adicional.
- **Pendiente = ACCIÓN HUMANA:** smoke test manual completo — CI ve/valida `LISTO_PARA_LIQUIDAR` en
  su oficina y CI recibe la bandeja correcta, TH cierra `LIQUIDACION_GENERADA` desde su oficina, CI
  devuelve un área ya resuelta con observación obligatoria y la UI distingue "devuelto" de
  "rechazado", TH archiva un trámite `PAZ_Y_SALVO` desde `/archivo` y ve la fecha de archivado, subir
  un Excel de prueba pequeño en `/desvinculaciones/importacion` → previsualizar → seleccionar
  algunas filas VALIDA → confirmar parcialmente → verificar que las filas no seleccionadas ni las
  `CON_ERROR`/`DUPLICADA` no crean funcionarios → confirmar el resto → verificar `eventos_auditoria`
  para cada paso (solo legible por SA/CI). **Próxima sesión:** sin checklist pendiente de este plan
  — retomar solo si el usuario pide la limpieza de código muerto mandatada, o trabajo nuevo.

### 2026-07-08 — Sesión 48: Consolidación de vistas (redundancia SA/TH) + diseño de "Avance por Área" potenciado

- **Origen:** el usuario notó redundancia real entre el catálogo de Funcionarios (SA), la oficina
  de Talento Humano y la Matriz de Avance, y dio contexto de negocio: en una reunión reciente se
  acordó que **TH ahora valida que todas las áreas dieron visto bueno antes de pasar el caso a
  Control Interno para liquidar** — trabajo de supervisión/seguimiento, no de aprobación directa.
  **Feedback nuevo del usuario, guardado en memoria permanente** (`feedback-idioma-espanol.md`):
  exige que TODA la comunicación sea en español, sin excepción, incluyendo traducir cualquier
  resultado de subagentes antes de mostrarlo.
- **✅ PARTE 1 (eliminación de redundancia) EJECUTADA Y VERIFICADA, con autorización explícita
  ("Si elimina esa redundancia en las vistas que lo sufran como superadmin y talento humano"):**
  - Borrados `apps/web/src/pages/funcionarios/FuncionariosPage.tsx` y `TalentoHumanoPage.tsx` + sus
    rutas e imports en `App.tsx`.
  - `shared/src/permisos.ts` — `rutaOficinaPorRol` ahora manda a SA y TH a `/paz-y-salvo/avance`
    (antes cada uno tenía su propia página); `permisos.test.ts` actualizado (2 tests).
  - `MatrizPage.tsx` ganó ruta hija `:id` + `<Outlet/>` (antes solo era de lectura, sin modal
    propio) — reusa `FuncionarioModal`/`DetalleFuncionario`, que ya traían las acciones de rol y el
    rastro de auditoría de hitos, así que no se perdió ninguna capacidad.
  - `CatalogoFuncionarios.tsx` (ahora consumido SOLO por `ControlInternoPage`, vista="ci") perdió el
    `Segmented` de vista de supervisión que ya no tenía destinos válidos (Todo/TH ya no existen).
  - `Layout.tsx` — eliminados los ítems de sidebar "Funcionarios" (SA) y "Talento Humano" (TH);
    "Avance por área" queda como única entrada de SA/TH al módulo. `routeLabels` actualizado.
  - `MiAreaPage.tsx` — el único enlace hardcodeado a la ruta borrada (`/paz-y-salvo/funcionarios/:id`,
    visible solo para SA) se corrigió para resolver dinámicamente vía `rutaOficinaPorRol`.
  - **Control Interno no se tocó** — conserva su página y bandeja dedicadas.
  - Verificación (todo verde): `npm run build --workspace=shared` OK · `npm run test --workspace=shared`
    **246/246** · `npm run typecheck --workspace=apps/web` limpio · `npm run test --workspace=apps/web`
    **11/11** · `npm run build` raíz **exit 0 SIN warnings**. **Working tree SIN commitear.**
- **🔵 PARTE 2 (potenciar/consolidar "Avance por Área") — DISEÑADA Y APROBADA EN SU ESTRUCTURA, SIN
  EJECUTAR** (el usuario pidió explícitamente dejarla para la próxima sesión). Proceso:
  `superpowers:brainstorming` con preguntas de alcance (`AskUserQuestion`: capacidad prioritaria =
  "ambas" — visibilidad de cuellos de botella + bandeja de traspaso; interacción = clic filtra;
  ubicación = bloque arriba de la matriz). A mitad del brainstorming el usuario amplió el alcance a
  un **rediseño visual completo** ("jerarquía visual, tipografía, paleta delux y limpieza, filtros
  múltiples y combinados, UX... que no parezca hecho por IA") — se activó el **compañero visual**
  (servidor en `.superpowers/brainstorm/`, mockups HTML de 3 direcciones A/comando-ejecutivo/
  B/tablero-editorial/C/híbrido-de-precisión) y se hizo **investigación web real** (Stripe, Linear,
  Pencil & Paper — fuentes citadas al usuario) para refinar la dirección elegida y evitar un look
  "genérico de dashboard-plantilla". El usuario aprobó **"C · Híbrido de precisión" refinada**: cinta
  de KPIs fundida dentro de una cabecera navy (no cards sueltas tipo SaaS genérico), celdas de tabla
  que resaltan la columna bloqueante activa, acciones de fila reveladas al hover en vez de links
  permanentes. Exploración de código (sin escribir nada aún) confirmó que casi todo es reusable sin
  tocar backend salvo un filtro nuevo: `pendientesPorArea` (cuellos de botella) YA existe en
  `obtenerMetricas`/`useMetricas`; la bandeja de traspaso reusa `useFuncionarios({estado:
  "LISTO_PARA_LIQUIDAR"})` tal cual; solo hace falta un campo nuevo `areaBloqueante` en
  `FiltroFuncionarios` (shared) + una subconsulta `EXISTS` en `listarFuncionariosPaginado` (sin
  migración, sin endpoint nuevo, heredado gratis por `listarMatrizPaginado`).
  **Plan completo escrito** en `C:\Users\Leonardo\.claude\plans\lazy-wibbling-sifakis.md` (Plan mode,
  3 pilares: backend del filtro combinable · datos de frontend reusando hooks existentes · rediseño
  visual con `AvanceHero.tsx` nuevo + toolbar de filtros combinables removibles + bandeja de
  traspaso + limpieza menor de un label stale en `PanelControlPage.tsx:182`), con 6 fases ordenadas,
  archivos clave identificados y pasos de verificación end-to-end. **El usuario pidió detener ahí
  explícitamente** ("Actualiza la memoria aplicaremos/ejecutaremos el plan completo en una nueva
  sesión siguiente") — **cero código de la Parte 2 se tocó**, el plan queda listo para ejecutar tal
  cual está escrito.
- **Working tree:** Parte 1 sin commitear (verificada en verde), Parte 2 sin ningún cambio de código
  (solo el archivo de plan fuera del repo, en `~/.claude/plans/`).
- **Próxima sesión — ejecutar el plan completo desde `C:\Users\Leonardo\.claude\plans\
  lazy-wibbling-sifakis.md`** en el orden de sus 6 fases (backend → datos frontend → visual →
  bandeja de traspaso → limpieza menor → verificación final raíz). Detalle completo en la memoria
  `consolidacion-avance-area-plan.md`. Sigue aplicando [[feedback-idioma-espanol]],
  [[feedback-test-files-lean]] y [[feedback-pausa-inmediata]]. Sin commits ni migraciones sin pedido
  explícito (este plan, de hecho, no requiere ninguna migración SQL).

### 2026-07-09 — Sesión 49: Potenciación "Avance por Área" — plan completo ejecutado

- **Continuación directa de la Sesión 48**, retomando desde el plan `C:\Users\Leonardo\.claude\
  plans\lazy-wibbling-sifakis.md` ya aprobado. Ejecución en el orden exacto de sus 6 fases.
  **Sin commits** (constraint respetado).
- **✅ Fase 1 (backend):** `FiltroFuncionarios.areaBloqueante?: string` en `shared/src/domain.ts` +
  validación uuid opcional en `filtroFuncionariosSchema` (`schemas.ts`; `filtroMatrizSchema` la
  hereda gratis por ser alias). `funcionarioRepository.ts` (`listarFuncionariosPaginado`, ~línea
  669): condición `EXISTS` nueva sobre `aprobaciones` cuando `areaBloqueante` viene (`funcionarioId
  = funcionarios.id AND areaId = filtro.areaBloqueante AND estado NOT IN (APROBADO, NO_APLICA)`) —
  importó `exists`/`notInArray` de `drizzle-orm`. `listarMatrizPaginado` lo hereda automáticamente
  (delega en el mismo método) — cero cambios ahí. Sin migración, sin endpoint nuevo, sin cambio de
  firma en `FuncionarioRepo` (puerto). Test nuevo en `lecturasCatalogo.test.ts` (archivo existente,
  [[feedback-test-files-lean]]): delegación exacta del filtro al repo mockeado.
- **✅ Fase 2 (frontend — datos):** `MatrizPage.tsx` lee `areaBloqueante` de `searchParams` y lo
  pasa a `useMatriz` + a todos los `hrefCon` existentes (búsqueda, chips de estado, paginación).
  `useMetricas({enabled: puedeGestionar})` (cuellos de botella, campo `pendientesPorArea` ya
  existente) y `useFuncionarios({estado:"LISTO_PARA_LIQUIDAR", porPagina:5}, {enabled})` (bandeja de
  traspaso) — **cero hooks nuevos**, `puedeGestionar = esSuperadmin || esTalentoHumano` gatea ambos
  para que Control Interno nunca los dispare (mismo alcance que la guarda real de `/metricas`).
- **✅ Fase 3 (frontend — visual):** `AvanceHero.tsx` nuevo (`pages/matriz/`) reemplaza el
  `PageHeader` plano — cabecera `bg-navy-deep` (token ya existente, reusado literal del resto de la
  app) con la cinta de KPIs fundida debajo en la misma superficie (`bg-navy-900`, `divide-white/10`,
  sin cards blancas sueltas); cada ítem es un `Link` que set/toggle su filtro (línea `bg-gold-400`
  bajo el activo, `aria-pressed`). Toolbar: chip removible nuevo para `areaBloqueante` activo
  (`bg-estado-rechazoBg`/`text-estado-rechazo`, mismos tokens que `ESTADO_AREA_CELDA` — Semáforo
  Único, sin hex nuevos). Tabla: columna del área bloqueante activa resalta con
  `bg-estado-rechazoBg/60`; cada fila gana un afordance "Ver ficha →" revelado en
  `group-hover`/`focus-visible` (visible siempre en touch vía el arbitrary variant
  `[@media(hover:none)]:opacity-100`), sin quitar el link existente sobre el nombre.
- **✅ Fase 4 (bandeja de traspaso):** componente `BandejaTraspaso` (dentro de `MatrizPage.tsx`) —
  hasta 5 `Avatar`+nombre+fecha de retiro, "Ver los N →" apunta al **mismo** `href` que clickear el
  KPI "Listos para traspasar" de la cinta (sin lógica de filtro duplicada). Montada entre el hero y
  la tabla, gated por `puedeGestionar`.
- **✅ Fase 5 (limpieza menor):** `PanelControlPage.tsx` — el botón que enlazaba a `oficina` decía
  "Funcionarios" (desactualizado desde la Sesión 48, cuando `oficina` pasó a apuntar a
  `/paz-y-salvo/avance`) → renombrado a "Avance por área".
- **✅ Fase 6 (verificación final):** `npm run build --workspace=shared` OK · `npm run test
  --workspace=shared` **246/246** · `npx tsc --noEmit --project apps/backend` limpio · `npm run
  test --workspace=apps/backend` **319 pass + 11 skip** (+1 sobre la Sesión 47, el test nuevo de
  `areaBloqueante`) · `npm run typecheck --workspace=apps/web` limpio · `npm run test
  --workspace=apps/web` **11/11** (sin tests nuevos — presentacional, política lean) · `npm run
  build` raíz **exit 0 SIN warnings** (bundle sin regresión: `index` ~336 KB, `LeccionForm`/Tiptap
  sigue diferido en 412 KB). `git status` confirmó el alcance exacto: solo los 6 archivos listados
  en el plan + `AvanceHero.tsx` nuevo — nada fuera de lo planeado.
- **`estado.ts`, `recomputarEstado.ts`, las transacciones de concurrencia y las rutas/página de
  Control Interno NO se tocaron** — tal como exigía el plan. **Working tree SIN commitear.**
- **Plan `lazy-wibbling-sifakis.md` cerrado íntegro** (Pilares 1-3, Fases 1-6). El módulo "Avance
  por Área" es ahora la oficina de trabajo real de SA/TH: cinta de KPIs accionable, filtros
  combinables por URL (texto + estado + área bloqueante), bandeja de traspaso, y un rediseño visual
  bajo la dirección aprobada "C · Híbrido de precisión".
- **Pendiente = ACCIÓN HUMANA:** smoke test manual (los 6 pasos ya descritos en el propio plan,
  sección "Verificación end-to-end") — entrar como SA/TH y confirmar la cinta con datos reales,
  clic en un cuello de botella filtra + chip removible aparece, combinar con búsqueda/estado, clic
  en "Listos para traspasar" (cinta o bandeja) da el mismo resultado, hover revela "Ver ficha →" y
  se ve siempre en touch, Control Interno no ve cinta ni bandeja, el Panel dice "Avance por área".
  **Próxima sesión:** sin checklist pendiente de este plan — trabajo nuevo, o el mandato de limpieza
  de código muerto que sigue abierto desde la Sesión 47 (memoria `gestion-desvinculaciones-plan.md`).

### 2026-07-09 — Sesión 50: Modularización de God Objects (backend + web) — plan completo, 11 fases

- **Ejecución del plan** `C:\Users\Leonardo\.claude\plans\iterative-tumbling-grove.md` sobre dos
  archivos que habían crecido por acumulación de sesiones sucesivas: `funcionarioRepository.ts`
  (1327 líneas/29 métodos, "una tabla, tres proyecciones": trámite + maestro de empleados +
  Hoja de Vida 360°) y `BloquesEditables.tsx` (1080 líneas/7 componentes/55 `useState`, editores
  del expediente 360°). Objetivo explícito: **cero cambio de comportamiento, cero regresión de
  tests** — no un recorte mecánico por conteo de líneas. Ejecutado directo por el controlador
  (sin worktree, sin commits — mismo criterio que la remediación de la Sesión 43-44), en varios
  tramos con pausas seguras pedidas por el usuario entre fases. **Sin commits** (constraint
  respetado).
- **Fases 0-2 (backend, sesión previa a esta):** extracción de `expedienteRepo.ts` (12 métodos +
  9 helpers), `mappers.compartidos.ts` (2 mappers) y `empleadoRepo.ts` (6 métodos) — cada uno
  tipado `Pick<FuncionarioRepo, ...>` contra el puerto único, sin fragmentarlo.
  `funcionarioRepository.ts` bajó de 1327→702 líneas en ese punto.
- **✅ Fase 3 (esta sesión) — extraer `tramiteRepo.ts` resolviendo `this.`:** los 12 métodos del
  bloque trámite (`listarGestionArea`, `obtenerDetalle`, `cambiarEstadoArea`, `devolverCasoAArea`,
  `generarLiquidacion`, `registrarLiquidacion`, `archivarCaso`, `obtenerMetricas`,
  `listarFuncionariosPaginado`, `listarMatrizPaginado`, `listarGestionAreaPaginado`,
  `listarArchivo`) se extrajeron a `apps/backend/src/infrastructure/db/funcionario/tramiteRepo.ts`
  (723 líneas). El único riesgo técnico real del plan: 2 de estos métodos se llamaban entre sí vía
  `this.listarFuncionariosPaginado(...)`/`this.listarGestionArea(...)` — imposible de preservar
  como objeto-literal fragmentado sin ambigüedad de `this`. Resuelto declarando las 12 funciones
  como `async function` nombradas de nivel superior (no shorthand de objeto) que se llaman
  directo por nombre, ensambladas al final en `tramiteRepo` vía shorthand de propiedad y tipadas
  `Pick<FuncionarioRepo, ...>` — mismo patrón de tipado que los módulos previos, cero cambio de
  comportamiento. Incluye `mapFuncionario` (con el comentario de invariante `fechaRetiro ?? ""`
  preservado verbatim) y `RANGO_ESTADO_AREA`.
- **✅ Fase 4 (cierre backend):** `funcionarioRepository.ts` quedó como **barrel puro de 12
  líneas** (`import { tramiteRepo, mapFuncionario } ...` + `import { empleadoRepo } ...` +
  `import { expedienteRepo } ...` + `export const funcionarioRepository = {...tramiteRepo,
  ...empleadoRepo, ...expedienteRepo}` + `export { mapFuncionario }`). Confirmado vía `grep` que
  `container.ts` (composition root, 29 inyecciones de casos de uso) sigue importando del mismo
  path exacto, **cero líneas tocadas**. Total backend: 5 archivos, 1418 líneas (vs. 1327 del
  monolito original — el incremento modesto es esperado: imports duplicados por módulo, anotaciones
  de tipo `Pick<...>`, boilerplate de export/re-export; el plan prioriza modularidad/testeabilidad
  sobre minimizar el conteo de líneas).
- **✅ Fase 5 (web) — `compartido.tsx`:** carpeta nueva `apps/web/src/pages/personal/
  bloques-editables/` con `compartido.tsx` (no `.ts`, porque `BotonAbrir`/`FilaGuardarCancelar`/
  `FilaEliminable` son JSX) — los 7 helpers copiados verbatim del monolito.
- **✅ Fase 6 (web) — editores 1-1:** `PersonalesEditor.tsx`, `ContractualEditor.tsx`,
  `SalarialEditor.tsx` — cada uno un archivo nuevo, contenido idéntico al monolito, imports
  reapuntados a la profundidad de carpeta nueva (`../../../hooks/...`, `../../../lib/api`, etc.)
  y a `./compartido`.
- **✅ Fase 7 (web) — editores 1-N:** `FamiliaEditor.tsx`, `FormacionEditor.tsx`,
  `ExperienciaEditor.tsx` — **deliberadamente NO unificados/genericizados** pese a ser
  estructuralmente casi idénticos (mismo patrón lista+agregar+eliminar); el plan documenta esto
  como mejora futura opcional, fuera de alcance de una modularización de "cero cambio de
  comportamiento".
- **✅ Fase 8 (web) — `FotoEditor.tsx` + barrel:** incluye la inconsistencia preexistente ya
  documentada por el plan (`manejarArchivo` usa `e instanceof Error` mientras `quitar()` usa
  `mensajeError`/`ApiError`) **conservada tal cual**, sin "corregir" comportamiento durante una
  modularización. `index.ts` re-exporta los 7 componentes. Typecheck aislado limpio antes de tocar
  el consumidor real.
- **✅ Fase 9 (web) — swap + borrado del monolito:** `ExpedientePage.tsx` cambió una sola línea
  (`from "./BloquesEditables"` → `from "./bloques-editables"`). Confirmado vía `grep -rn` que
  ningún otro archivo importaba el monolito (solo quedaba una mención en un comentario histórico
  de `compartido.tsx`) antes de borrar `BloquesEditables.tsx`.
- **✅ Fase 10 (verificación final completa, todo verde):** `npm run build --workspace=shared`
  OK · `npm run test --workspace=shared` **246/246** · `npx tsc --noEmit --project apps/backend`
  limpio · `npm run test --workspace=apps/backend` **319 pass + 11 skip** (sin regresión — los
  ECONNREFUSED en el log son ruido esperado de 2 smoke tests que golpean intencionalmente una BD
  local inexistente, ya documentado en sesiones previas) · `npm run typecheck --workspace=apps/web`
  limpio · `npm run test --workspace=apps/web` **11/11** · `npm run build` raíz **exit 0 SIN
  warnings** (bundle sin regresión: `index` 335.62 KB / gzip 83.11 KB, `LeccionForm`/Tiptap sigue
  diferido en 412.37 KB). `git status` confirmó el alcance exacto: `funcionarioRepository.ts`
  modificado (barrel), carpeta `funcionario/` nueva (backend), `BloquesEditables.tsx` borrado,
  `ExpedientePage.tsx` modificado (1 línea), carpeta `bloques-editables/` nueva (web) — nada fuera
  de lo planeado.
- **Cero tests nuevos** en toda la ejecución (Fases 3-10), tal como especificaba el plan
  explícitamente — el contenido se copió verbatim en ambos lados, sin lógica nueva que testear.
  **`estado.ts`, `recomputarEstado.ts`, cualquier migración SQL, y las rutas/página de Control
  Interno NO se tocaron.** **Working tree SIN commitear** (constraint respetado).
- **PLAN `iterative-tumbling-grove.md` COMPLETO — 11/11 fases (0-10).**
- **Pendiente = ACCIÓN HUMANA:** smoke manual del expediente `/personal/:id` — abrir un empleado
  real ya existente, confirmar que los 7 bloques satélite renderizan igual que antes de la
  modularización, y probar un ciclo completo editar→guardar/cancelar en al menos un editor 1-1
  (`PersonalesEditor`) y uno 1-N (`FamiliaEditor`), comparando contra el comportamiento previo.
- **Próxima sesión:** sin checklist pendiente de este plan — trabajo nuevo, o el mandato de
  limpieza de código muerto que sigue abierto desde la Sesión 47 (memoria
  `gestion-desvinculaciones-plan.md`).
