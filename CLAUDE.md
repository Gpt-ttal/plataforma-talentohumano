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
