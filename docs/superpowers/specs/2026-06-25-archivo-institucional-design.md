# Spec 2 — Archivo institucional de desvinculados/liquidados

> Fecha: 2026-06-25 · Estado: implementado y verificado · Parte 2 de 2 (la parte 1
> fue la separación TH/CI en oficinas dedicadas).

## Contexto

Faltaba un **registro histórico institucional** de los funcionarios cuyo trámite
de paz y salvo ya cerró (`PAZ_Y_SALVO`), con su metadata, para consulta y
auditoría de la plataforma de gestión (Talento Humano). El cierre de Control
Interno es lo que alimenta este archivo.

## Decisión de alcance (acordada con el usuario)

Se evaluó introducir una **bitácora append-only** (`eventos_tramite`) como
profundidad de auditoría. **El usuario optó por "solo detalle actual + metadata"**:
el Archivo es una vista de **solo lectura sobre los datos que ya existen**
(`funcionarios` en estado terminal + sus `aprobaciones`/`observaciones` + los
hitos con autor/fecha que ya guarda `funcionarios`). Consecuencias:

- **Sin tabla nueva, sin migración, sin cambios de esquema.** No se aplicó ninguna
  migración vía MCP (Spec 2 no toca la BD).
- **No se tocó la ruta crítica del trámite** (las `db.transaction` del repo, los
  casos de uso de mutación ni la máquina de estados). La "corrección verificada"
  del handoff (emitir eventos dentro de las `tx`) quedó sin objeto.

Otras decisiones: **acceso SUPERADMIN + TALENTO_HUMANO** (CI y AREA → 403);
export **CSV**; **"días de trámite" = fecha de retiro → paz y salvo** (duración
institucional real del proceso).

## Diseño

### shared (`@pys/shared` · `src/archivo.ts`, nuevo)

- `FiltroArchivo` — filtro tipado del listado (q + rango de fecha de retiro +
  paginación; el estado `PAZ_Y_SALVO` es implícito).
- `diasDeTramite(fechaRetiro, fechaLiquidacion)` — días completos entre el retiro
  y el cierre; `null` si el trámite no está cerrado o si alguna fecha es inválida.
- `parseFiltroArchivo(raw)` — normaliza los `searchParams` crudos.
- `construirCsvArchivo(funcionarios)` — serialización CSV pura (encabezado + fila
  por funcionario, con escape de comas/comillas/saltos). Reutilizada por el backend.
- **+10 tests** (`shared/tests/archivo.test.ts`). Barrel actualizado.

### apps/backend

- **Puerto + repo** (`FuncionarioRepo` / `funcionarioRepository`): nuevo
  `listarArchivo(filtro)` — `PAZ_Y_SALVO` + búsqueda + rango de fecha de retiro +
  paginación (modelo `listarFuncionariosPaginado`; orden por cierre más reciente).
  El expediente **reusa `obtenerDetalle`** (no se añadió lectura nueva).
- **Casos de uso** (`application/archivo/`): `listarArchivo`, `obtenerExpediente`
  (reusa el detalle), `exportarArchivo` (serializa TODO el conjunto filtrado, no
  una página). Los tres con guarda `exigirRol("SUPERADMIN","TALENTO_HUMANO")`.
  Registrados en `container.ts`.
- **HTTP** (`interface/`): `archivoController` (lee el filtro del query; el export
  fija `text/csv` + `Content-Disposition` + BOM para Excel) y `archivo.routes.ts`
  (`GET /api/archivo`, `/archivo/export`, `/archivo/:id`) tras
  `requireAuth, requireActivo, requireRol("SUPERADMIN","TALENTO_HUMANO")`.
  `/export` se monta antes de `/:id`. Montado en `app.ts`.
- **+11 tests** (`tests/archivo.test.ts`): 403 para CI/AREA en las tres
  operaciones, 404 del expediente, delegación correcta y export del conjunto completo.

### apps/web

- `lib/api.ts`: helper `requestBlob` (descarga binaria con el mismo Bearer) +
  `apiArchivo` (listar/expediente/exportCsv).
- `hooks/useArchivo.ts`: `useArchivo` (listado) + `useExpediente` (detalle).
- `pages/archivo/ArchivoPage.tsx`: listado de solo lectura (reusa
  `Buscador`/`Paginacion`/`FilaDesplegable`/`EmptyState`/`PageHeader`) + filtro de
  rango de fecha de retiro server-driven + botón **Exportar CSV** (descarga blob) +
  enlace por fila al expediente. Muestra "días de trámite" (tabular-nums).
- `pages/archivo/ExpedienteModal.tsx`: ruta hija `:id` → `Modal` que reusa
  `DetalleFuncionario` (la traza disponible).
- `App.tsx`: ruta `/archivo` (`SUPERADMIN`+`TALENTO_HUMANO`) con hijo `:id`.
- `Layout.tsx`: item "Archivo" en el sidebar (sección Administración) para SA y TH;
  ícono `archive` nuevo; `routeLabels` para el breadcrumb.

### Sello

Respetadas las reglas nombradas: pills de estado solo vía `EstadoPill`
(Semáforo Único), números tabulares, hairline-primero, sin eyebrows, sin filete
lateral, oro ≤10%. (Findings preexistentes del hook impeccable en `index.css`
—`rgba(254,252,248,0.94)` y `Sfmono-Regular`— son valores del Sello portados
verbatim de sesiones anteriores, ajenos a este spec.)

## Verificación

```
shared 96/96 · backend 96 pass + 2 skip · web typecheck limpio + 9/9 ·
build raíz exit 0 sin warnings
```

Smoke pendiente (humano, requiere `.env`): como **TH** ver `/archivo`, filtrar por
rango de fecha, abrir un expediente, exportar CSV; como **CI/AREA** confirmar 403
en `/archivo` y `/archivo/export`. Verificar que un trámite recién cerrado por CI
aparece en el archivo.
