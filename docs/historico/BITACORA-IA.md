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
