# Progreso del Proyecto — estado actual

> **Qué es verdad HOY** por feature (1 párrafo cada una). El **cómo se llegó ahí**, sesión por sesión,
> vive en [`LOG-DE-SESIONES.md`](LOG-DE-SESIONES.md). Al cerrar una sesión que cambie el estado de una
> feature, actualiza el párrafo correspondiente aquí y agrega el detalle al Log.

**Estado global:** producto maduro en producción. Working tree **sin commitear** (constraint del
proyecto); la BD de producción está alineada con las migraciones `0001`–`0018` + `0020` + `0021` +
`0022` + `0023` (esta última pareja aplicada el 2026-07-27 por conexión directa; la `0019` sigue sin
aplicar). Todos los gates en verde en el último cierre (Sesión 54): shared 312 · backend
370 pass + 23 skip · web 15 · `tsc`/`typecheck` limpios · `npm run build` raíz exit 0 sin warnings.
Pendiente de autorización: `ALTER PUBLICATION … ADD TABLE areas, usuarios` (habilita el realtime de esos
catálogos, ya cableado en `realtime.ts`).

---

## Plataforma (base)

- **Migración a monorepo Vite + Express** — COMPLETA. El árbol Next.js ya no existe. Auth híbrida
  (Supabase Auth + autorización centralizada en el backend). Ver ADR-0001/0002.
- **Registro declarativo de módulos + Supabase Realtime** — COMPLETO. El **lanzador** se deriva de
  `shared/src/modulos.ts`; el **sidebar** (navegación granular) se **valida** contra `MODULOS` por
  tests-guarda (no se deriva). Sincronía en vivo por canal `plataforma-sync` (invalidación de trámite
  centralizada en `invalidarVistasTramite`; suscritos también `areas`/`usuarios`). Ver ADR-0007.
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

## Configuración (suite de ajustes)

- **EN PRODUCCIÓN** (Sesión 55 en código; migraciones `0022`/`0023` aplicadas el 2026-07-27, adaptada de la Configuración de SIGAF).
  Suite `/configuracion` (shell + aside por rol) con 7 sub-páginas: **General**, **Apariencia** (tema
  claro/oscuro + selector de paleta de acento vía `PaletteContext`), **Seguridad** (identidad de sesión +
  cerrar sesión), **Sistema** (health check), **Usuarios** (allowlist + gestión de registrados),
  **Roles y permisos** (matriz RBAC editable), **Catálogos** (áreas de visto bueno). Visible a todos los
  roles activos; las de gobierno (Usuarios/Roles/Catálogos) solo SA.
- **Allowlist de acceso** ([ADR-0010](../architecture/adr/0010-allowlist-acceso-por-correo.md)): el
  autoregistro se invirtió a pre-aprobación por correo — solo emails que el SA autoriza pueden crear su
  cuenta al primer login (el SA de bootstrap y los usuarios existentes siempre entran). Tabla
  `usuarios_preaprobados` (migración `0022`, **aplicada 2026-07-27**; gate **activo**). Allowlist
  actualmente vacía → poblarla en Configuración → Usuarios para incorporar correos nuevos.
- **RBAC editable** ([ADR-0011](../architecture/adr/0011-rbac-editable-matriz-resta.md)): matriz rol ×
  módulo (`NINGUNO/LECTURA/ESCRITURA/ADMIN`) que solo RESTA sobre `requireRol`. Dominio puro en
  `shared/src/permisosRbac.ts`; enforcement por `requirePermiso` (ruta) + filtrado de sidebar/lanzador
  (respeta impersonación). Triple anti-lockout (router por `requireRol`, SA inmutable, columna SA
  deshabilitada). Tabla `permisos_rol_modulo` (migración `0023`, **aplicada 2026-07-27**; 16 celdas
  semilla = visibilidad actual, sin cambio observable). Lectura fresca por request → cambios sin re-login.

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
- **Poblar la allowlist + smoke de Configuración (tras aplicar `0022`/`0023` el 2026-07-27):** ambas
  migraciones ya están en prod y el gate de allowlist está **activo** con la tabla **vacía** → cualquier
  login `@americana` nuevo y no pre-aprobado recibe **403** (los existentes y el SA de bootstrap siempre
  entran). Acción pendiente: agregar en Configuración → Usuarios los correos a incorporar, y smoke manual
  de la suite (pre-aprobar un correo, verificar primer login; editar la matriz RBAC y verificar el efecto
  sin re-login). Nota de registro: `0001`–`0003` y `0021` figuran aplicadas en el schema pero no en
  `schema_migrations` (brecha histórica de trackeo); `0022`/`0023` sí quedaron registradas.
- **Sync de Personal (Iceberg):** Fases 4-7 pendientes (ver Administración de Personal). Aplicar la
  migración `0019` a prod requiere autorización explícita. TBD de diseño: estructura real de
  `empleado_bancario`, semántica de `categoria`, contrato de transporte n8n (con Analítica), seed
  real de `fondos_sede`, motor de reglas (punto de extensión documentado, no implementado).
