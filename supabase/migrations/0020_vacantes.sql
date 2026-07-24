-- 0020_vacantes.sql — Módulo Vacantes (fundación backend).
--
-- Fusión adaptada del sistema aparte "sistema-seguimiento-vacantes-v1" (Google
-- Apps Script + Sheets) como módulo nativo de la plataforma. Consigna rectora:
-- Adaptación · Refinamiento · Mejora — NO es una traducción línea por línea.
--
-- Cambios (100% aditivos):
--   1) 3 enums de MÁQUINA DE ESTADOS (la lógica los recorre exhaustivamente,
--      por eso NO son catálogo): estado_vacante, fase_vacante,
--      aprobacion_presupuesto_vacante.
--   2) 5 tablas de CATÁLOGO CON LLAVE (patrón `fondos_sede`: id/clave/nombre/
--      activo/orden), sembradas con los valores canónicos del v1:
--      vacante_modalidades, vacante_dedicaciones, vacante_escalafones,
--      vacante_motivos, vacante_fuentes. `clave` (UPPER_SNAKE) es lo que el
--      dominio compara; `nombre` es el display.
--   3) `vacantes`: solo campos CAPTURADOS. Los derivados (STATUS, DÍAS PARA
--      VENCER, DÍAS EN PROCESO, observaciones) NUNCA se almacenan — se
--      recalculan en cada lectura vía `derivarVacante`/`evaluarFila`
--      (`shared/src/vacantes.ts`), coherente con el estado derivado en
--      servidor del resto de la plataforma (ADR-0005).
--
-- SEGURIDAD: RLS "deny-directo" (habilitada, sin políticas) en `vacantes` y
-- en las 5 tablas de catálogo — todo acceso pasa por el backend con service
-- role (patrón 0017/0019 para tablas sin necesidad de lectura vía PostgREST).

-- ── Enums (máquina de estados) ────────────────────────────────────────────────
create type estado_vacante as enum (
  'PENDIENTE', 'CONTRATADO', 'CANCELADA', 'CERRADA_PROMOCION', 'PAUSADA'
);

create type fase_vacante as enum (
  'RECLUTAMIENTO', 'APROBACION_VICERRECTORIA', 'PRUEBAS_IDONEIDAD',
  'PRUEBAS_PSICOTECNICAS', 'EXAMEN_MEDICO', 'POLIGRAFIA', 'CONTRATACION'
);

create type aprobacion_presupuesto_vacante as enum (
  'SOLICITADO', 'EN_REVISION', 'APROBADO', 'NO_APROBADO'
);

-- ── Catálogos con llave (estilo `fondos_sede`) ────────────────────────────────

create table vacante_modalidades (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,
  nombre text not null,
  activo boolean not null default true,
  orden  integer not null
);

create table vacante_dedicaciones (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,
  nombre text not null,
  activo boolean not null default true,
  orden  integer not null
);

create table vacante_escalafones (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,
  nombre text not null,
  activo boolean not null default true,
  orden  integer not null
);

create table vacante_motivos (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,
  nombre text not null,
  activo boolean not null default true,
  orden  integer not null
);

create table vacante_fuentes (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,
  nombre text not null,
  activo boolean not null default true,
  orden  integer not null
);

-- Seed: valores canónicos del v1 (CONFIG.VALORES / catálogo LISTAS).
insert into vacante_modalidades (clave, nombre, orden) values
  ('PRESENCIAL', 'Presencial', 1),
  ('VIRTUAL', 'Virtual', 2);

insert into vacante_dedicaciones (clave, nombre, orden) values
  ('TIEMPO_COMPLETO', 'Tiempo completo', 1),
  ('MEDIO_TIEMPO', 'Medio tiempo', 2),
  ('CATEDRATICO', 'Catedrático', 3),
  ('ADMINISTRATIVO', 'Administrativo', 4),
  ('OPS', 'OPS', 5),
  ('TUTOR', 'Tutor', 6);

insert into vacante_escalafones (clave, nombre, orden) values
  ('NA', 'N/A', 1),
  ('TUTOR', 'Tutor', 2),
  ('AUXILIAR', 'Auxiliar', 3),
  ('ASISTENTE', 'Asistente', 4),
  ('ASOCIADO_I', 'Asociado I', 5),
  ('ASOCIADO_II', 'Asociado II', 6),
  ('ASOCIADO_III', 'Asociado III', 7),
  ('ASOCIADO_IV', 'Asociado IV', 8),
  ('TITULAR_I', 'Titular I', 9),
  ('TITULAR_II', 'Titular II', 10),
  ('TITULAR_III', 'Titular III', 11),
  ('TITULAR_IV', 'Titular IV', 12);

insert into vacante_motivos (clave, nombre, orden) values
  ('REQUERIMIENTO_DOCENTE', 'Requerimiento docente', 1),
  ('CARGO_ADMINISTRATIVO', 'Cargo administrativo', 2),
  ('NUEVO_CARGO', 'Nuevo cargo', 3),
  ('PROYECTO', 'Proyecto', 4),
  ('RETIRO_VOLUNTARIO', 'Retiro voluntario', 5),
  ('PROMOCION', 'Promoción', 6),
  ('TERMINACION_CONTRATO', 'Terminación de contrato', 7),
  ('VACACIONES_LICENCIA', 'Vacaciones/Licencia', 8),
  ('REEMPLAZO_DOCENTE', 'Reemplazo docente', 9);

insert into vacante_fuentes (clave, nombre, orden) values
  ('REFERIDO', 'Referido', 1),
  ('PORTAL_EMPLEO', 'Portal de empleo', 2),
  ('LINKEDIN', 'LinkedIn', 3),
  ('BASE_INTERNA', 'Base interna', 4),
  ('UNIVERSIDAD', 'Universidad', 5),
  ('OTRO', 'Otro', 6);

-- ── vacantes ───────────────────────────────────────────────────────────────
-- `requerimiento` es AUTO (secuencia legible), a diferencia del v1 donde era un
-- valor de fórmula frágil por posición de fila — aquí es una secuencia real de
-- Postgres, estable ante borrados/reordenamientos.
create sequence vacantes_requerimiento_seq;

create table vacantes (
  id                   uuid primary key default gen_random_uuid(),
  requerimiento        text not null default
    ('REQ-' || lpad(nextval('vacantes_requerimiento_seq')::text, 6, '0')),
  cargo                text not null,
  posiciones           integer not null default 1 check (posiciones >= 1),
  area_id              uuid references areas(id),
  modalidad_id         uuid references vacante_modalidades(id),
  dedicacion_id        uuid references vacante_dedicaciones(id),
  escalafon_id         uuid references vacante_escalafones(id),
  motivo_id            uuid references vacante_motivos(id),
  fuente_id            uuid references vacante_fuentes(id),
  jefe                 text,
  reemplazo            text,
  nombre_nuevo         text,
  salario              numeric(14, 2),
  aprobacion           aprobacion_presupuesto_vacante,
  fecha_aprobacion     date,
  fecha_requerimiento  date not null,
  fase                 fase_vacante not null default 'RECLUTAMIENTO',
  estado               estado_vacante not null default 'PENDIENTE',
  fecha_contratacion   date,
  cedula               text check (cedula is null or cedula ~ '^[0-9]{6,10}$'),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index vacantes_estado_idx on vacantes (estado);
create index vacantes_area_id_idx on vacantes (area_id);
create index vacantes_fecha_requerimiento_idx on vacantes (fecha_requerimiento);

-- ── RLS: deny-directo (todo acceso pasa por el backend con service role) ─────
alter table vacante_modalidades enable row level security;
alter table vacante_dedicaciones enable row level security;
alter table vacante_escalafones enable row level security;
alter table vacante_motivos enable row level security;
alter table vacante_fuentes enable row level security;
alter table vacantes enable row level security;
