# Bitácora compartida Claude ↔ CODEX

Registro cruzado y **append-only** (lo más reciente arriba) para que Claude y CODEX sepan qué hizo
el otro. El protocolo completo está en [`AGENTS.md`](../../AGENTS.md) § 3. Regla de oro: **no edites
entradas ajenas**, agrega la tuya al tope; **no dupliques** la fuente de verdad (referencia a
`docs/`, no copies).

Formato de cada entrada:

```markdown
## AAAA-MM-DD — [CLAUDE | CODEX] — <título corto>

- **Hice:** ...
- **Archivos:** ...
- **Estado:** COMPLETO | EN PROGRESO | PENDIENTE → (otro agente)
- **Verificación:** ...
- **Para el otro agente:** ...
```

---

## 2026-07-27 — CLAUDE — Aplicadas a prod `0022` (allowlist) y `0023` (RBAC editable) por conexión directa

- **Hice:** apliqué a producción `0022_usuarios_preaprobados.sql` y `0023_permisos_rol_modulo.sql` (con
  autorización explícita del usuario). El **MCP de Supabase no estaba conectado**, así que fue por
  **conexión directa** a Postgres (`DATABASE_URL` de `apps/backend/.env` + `pg`), cada una en transacción
  (DDL + registro en `schema_migrations` atómicos): `0022`→`20260727000022`, `0023`→`20260727000023`.
- **Archivos:** solo BD (ninguno de código). Docs actualizados: `CLAUDE.md` §6/§9, `docs/architecture/adr/0010`
  y `0011` (Status→aplicada), `docs/historico/PROGRESO.md` y `LOG-DE-SESIONES.md` (Sesión 57).
- **Estado:** COMPLETO.
- **Verificación:** post-apply OK — columnas/FKs/RLS/0-políticas correctos; `0023` con 16 celdas semilla
  (= visibilidad actual); advisors emulados limpios (`rls_enabled_no_policy` INFO esperado; deny-directo
  real; sin `SECURITY DEFINER` nuevas). Brecha de registro preexistente (`0001`–`0003`, `0021` sin
  trackear en `schema_migrations`) verificada como cosmética; `0022`/`0023` sí quedaron registradas.
- **Para el otro agente (CODEX):** el **gate de allowlist está ACTIVO** con la tabla vacía → **logins
  `@americana` nuevos no pre-aprobados reciben 403** (los usuarios existentes y el `SUPERADMIN_EMAIL` de
  bootstrap siempre entran). Ya **no** hay fallback de autoregistro. Antes de incorporar a alguien, hay
  que pre-aprobar su correo en Configuración → Usuarios. `0023` no cambia comportamiento visible.

## 2026-07-27 — CLAUDE — Saneamiento UI/UX de Vacantes + Personal (a11y, token `aviso`, targets táctiles)

- **Hice:** ejecuté el plan `dise-a-el-plan-ocmpleto-merry-shamir.md` (saneamiento UI/UX de los módulos
  Vacantes y Administración de Personal, sin revertir la refactor página→modal). **Primitivas:**
  `Modal.tsx` gana × de 44px, `aria-labelledby`, guarda dirty-close (contexto + hook exportado
  `useGuardaCierre(activo, id)`), prop `cerrarAlClickFuera` y sin `backdrop-blur`; `compartido.tsx`
  suma `CampoForm` y `MensajeError` (`role="alert"`) y pasa `inputCls` de `bg-white`→`bg-card`.
  **Token nuevo:** 7.º dominio semántico ámbar `--estado-aviso`/`--estado-avisoBg` (`estado.aviso`),
  con retiro del oro **decorativo** (avisos, KPI, badge sugerido, fondos salariales) — el oro de acción
  se conserva. **A11y:** labels persistentes + errores anunciados en todos los editores de ambos
  módulos; `cerrarAlClickFuera={false}` + `ariaLabelledby` en los modales de detalle. **Limpieza:**
  dedup del pill de vínculo (`EstadoVinculacionPill`), h3/eyebrows corregidos, nav "Acciones",
  contraste de flechas de fila, y comentarios obsoletos a `VacanteDetallePage`/`ExpedientePage`
  saneados.
- **Archivos:** `apps/web/src/components/ui/{Modal.tsx,EstadoPill.tsx,ficha/{DetalleModalLayout,CamposDetalle}.tsx}`,
  `apps/web/src/pages/personal/**` (Expediente, CatalogoPersonal, AccionesEmpleado, RegistrarEmpleadoForm,
  ExpedienteEmpleadoModal, ExpedienteBloques, `bloques-editables/*`), `apps/web/src/pages/vacantes/**`
  (VacanteDetalle, VacanteModal, VacanteBloques, AccionesVacante, NuevaVacanteModal, VacantesPage,
  VacantesResumenPage, `secciones/*`), `apps/web/src/pages/cursos/CursoDetallePage.tsx` (comentario),
  `apps/web/src/index.css`, `apps/web/tailwind.config.ts`, `DESIGN.md`. **Sin tocar** `shared/`,
  `apps/backend/`, `supabase/migrations/`.
- **Estado:** COMPLETO (falta solo la inspección visual manual del paso 5 del gate).
- **Verificación:** `build shared` OK · `tsc --noEmit` web limpio · detector Impeccable → `[]` ·
  `npm run build` raíz OK. **Sin commitear.**
- **Para el otro agente (CODEX):** hay una primitiva nueva reutilizable: `useGuardaCierre(activo, id)`
  exportada desde `components/ui/Modal.tsx` — úsala en cualquier editor dentro de un `<Modal>` para que
  pida confirmación al cerrar con una edición abierta (es no-op fuera de modal). Los campos de
  formulario ahora se etiquetan con `CampoForm` y los errores con `MensajeError` (ambos en
  `pages/personal/bloques-editables/compartido.tsx`). Para avisos/advertencias informativas usa el token
  `estado.aviso` (ámbar), **no** `gold-*` (el oro quedó reservado a acción e hito).

## 2026-07-27 — CLAUDE — Suite de Configuración: allowlist + RBAC editable + catálogos + paletas (TDD, 4 fases)

- **Hice:** suite `/configuracion` adaptada de SIGAF (`zesty-imagining-thacker.md`). **F1:** shell +
  General/Apariencia/Seguridad/Sistema. **F2 (allowlist, ADR-0010):** `asegurarUsuario` invertido a gate
  por correo pre-aprobado (tabla `usuarios_preaprobados`, migración `0022` **no aplicada**, fallback al
  autoregistro si la tabla no existe). **F3 (RBAC editable, ADR-0011):** matriz rol×módulo que RESTA
  sobre `requireRol` (`shared/src/permisosRbac.ts`, tabla `permisos_rol_modulo`/enum `nivel_permiso`,
  migración `0023` **no aplicada**, fallback a semilla de `MODULOS`); `requirePermiso` en los 9 routers
  de módulo + filtrado de sidebar/lanzador; triple anti-lockout. **F4:** Catálogos (reusa áreas) +
  `PaletteContext` (acento por variables CSS, no toca `estado-*`). Detalle en `LOG-DE-SESIONES.md`
  (Sesión 55).
- **Archivos:** nuevos en `apps/web/src/pages/configuracion/*`, `apps/web/src/context/PaletteContext.tsx`,
  `apps/web/src/hooks/{usePermisos,usePreaprobados}.ts`; backend `application/{preaprobados,permisos}/*`,
  `domain/ports/{PreaprobacionRepo,PermisoRepo}.ts`, `infrastructure/db/{preaprobacion,permiso}Repository.ts`,
  `interface/{controllers,routes}/…`, `middleware/requirePermiso.ts`; `shared/src/permisosRbac.ts`,
  `schemas.ts`, `domain.ts`; migraciones `0022`/`0023`; `schema.ts` (espejo). Modificados: `App.tsx`,
  `Layout.tsx`, `container.ts`, `app.ts`, los 9 routers de módulo, `asegurarUsuario.ts`, `api.ts`.
- **Estado:** COMPLETO en código (migraciones `0022`/`0023` gated, no aplicadas).
- **Verificación:** `build shared` OK · shared 321 · backend 385 (unit) · web 15 · `tsc` backend+web
  limpios · `build` raíz OK. Working tree sin commitear.
- **Para el otro agente (CODEX):** las migraciones `0022`/`0023` están escritas + espejadas pero **NO
  aplicadas**; el backend cae a fallback (autoregistro histórico / semilla `MODULOS`). No las apliques
  sin autorización explícita del usuario. `MODULOS` sigue siendo la fuente de módulos; la matriz solo
  filtra. Al agregar un módulo: fila en `MODULOS` + item en `sectionsForRole` + ruta (la matriz no lo
  sustituye).

## 2026-07-25 — CLAUDE — Coherencia entre módulos (Tiers 1-5): bug F1 + sincronía + guardas + blindaje sync (TDD)

- **Hice:** ejecuté el plan de coherencia entre módulos (`wise-seeking-moonbeam.md`). **Tier 1 (bug real):**
  `cambiarActivaArea` ahora re-siembra la aprobación faltante al REACTIVAR un área (trámites en curso
  nacidos con el área inactiva ya no suben sin su visto bueno). **Tier 2 (`realtime.ts`):** `invalidarTramite`
  delega en `invalidarVistasTramite` (fuente única; arregla `["expediente"]`); + suscripciones a `areas`
  y `usuarios`. **Tier 3:** icono `chart-bar` agregado + dos guardas (`iconos-modulos`, `sidebar-modulos`);
  ADR-0007 y CLAUDE §7 corregidos (lanzador se deriva, sidebar se **valida**). **Tier 4:** `aplicarRegistroSync`
  omite retirados (`SYNC_OMITIDO_RETIRADO`) y no pisa `cargo`/`fechaFinContrato` en existentes. **Tier 5:**
  drift doc + se eliminó el duplicado `ETIQUETA_VINCULO` (→ `TIPO_VINCULO_LABEL`). Detalle en
  `LOG-DE-SESIONES.md` (Sesión 54).
- **Archivos:** `apps/backend/src/infrastructure/db/areaRepository.ts`, `.../syncPersonal/aplicarRegistroSync.ts`,
  `.../funcionario/tramiteRepo.ts` (comentario); `apps/web/src/lib/realtime.ts`,
  `apps/web/src/components/ui/dash/Icon.tsx`, `apps/web/src/components/Layout.tsx`; `shared/src/capacitaciones.ts`,
  `shared/src/schemas.ts` (comentario); tests nuevos/ampliados (`iconos-modulos`, `sidebar-modulos`,
  `concurrencia-estadoArea.integration`, `sync-personal.integration`, `capacitaciones`); docs
  (`ADR-0007`, `CLAUDE.md` §7, `DICCIONARIO-DATOS.md`).
- **Estado:** COMPLETO (código + gate verde). Working tree SIN commitear.
- **Verificación:** `build shared` OK · shared 312 · backend 370 pass + 23 skip · web 15 · `tsc`/`typecheck`
  limpios · `build` raíz OK. Tests de integración (F1 + sync) **gated por `DATABASE_URL_TEST`**, no corridos aquí.
- **Para el otro agente (CODEX):** falta **autorización** para `ALTER PUBLICATION supabase_realtime ADD TABLE
  public.areas, public.usuarios;` — hasta entonces R1/R3 no reciben eventos (el código es inocuo sin eso).
  La `0019` sigue **sin aplicar**. Sigue en cola el plan de **modales** de detalle (`peppy-forging-lantern.md`),
  sin conflicto con esto.

## 2026-07-24 — CLAUDE — Auditoría de sincronización + puente Vacante→Funcionario (ADR-0009, TDD)

- **Hice:** auditoría BD↔backend↔contratos↔frontend + acoplé Vacantes con Personal. **Puente
  Vacante→Funcionario:** marcar una vacante `CONTRATADO` crea el empleado ACTIVO en la MISMA
  transacción (`crearFuncionarioDesdeVacante`, patrón `iniciarTramiteDesvinculacion`), en `crearVacante`
  y `actualizarVacante` (con `FOR UPDATE`). Nuevo BLOQUEO de dominio: no se puede contratar sin área.
  Mapeo dedicación→`tipoVinculacion` (docentes→DOCENTE). Cédula duplicada → `ErrorValidacion` + rollback.
  Saneamientos: `sync-personal` ACTIVO→PROXIMO, `invalidarCapacitaciones` en realtime, link Control
  Interno para SA, clave de auditoría del sync `fondoCesantias`→`fondoPensionCesantias`. Detalle en
  `LOG-DE-SESIONES.md` (Sesión 53) y [ADR-0009](../architecture/adr/0009-puente-vacante-funcionario.md).
- **Archivos:** `shared/src/vacantes.ts` (+ `tests/vacantes.test.ts`, `modulos.ts`, `tests/modulos.test.ts`);
  `apps/backend/src/infrastructure/db/{crearFuncionarioDesdeVacante.ts nuevo, vacanteRepository.ts,
  syncPersonal/aplicarRegistroSync.ts}`, `domain/ports/VacanteRepo.ts`, `application/vacantes/{crear,actualizar}Vacante.ts`,
  `tests/{vacantes.test.ts, sync-personal.integration.test.ts, crearFuncionarioDesdeVacante.integration.test.ts nuevo}`;
  `apps/web/src/{lib/realtime.ts, components/Layout.tsx}` (+ `tests/Layout.test.tsx`); ADR-0009 + índice,
  `CLAUDE.md`, `DOMINIO.md`, `DICCIONARIO-DATOS.md`, `PROGRESO.md`.
- **Estado:** COMPLETO (código + docs). **NO commiteado** (constraint del proyecto).
- **Verificación:** `build shared` OK · shared 311 · web 12 · backend 370 + 20 skip · `tsc` backend/web
  limpio · `npm run build` raíz OK. Integration del puente **gated `DATABASE_URL_TEST`** — no corridas
  contra prod (escriben filas). Migraciones: ninguna nueva; `0019` sigue sin aplicar.
- **Para el otro agente (CODEX):** `VacanteRepo.{crear,actualizar}Vacante` ahora reciben `autor` como
  3er/4º argumento — si tocas ese puerto, pásalo. El puente vive 100% en infraestructura + un BLOQUEO
  de dominio en `evaluarFila`; no lo dupliques en la capa de aplicación. Contratar una vacante YA crea
  el funcionario, no lo re-implementes.

## 2026-07-23 — CLAUDE — Módulo Vacantes — fundación backend (TDD) + migración `0020` en producción

- **Hice:** fusioné `sistema-seguimiento-vacantes-v1` (aparte, Google Apps Script+Sheets) como módulo
  nativo: dominio puro (`shared/src/vacantes.ts`), 5 catálogos con FK (patrón `fondos_sede`), tabla
  `vacantes`, cadena hexagonal completa (7 endpoints `/api/vacantes`, roles SA+TH). Detalle completo en
  `LOG-DE-SESIONES.md` (Sesión 52); plan en `temporal-puzzling-gray.md`.
- **Archivos:** `shared/src/{vacantes.ts nuevo, index.ts, ui.ts, schemas.ts, modulos.ts}`;
  `supabase/migrations/0020_vacantes.sql` (nueva, **aplicada**); `apps/backend/src/infrastructure/db/schema.ts`;
  `apps/backend/src/domain/ports/VacanteRepo.ts` (nuevo);
  `apps/backend/src/infrastructure/db/vacanteRepository.ts` (nuevo);
  `apps/backend/src/application/vacantes/*` (7 nuevos) + `application/index.ts`;
  `apps/backend/src/interface/{controllers/vacantesController.ts nuevo, routes/vacantes.routes.ts nuevo,
  container.ts, app.ts}`; tests `shared/tests/{vacantes.test.ts nuevo, schemas.test.ts, ui-pills.test.ts}` +
  `apps/backend/tests/vacantes.test.ts` (nuevo).
- **Estado:** backend COMPLETO y en prod (esquema). **UI: PENDIENTE** — el usuario pidió explícitamente
  diseñar la arquitectura de UI/UX completa (spec) **antes** de escribir código de pantallas en la
  próxima sesión.
- **Verificación:** `build shared` OK · shared 299 · backend `tsc --noEmit` limpio · backend 366 pass +
  15 skip · web 11 (sin tocar) · `npm run build` raíz OK. **Sin commitear.**
- **Para el otro agente (CODEX):** la migración `0020_vacantes.sql` **ya está aplicada a producción**
  (yo la apliqué vía `psql` directo porque el MCP de Supabase no estaba conectado en mi sesión; quedó
  registrada en `supabase_migrations.schema_migrations`). Si usas el MCP de Supabase y `list_migrations`
  no la refleja por algún desfase de caché, la tabla real (`vacantes` + 5 catálogos) ya existe y tiene
  RLS deny-directo activa — no la re-apliques. La `0019` (sync) sigue sin aplicar, no la toques sin
  pedido explícito. No hay UI de Vacantes todavía; si el usuario te pide UI antes de ver un spec de
  diseño, avísale que quedó pendiente el diseño de UI/UX primero.

## 2026-07-21 — CLAUDE — Sync de Personal desde Iceberg — Fases 1-3/7 (EN PROGRESO, pausa planificada)

- **Hice:** arranqué el módulo `sync-personal` (ingesta de 28 atributos de Iceberg → staging con
  revisión → upsert por documento). Fases 1-3/7 del plan `toasty-gathering-perlis.md`: dominio
  (`shared`), migración `0019` + espejo Drizzle, y capa de aplicación (port + ACL pura + 3 casos de
  uso) con TDD. Detalle en `LOG-DE-SESIONES.md` (Sesión 51); diseño en
  `docs/superpowers/specs/2026-07-21-sync-iceberg-*`.
- **Archivos:** `shared/src/{sync.ts nuevo, domain.ts, schemas.ts, ui.ts, modulos.ts, index.ts}`;
  `supabase/migrations/0019_sync_personal.sql` (nueva); `apps/backend/src/infrastructure/db/schema.ts`;
  `apps/backend/src/domain/ports/{SyncPersonalRepo.ts nuevo, FuncionarioRepo.ts}`;
  `apps/backend/src/infrastructure/sync/parsearRegistrosIceberg.ts` (nuevo);
  `apps/backend/src/infrastructure/db/funcionario/expedienteRepo.ts`;
  `apps/backend/src/application/{sync-personal/* nuevos, personal/obtenerExpedientePersonal.ts, index.ts}`;
  tests `shared/tests/schemas.test.ts` + `apps/backend/tests/{sync-personal.test.ts nuevo, personal.test.ts}`.
- **Estado:** EN PROGRESO → Fases 4-7 pendientes (infra DB, HTTP+API key, frontend, gate).
- **Verificación:** `build shared` OK · shared 255 · backend `tsc --noEmit` limpio · backend 337
  (unitarios). Web sin verificar aún (Fase 6). **Sin commitear.**
- **Para el otro agente (CODEX):** la **migración `0019` está escrita pero NO aplicada a producción**
  (prod sigue en 0001-0018). No la apliques sin que Leonardo lo pida. `schema.ts` ya la refleja, así
  que el `tsc` compila contra el esquema nuevo aunque la BD real aún no lo tenga. Si tocas el
  expediente, ojo: `FuncionarioRepo.obtenerExpediente` ahora lleva `(id, incluyeSalarial, incluyeBancario)`.

## 2026-07-21 — CLAUDE — Reestructuración de documentación + mecanismo de cooperación IA

- **Hice:** reestructuré todo el sistema documental. Nuevos: `README.md`,
  `docs/architecture/ARCHITECTURE.md`, 8 ADRs + índice en `docs/architecture/adr/`,
  `docs/domain/DOMINIO.md`, `docs/data/DICCIONARIO-DATOS.md` (1:1 con `schema.ts`), y el mecanismo de
  cooperación Claude↔CODEX (`AGENTS.md` + esta bitácora). Moví el histórico de `CLAUDE.md` §8/§10 a
  `docs/historico/PROGRESO.md` + `LOG-DE-SESIONES.md`. Adelgacé `CLAUDE.md` de 3059 → 206 líneas
  (punteros, sin duplicación). Poblé la memoria persistente de Claude (estaba vacía): 6 memorias +
  `MEMORY.md`.
- **Archivos:** `CLAUDE.md` (M), `README.md`, `AGENTS.md`, `docs/architecture/**`, `docs/domain/**`,
  `docs/data/**`, `docs/historico/**` (nuevos). Sin tocar `apps/`, `shared/`, `supabase/migrations/`.
- **Estado:** COMPLETO (documentación pura; nada de código de aplicación).
- **Verificación:** N/A build/tests (docs). Chequeos de integridad: `CLAUDE.md` sin duplicación (0),
  `git status` solo `.md`/docs, memoria indexada en `MEMORY.md`.
- **Para el otro agente (CODEX):** desde ahora, arranca leyendo `AGENTS.md` → esta bitácora → `CLAUDE.md`.
  Cuando trabajes, agrega tu entrada aquí al terminar. La arquitectura y el dominio ya están
  documentados en `docs/` — úsalos como referencia, no reinventes. Constraint duro vigente: sin commits
  ni migraciones a prod sin que Leonardo lo pida explícitamente.
