-- 0002_liquidacion_generada.sql
-- Refina el cierre del paz y salvo con el relevo Talento Humano → Control Interno.
--
--   PENDIENTE → LISTO_PARA_LIQUIDAR → LIQUIDACION_GENERADA → PAZ_Y_SALVO
--
-- TH "genera la liquidación" (avisa a CI) y CI "registra la liquidación" (cierre).
-- El nuevo valor de enum NO se usa dentro de esta misma migración (sólo se agrega),
-- por lo que es seguro en PostgreSQL 12+.

-- ── 4º estado global ──────────────────────────────────────────────────────
alter type estado_global
  add value if not exists 'LIQUIDACION_GENERADA' after 'LISTO_PARA_LIQUIDAR';

-- ── Hitos del relevo en funcionarios ──────────────────────────────────────
alter table funcionarios
  add column if not exists fecha_liquidacion_generada timestamptz, -- TH generó
  add column if not exists liquidacion_generada_por   text,        -- autor (rol)
  add column if not exists liquidado_por              text;        -- CI cerró (autor)
