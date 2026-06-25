# 🔵 HANDOFF — RETOMAR EN SPEC 2 (Archivo institucional)

> Bloque autocontenido para arrancar el **Spec 2** sin errores. Léelo primero, junto con el
> plan `C:\Users\Leonardo\.claude\plans\a-cocinar-functional-turing.md` (sección SPEC 2) y el
> doc del Spec 1 ya cerrado (`2026-06-24-separacion-th-ci-oficinas-design.md`).
>
> **Regla del plan:** un spec por sesión. El Spec 1 (separación TH/CI) está **completo y verde**.
> Esta sesión = **solo Spec 2**.

---

## 0. Protocolo de arranque (orden exacto, sin saltos)

```bash
cd "c:/Users/Leonardo/SISTEMA PAZ Y SALVO"
npm run build --workspace=shared        # SIEMPRE primero (shared exporta dist/)
npm run test  --workspace=shared        # baseline 86/86
npm run test  --workspace=apps/backend  # baseline 85 pass + 1 skip
npm run typecheck --workspace=apps/web  # limpio
npm run test  --workspace=apps/web      # 9/9
```
`node_modules` ya instalado. Working tree **SIN commitear** (constraint del proyecto; no commitear sin que el usuario lo pida).
Para vivo: A `npm run dev:api` (:3000), B `npm run dev:web` (:5173) — requieren `.env`/`.env.local`.

## 1. Confirmar alcance antes de codear (1 pregunta)

El plan **recomienda bitácora append-only** (`eventos_tramite`). El usuario ya lo aceptó en brainstorming,
pero el plan pide reconfirmar al iniciar la sesión: *"¿Bitácora de eventos inmutable como profundidad de
auditoría, o basta con el detalle actual + metadata?"*. Confirmado eso, ejecutar.

**Decisiones ya cerradas:** acceso **SA + TALENTO_HUMANO** (CI/AREA → 403); export **CSV**; el cierre de CI
(estado terminal `PAZ_Y_SALVO`) es lo que alimenta el archivo.

## 2. ⚠️ CORRECCIÓN al plan (verificada en código) — leer antes de diseñar la bitácora

El plan dice "emitir eventos dentro de las transacciones de **los casos de uso**". **No es así:** los casos de
uso (`apps/backend/src/application/funcionarios/*.ts`) solo hacen **guardas** y delegan; las `db.transaction`
viven en el **repositorio** `apps/backend/src/infrastructure/db/funcionarioRepository.ts`:

- `cambiarEstadoArea` (L235-268) — `tx`: update aprobación (+ observación opcional) → `recomputar(id, tx)`.
- `generarLiquidacion` (L270-299) — `tx`: update hito condicionado a `estadoGlobal='LISTO_PARA_LIQUIDAR'`
  (guarda TOCTOU, `.returning`) → `recomputar(id, tx)`.
- `registrarLiquidacion` (L301-327) — `tx`: update hito condicionado a `'LIQUIDACION_GENERADA'` → `recomputar(id, tx)`.
- `recomputar(funcionarioId, ex)` (L76-135) devuelve `{ estadoGlobal, hayRechazo }`. El `ex: Ejecutor` (L30) ya
  permite correr dentro de `tx` → **mismo patrón para insertar el evento atómicamente**.

**Implicación de diseño:** para que el evento se escriba en la MISMA transacción que la mutación (atomicidad
real), el `INSERT` en `eventos_tramite` debe ir **dentro de esos bloques `tx`** del repositorio. Por tanto:

- El repo necesita el **contexto del actor** (nombre + rol) para el evento. Hoy las firmas del puerto
  `FuncionarioRepo` (`apps/backend/src/domain/ports/FuncionarioRepo.ts`) pasan solo `autor?: string`:
  - `generarLiquidacion(funcionarioId, autor?)` y `registrarLiquidacion(funcionarioId, autor?)`.
  - `cambiarEstadoArea(args)` con `args.autor?`.
  - **Cambio mínimo:** extender esas firmas con el rol del actor (p. ej. `actor: { nombre: string; rol: RolUsuario }`)
    o un objeto `evento` opcional, y emitir dentro del `tx`. Actualizar los **3 casos de uso** que llaman al repo
    (pasan `usuario.nombre` hoy → pasar también `usuario.rol`) y el composition root si cambia el tipo.
- `estadoAnterior`/`estadoNuevo`: en los hitos el anterior es la precondición (`LISTO_PARA_LIQUIDAR` /
  `LIQUIDACION_GENERADA`) y el nuevo sale de `recomputar`. En `cambiarEstadoArea` leer el estado previo dentro
  del `tx` antes del update (o derivarlo) y el nuevo de `recomputar`.

> Alternativa peor (no recomendada): un `EventoRepo` separado con su propia transacción → rompe la atomicidad
> cross-repo. Mantener la emisión dentro del `tx` del `funcionarioRepository` es lo correcto y lo más simple.

## 3. Anclajes para las LECTURAS del archivo

- **Puerto + repo:** las lecturas (`listarArchivo`, `obtenerExpediente`) pueden añadirse como métodos nuevos al
  `FuncionarioRepo`/`funcionarioRepository` (patrón existente: `listarFuncionariosPaginado` L409-465 es la
  plantilla para filtros + paginación con Drizzle; `obtenerDetalle` L170-233 es la plantilla del expediente).
  El **timeline de eventos** se lee de `eventos_tramite` (un `select ... order by created_at`).
- **Composition root:** `apps/backend/src/interface/container.ts` — registrar los casos de uso nuevos en el
  objeto `casos` (mismo patrón factory `useCase({ repo })`).
- **Rutas:** montar `GET /archivo`, `GET /archivo/:id`, `GET /archivo/export` con
  `requireRol("SUPERADMIN", "TALENTO_HUMANO")`. Modelo exacto: `catalogo.routes.ts` ya hace
  `catalogoRouter.use(requireAuth, requireActivo)` + `requireRol("SUPERADMIN","TALENTO_HUMANO")` en `/metricas`
  (L29-33). Crear `archivo.routes.ts` análogo + controller, y montarlo en `app.ts`/`index.ts` (ver cómo se
  montan los routers actuales).
- **CSV en backend** (auth + consistencia): serializar el listado filtrado; `Content-Type: text/csv` +
  `Content-Disposition: attachment`. Columnas del plan: documento, nombre, cargo, área origen, fecha retiro,
  fecha liquidación generada + autor, fecha paz y salvo + autor, **días de trámite** (helper puro nuevo en shared).

## 4. Anclajes para la WEB (`/archivo`, SA+TH)

- Ruta nivel plataforma. **Reutilizar** del Spec 1/diseño existente: `Buscador`, `ChipFiltro`, `Paginacion`
  (toma `basePath`), `hrefCon`, `FilaDesplegable`, `EmptyState`, `PageHeader`, `EstadoPill`. Item de sidebar
  en `Layout.tsx` solo para SA+TH (patrón `sectionsForRole`); añadir a `routeLabels` para el breadcrumb.
- Hooks: patrón `useFuncionarios`/`useMetricas` (TanStack Query, keys inline). Para el export, descargar el blob.
- **Métricas:** reutilizar `shared/src/metricas.ts` (`agregarPorEstado`, `calcularAging`, `agruparPorCampo`,
  `filtrarPorRangoRetiro`) — ya existen y están testeados. El núcleo es listado + expediente + export; métricas, lo justo.
- **Sello:** respetar reglas nombradas (Semáforo Único vía `EstadoPill`, tabular-nums, hairline, sin eyebrows,
  sin filete lateral, oro ≤10%). Pills de estado solo desde `@pys/shared`/`lib/ui`.

## 5. Migración + Supabase

- **Migración `0007_eventos_tramite.sql`** (las 0001–0006 ya existen; 0007 es la siguiente). Tabla append-only
  `eventos_tramite`: `id, funcionario_id (fk), tipo (enum AREA_APROBADA|AREA_RECHAZADA|AREA_NO_APLICA|
  AREA_REINICIADA|LIQUIDACION_GENERADA|PAZ_Y_SALVO_REGISTRADO), area_id (nullable, fk), estado_anterior,
  estado_nuevo, actor, actor_rol, nota (nullable), created_at default now()`. **Sin** privilegios UPDATE/DELETE
  (inmutabilidad por diseño; RLS coherente con `0004_rls_datos.sql`).
- **Drizzle:** declarar la tabla en `apps/backend/src/infrastructure/db/schema.ts` (espejo de la migración;
  los enums de estado ya existen ahí — reusarlos).
- **Aplicar la migración vía MCP de Supabase** (`mcp__supabase__apply_migration`) + correr advisors
  (`mcp__supabase__get_advisors`). Si el MCP no está conectado, queda como acción humana (pasó en Sesión 12 con 0005/0006).
- ⚠️ **Deuda pendiente de infra (no bloquea el Spec 2):** migraciones `0005_revoke_security_definer.sql` y
  `0006_indices.sql` **creadas pero quizá NO aplicadas** (MCP no conectado en Sesión 12). Verificar con
  `mcp__supabase__list_migrations` al arrancar; aplicar 0005/0006 antes o junto con 0007 si faltan.

## 6. Tests (política lean)

- **shared:** helpers puros nuevos (p. ej. `diasDeTramite`, forma del expediente) con sus tests.
- **backend:** guardas 403 de `listarArchivo`/`obtenerExpediente`/export (CI/AREA rechazados; SA/TH ok) — modelo:
  `tests/lecturasCatalogo.test.ts`. Emisión correcta del evento en cada transición (un par de tests de la bitácora;
  los repos se testean con DB gated por `DATABASE_URL_TEST`, `skipIf` — ver `tests/repo-usuarios.integration.test.ts`).
- No testear plomería/presentacional.

## 7. Verificación de cierre (todo debe quedar verde)

```bash
npm run build --workspace=shared
npm run test  --workspace=shared
npm run test  --workspace=apps/backend   # + tests de bitácora y guardas de archivo
npm run typecheck --workspace=apps/web
npm run test  --workspace=apps/web
npm run build                            # raíz exit 0, sin warnings
```
**Smoke:** aplicar 0007 (MCP) → como **TH** ver `/archivo`, filtrar por rango de fecha, abrir un expediente con
timeline de eventos, exportar CSV; como **CI** confirmar 403 en `/archivo` y export. Cerrar un trámite (CI) →
verificar evento `PAZ_Y_SALVO_REGISTRADO` creado y el caso en el archivo.

## 8. Al cerrar la sesión del Spec 2

1. Escribir el doc de diseño `docs/superpowers/specs/2026-06-25-archivo-institucional-design.md` (o fecha real).
2. Actualizar `CLAUDE.md`: §8 "Estado general" (puntero) + §10 Log de sesiones (entrada Sesión 15).
3. Verificar todo verde. **No commitear** salvo que el usuario lo pida.
