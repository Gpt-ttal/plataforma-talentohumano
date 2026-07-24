-- 0021_vacante_areas.sql — Catálogo dedicado de área/programa para Vacantes.
--
-- La 0020 apuntó `vacantes.area_id` a la tabla `areas` (catálogo de
-- dependencias que dan visto bueno en paz y salvo: Biblioteca, Tesorería,
-- Activos fijos...). Al revisar los datos reales de Vacantes (planilla
-- "SEGUIMIENTO VACANTES -2026.xlsx", continuación operativa del sistema
-- aparte "sistema-seguimiento-vacantes-v1") se confirmó que el universo de
-- área/programa de Vacantes (Escuela de Negocios, CIE, Sistemas,
-- Licenciaturas...) es un catálogo completamente distinto y sin traslape con
-- `areas` — reutilizarla habría mezclado dos dominios ajenos. Como
-- `vacantes` está vacía en producción, corregir el FK ahora es 100% seguro
-- (sin backfill de datos existentes).
--
-- Cambios (100% aditivos salvo el re-apunte del FK, ver nota):
--   1) `vacante_areas`: 6ª tabla de CATÁLOGO CON LLAVE (patrón `fondos_sede`,
--      igual que las otras 5 de la 0020), sembrada con los 13 valores
--      canónicos ya reconciliados en el v1 (`01_Catalogos.gs`) + 4 valores
--      reales detectados en la planilla actual que ni el v1 alcanzó a
--      reconciliar (Transformación Digital, 2 Licenciaturas en Educación
--      Infantil —presencial/distancia, son ofertas distintas— y una
--      Licenciatura en Lenguas Extranjeras con Énfasis en Inglés, fusionando
--      dos variantes mal escritas de un mismo programa).
--   2) `vacantes.area_id` re-apunta de `areas(id)` a `vacante_areas(id)`.
--   3) `vacante_motivos`: se agrega `REINGRESO`, valor real detectado en la
--      planilla actual que no existía en ningún catálogo (ni v1 ni 0020).
--
-- SEGURIDAD: RLS "deny-directo" en `vacante_areas`, igual que las demás
-- tablas de catálogo de Vacantes.

-- ── vacante_areas ──────────────────────────────────────────────────────────
create table vacante_areas (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,
  nombre text not null,
  activo boolean not null default true,
  orden  integer not null
);

insert into vacante_areas (clave, nombre, orden) values
  ('ESCUELA_NEGOCIOS', 'Escuela de Negocios', 1),
  ('POSGRADOS', 'Posgrados', 2),
  ('ADMISIONES_REGISTRO_CONTROL', 'Admisiones, Registro y Control', 3),
  ('FINANCIAMIENTO_ESTUDIANTIL', 'Financiamiento Estudiantil', 4),
  ('CIE', 'CIE', 5),
  ('INFRAESTRUCTURA_FISICA', 'Infraestructura Física', 6),
  ('CALL_CENTER_PREGRADO', 'Call Center Pregrado', 7),
  ('SISTEMAS', 'Sistemas', 8),
  ('VICERRECTORIA_ACADEMICA', 'Vicerrectoría Académica', 9),
  ('BIENESTAR_INSTITUCIONAL', 'Bienestar Institucional', 10),
  ('INGENIERIA_SST', 'Ingeniería en SST', 11),
  ('INNOVACION_EDUCATIVA', 'Innovación Educativa', 12),
  ('MARKETING_COMUNICACIONES', 'Marketing y Comunicaciones', 13),
  ('TRANSFORMACION_DIGITAL', 'Transformación Digital', 14),
  ('LICENCIATURA_EDUCACION_INFANTIL', 'Licenciatura en Educación Infantil', 15),
  ('LICENCIATURA_EDUCACION_INFANTIL_DISTANCIA', 'Licenciatura en Educación Infantil a Distancia', 16),
  ('LICENCIATURA_LENGUAS_EXTRANJERAS_INGLES', 'Licenciatura en Lenguas Extranjeras con Énfasis en Inglés', 17);

alter table vacante_areas enable row level security;

-- ── Re-apunte del FK (seguro: `vacantes` está vacía en producción) ─────────
alter table vacantes drop constraint vacantes_area_id_fkey;
alter table vacantes add constraint vacantes_area_id_fkey
  foreign key (area_id) references vacante_areas(id);

-- ── vacante_motivos: valor real sin catálogo ────────────────────────────────
insert into vacante_motivos (clave, nombre, orden) values
  ('REINGRESO', 'Reingreso', 10);
