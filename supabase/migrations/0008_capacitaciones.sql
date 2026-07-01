-- 0008_capacitaciones.sql — Módulo de Capacitaciones: eventos + asistencia por QR.
--
-- Sub-proyecto 1 (MVP): el gestor (TH/SST/SA) crea una capacitación como evento
-- (tipo agendamiento: fecha, lugar, instructor, ámbito, horas); el sistema genera
-- un `token` para el QR; el gestor abre/cierra el registro; el asistente registra
-- su asistencia desde un formulario PÚBLICO (sin login), idempotente por
-- (capacitación × documento).
--
-- RLS habilitado como segunda capa: el backend lee/escribe con rol privilegiado
-- (ignora RLS) y el registro público pasa por el backend, no por el cliente
-- Supabase. No se abren políticas → acceso directo de anon/authenticated denegado,
-- coherente con el posture de 0004/0005.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type ambito_capacitacion as enum ('TH', 'SST');
create type estado_registro_capacitacion as enum ('BORRADOR', 'ABIERTO', 'CERRADO');
create type tipo_vinculo as enum ('PLANTA', 'CONTRATISTA', 'EXTERNO');

-- ── capacitaciones ───────────────────────────────────────────────────────────
create table capacitaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  ambito ambito_capacitacion not null,
  lugar text,
  instructor text,
  inicia_en timestamptz not null,
  termina_en timestamptz not null,
  horas numeric(5, 2),
  token text not null unique,
  estado_registro estado_registro_capacitacion not null default 'BORRADOR',
  creada_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index capacitaciones_ambito_idx on capacitaciones (ambito);

-- ── asistencias ──────────────────────────────────────────────────────────────
-- Captura la identidad del asistente de forma AUTÓNOMA (no se enlaza a
-- `funcionarios`, que es del trámite de retiro). `usuario_id` es opcional: enlaza
-- a la cuenta solo si el asistente estaba logueado. El UNIQUE (capacitación ×
-- documento) garantiza idempotencia ante doble escaneo/submit.
create table asistencias (
  id uuid primary key default gen_random_uuid(),
  capacitacion_id uuid not null references capacitaciones(id) on delete cascade,
  nombre text not null,
  documento text not null,
  correo text,
  dependencia text,
  tipo_vinculo tipo_vinculo not null,
  usuario_id uuid references usuarios(id),
  registrada_en timestamptz not null default now(),
  unique (capacitacion_id, documento)
);

create index asistencias_capacitacion_idx on asistencias (capacitacion_id);

-- ── RLS (deny directo; todo acceso pasa por el backend) ──────────────────────
alter table capacitaciones enable row level security;
alter table asistencias enable row level security;
