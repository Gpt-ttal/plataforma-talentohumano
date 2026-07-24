# Progreso del Proyecto — estado actual

> **Qué es verdad HOY** por feature (1 párrafo cada una). El **cómo se llegó ahí**, sesión por sesión,
> vive en [`LOG-DE-SESIONES.md`](LOG-DE-SESIONES.md). Al cerrar una sesión que cambie el estado de una
> feature, actualiza el párrafo correspondiente aquí y agrega el detalle al Log.

**Estado global:** producto maduro en producción. Working tree **sin commitear** (constraint del
proyecto); la BD de producción está alineada con las migraciones `0001`–`0018` + `0020` (la `0019`
sigue sin aplicar). Todos los gates en verde en el último cierre (Sesión 52): shared 299/299 · backend
366 pass + 15 skip · web 11/11 · `npm run build` raíz exit 0 sin warnings.

---

## Plataforma (base)

- **Migración a monorepo Vite + Express** — COMPLETA. El árbol Next.js ya no existe. Auth híbrida
  (Supabase Auth + autorización centralizada en el backend). Ver ADR-0001/0002.
- **Registro declarativo de módulos + Supabase Realtime** — COMPLETO. Sidebar y lanzador leen de
  `shared/src/modulos.ts`; sincronía en vivo por canal `plataforma-sync`. Ver ADR-0007.
- **Theming claro/oscuro** — COMPLETO (tokens CSS semánticos, toggle en sidebar/header).
- **Herramienta de dev — impersonación de rol** — COMPLETA (solo para el SUPERADMIN real).

## Paz y Salvo (núcleo)

- **Flujo completo del trámite** — EN PRODUCCIÓN: cola por área, visto bueno, relevo TH↔CI,
  liquidación, paz y salvo final, archivo institucional (solo lectura + export CSV). Máquina de
  estados pura verificada (ADR-0005); concurrencia garantizada en BD (ADR-0008).
- **Catálogo de áreas (CRUD) + vistas por área** — COMPLETO (crear con backfill, activar/desactivar,
  reordenar; matriz funcionario × área).
- **Panel de control (SA/TH)** — COMPLETO (métricas, gráficas Recharts, segmentadores, aging).
- **"Avance por Área" potenciado** — COMPLETO (cinta de KPIs accionable, filtros combinables por URL
  incl. `areaBloqueante`, bandeja de traspaso, rediseño visual "Híbrido de precisión"). Es la oficina
  de trabajo de SA/TH tras consolidar las vistas redundantes.

## Formación

- **Capacitaciones (eventos con QR)** — EN PRODUCCIÓN. Crear → abrir registro → QR → registro público
  de asistencia por cédula (idempotente) → export CSV. Rol SST. Tablas `0007`/`0008` en prod.
- **Cursos (tomar por cédula, sin login)** — CÓDIGO COMPLETO, tablas `0012`/`0013` en prod. Crear →
  módulos/lecciones (editor Tiptap) → publicar → tomar por cédula → completar lección → progreso en
  vivo. **Pendiente: smoke test manual de 11 pasos.**
- **Planificador (calendario anual)** — CÓDIGO COMPLETO (mismo estado que Cursos). CRUD + vista
  lista/calendario de 12 meses.

## Administración de Personal

- **Personal v1 (maestro de empleados + puente "Finalizar contrato")** — EN PRODUCCIÓN, 534 empleados
  importados vía ETL. "Una tabla, dos proyecciones" (ADR-0003).
- **Personal v2 (Hoja de Vida 360°)** — EN PRODUCCIÓN. Expediente completo con tablas satélite,
  captura por bloque, foto en Storage, bloque salarial con RLS estricta (ADR-0004). Migraciones
  `0009`/`0010`/`0011` + ETL v2 en prod.
- **Sync de Personal desde Iceberg (módulo `sync-personal`)** — EN PROGRESO (Fases 1-3/7). Ingesta de
  28 atributos de Iceberg por dos canales (servicio n8n API-key + carga manual TH) → staging con
  revisión → upsert por documento. Hechas: dominio (`shared`), migración `0019` (**escrita, NO aplicada
  a prod**) + espejo Drizzle, y capa de aplicación (port `SyncPersonalRepo`, ACL pura
  `parsearRegistrosIceberg`, casos de uso ingesta/obtener/confirmar) con TDD. Bloque bancario
  (`empleado_bancario`) creado como **placeholder** (estructura se cierra con el payload real).
  Pendientes: Fases 4-7 (infra DB, HTTP+API key, frontend, gate). Diseño en
  `docs/superpowers/specs/2026-07-21-sync-iceberg-*`; plan `toasty-gathering-perlis.md`.

## Vacantes

- **Módulo completo (backend + UI + acoplamiento con Personal)** — Fusión adaptada de un sistema
  aparte (Google Apps Script + Sheets) como módulo nativo: dominio puro (`shared/src/vacantes.ts`,
  `derivarVacante`/`evaluarFila`/`calcularDashboardVacantes`), catálogos con llave (patrón
  `fondos_sede`), cadena hexagonal completa (7 endpoints REST bajo `/api/vacantes`, roles SA+TH) y UI
  enrutada (`apps/web/src/pages/vacantes/`). Migraciones `0020_vacantes.sql` y `0021_vacante_areas.sql`
  **aplicadas a producción** (0021 repunta `area_id` al catálogo propio `vacante_areas`).
- **Puente Vacante→Funcionario** (Sesión 53, [ADR-0009](../architecture/adr/0009-puente-vacante-funcionario.md)):
  marcar `CONTRATADO` crea el empleado ACTIVO en la misma transacción (`area_origen` = nombre del
  área; `tipoVinculacion` inferido de la dedicación; cédula duplicada bloquea con rollback). Nuevo
  BLOQUEO de dominio: no se puede contratar sin área. Realtime propaga a `["personal"]`.

## Gestión de Desvinculaciones

- **COMPLETA** (13/13 ítems, migraciones `0014`–`0018` en prod). Nuevo estado `DEVUELTO_POR_CI`,
  archivado formal, bitácora `eventos_auditoria`, inversión de guardas TH↔CI, e importación masiva de
  desvinculaciones (Excel → previsualizar → confirmar parcial). **Pendiente: smoke test manual del
  circuito completo.**

## Calidad / mantenimiento

- **Auditoría de backend + BD** — 11 hallazgos cerrados o aceptados (Sesiones 39–41).
- **Remediación idempotencia/caché/fallos silenciosos** — 17/17 tareas (Sesiones 43–44).
- **Modularización de god objects** (`funcionarioRepository.ts`, `BloquesEditables.tsx`) — COMPLETA,
  cero cambio de comportamiento (Sesión 50).

---

## Pendientes vivos

- **Auto-inscripción en inducción (backlog, feature nueva):** cuando el puente Vacante→Funcionario
  (ADR-0009) crea un empleado, aún NO se le inscribe automáticamente en Capacitaciones/Cursos de
  inducción. No es una inconsistencia (`asistencias`/`inscripciones` son autónomas por diseño), sino
  una feature futura; requiere decidir qué evento/curso dispara la inscripción.
- **Smoke tests manuales** (acción humana): circuito de Desvinculaciones; 11 pasos de Cursos/
  Planificador; expediente 360° tras la modularización; contratar una vacante y verificar el alta del
  funcionario end-to-end (puente ADR-0009).
- **Mandato abierto desde Sesión 47:** limpieza estricta de código muerto/legacy con evidencia
  (aún sin ejecutar; esperar pedido explícito del usuario).
- **Sync de Personal (Iceberg):** Fases 4-7 pendientes (ver Administración de Personal). Aplicar la
  migración `0019` a prod requiere autorización explícita. TBD de diseño: estructura real de
  `empleado_bancario`, semántica de `categoria`, contrato de transporte n8n (con Analítica), seed
  real de `fondos_sede`, motor de reglas (punto de extensión documentado, no implementado).
