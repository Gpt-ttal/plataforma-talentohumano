-- 0023_permisos_rol_modulo.sql — RBAC editable (permisos rol × módulo).
--
-- Hasta hoy la visibilidad de módulos por rol vivía SOLO en código
-- (`shared/src/modulos.ts`, `MODULOS.rolesQueVen`). Esta migración la hace
-- EDITABLE desde la Configuración: una matriz rol × módulo con un nivel de acceso
-- por celda, persistida y releída por request (surte efecto sin re-login, igual que
-- el rol/estado).
--
-- PRINCIPIO (defensa, no puerta trasera): la matriz solo RESTA sobre el piso de
-- seguridad `requireRol`/`exigirRol`. Un rol nunca ve más de lo que su rol ya
-- permitía; la matriz solo puede ocultar/restringir. El router que gobierna la
-- matriz se protege por `requireRol("SUPERADMIN")`, NO por la propia matriz, para
-- que la Configuración jamás pueda cerrarse a sí misma (anti-lockout).
--
-- `modulo_id` es TEXT sin FK ni CHECK: `MODULOS` es código, no una tabla. Validar
-- contra una lista en BD obligaría a una migración por cada módulo nuevo y
-- duplicaría la fuente de verdad. La validación de módulo vive en la aplicación
-- (zod refina contra `MODULOS`).
--
-- SEED: se siembran las celdas VISIBLES (nivel ADMIN para SUPERADMIN, ESCRITURA
-- para el resto), derivadas de `MODULOS.rolesQueVen`. Las celdas no sembradas caen
-- por defecto a NINGUNO en el loader (fallback a `permisosSeedPorDefecto`), de modo
-- que la matriz en BD equivale exactamente a la visibilidad declarada hoy: nadie
-- pierde acceso al aplicar.
--
-- FALLBACK MERGE-SAFE (patrón 0019): mientras esta migración no esté aplicada, el
-- loader del backend detecta la ausencia de la tabla/tipo y cae a la matriz semilla
-- derivada de `MODULOS`. El código se mergea antes de aplicar sin cambiar el
-- comportamiento actual.
--
-- SEGURIDAD: RLS "deny-directo" (ADR-0006) — RLS habilitado sin políticas.

create type nivel_permiso as enum ('NINGUNO', 'LECTURA', 'ESCRITURA', 'ADMIN');

create table permisos_rol_modulo (
  id              uuid primary key default gen_random_uuid(),
  rol             rol_usuario not null,
  modulo_id       text not null,
  nivel           nivel_permiso not null default 'NINGUNO',
  actualizado_por uuid references usuarios(id),
  updated_at      timestamptz not null default now(),
  unique (rol, modulo_id)
);

alter table permisos_rol_modulo enable row level security;

-- Seed derivado de MODULOS.rolesQueVen (solo celdas visibles; el resto = NINGUNO
-- por fallback del loader). SUPERADMIN → ADMIN; otros roles visibles → ESCRITURA.
insert into permisos_rol_modulo (rol, modulo_id, nivel) values
  -- paz-y-salvo: SA, TH, CI, AREA
  ('SUPERADMIN',      'paz-y-salvo',    'ADMIN'),
  ('TALENTO_HUMANO',  'paz-y-salvo',    'ESCRITURA'),
  ('CONTROL_INTERNO', 'paz-y-salvo',    'ESCRITURA'),
  ('AREA',            'paz-y-salvo',    'ESCRITURA'),
  -- capacitaciones: SA, TH, SST
  ('SUPERADMIN',      'capacitaciones', 'ADMIN'),
  ('TALENTO_HUMANO',  'capacitaciones', 'ESCRITURA'),
  ('SST',             'capacitaciones', 'ESCRITURA'),
  -- personal: SA, TH
  ('SUPERADMIN',      'personal',       'ADMIN'),
  ('TALENTO_HUMANO',  'personal',       'ESCRITURA'),
  -- sync-personal: SA, TH
  ('SUPERADMIN',      'sync-personal',  'ADMIN'),
  ('TALENTO_HUMANO',  'sync-personal',  'ESCRITURA'),
  -- vacantes: SA, TH
  ('SUPERADMIN',      'vacantes',       'ADMIN'),
  ('TALENTO_HUMANO',  'vacantes',       'ESCRITURA'),
  -- reportes: SA, TH
  ('SUPERADMIN',      'reportes',       'ADMIN'),
  ('TALENTO_HUMANO',  'reportes',       'ESCRITURA'),
  -- organigrama: SA
  ('SUPERADMIN',      'organigrama',    'ADMIN');
