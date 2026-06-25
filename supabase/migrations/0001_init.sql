-- 0001_init.sql — Esquema inicial del Sistema Paz y Salvo.
-- PostgreSQL / Supabase. Refleja lib/domain.ts.

-- ── Enums ────────────────────────────────────────────────────────────────
create type estado_area as enum (
  'PENDIENTE', 'APROBADO', 'NO_APLICA', 'NO_APROBADO'
);

create type estado_global as enum (
  'PENDIENTE', 'LISTO_PARA_LIQUIDAR', 'PAZ_Y_SALVO'
);

-- ── Áreas de visto bueno (catálogo configurable) ─────────────────────────
create table areas (
  id     uuid primary key default gen_random_uuid(),
  nombre text    not null,
  orden  int     not null unique,
  activa boolean not null default true
);

-- ── Funcionarios en proceso de retiro ────────────────────────────────────
create table funcionarios (
  id                uuid          primary key default gen_random_uuid(),
  documento         text          not null unique,
  nombre_completo   text          not null,
  fecha_retiro      date          not null,
  area_origen       text          not null,
  cargo             text          not null,
  estado_global     estado_global not null default 'PENDIENTE',
  fecha_liquidacion timestamptz,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

-- ── Aprobación (estado de un área × funcionario) ─────────────────────────
create table aprobaciones (
  id             uuid        primary key default gen_random_uuid(),
  funcionario_id uuid        not null references funcionarios(id) on delete cascade,
  area_id        uuid        not null references areas(id)        on delete restrict,
  estado         estado_area not null default 'PENDIENTE',
  updated_at     timestamptz not null default now(),
  unique (funcionario_id, area_id)
);
create index aprobaciones_funcionario_idx on aprobaciones (funcionario_id);
create index aprobaciones_area_idx        on aprobaciones (area_id);

-- ── Observaciones (historial inmutable de cambios/comentarios) ───────────
create table observaciones (
  id             uuid        primary key default gen_random_uuid(),
  funcionario_id uuid        not null references funcionarios(id) on delete cascade,
  area_id        uuid        not null references areas(id)        on delete restrict,
  estado         estado_area not null,
  texto          text        not null,
  autor          text        not null,
  created_at     timestamptz not null default now()
);
create index observaciones_funcionario_idx on observaciones (funcionario_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- El MVP accede con la service role key (server-side), que ignora RLS.
-- Activamos RLS sin políticas públicas: anon/authenticated quedan denegados
-- por defecto. La fase de autenticación añadirá políticas por rol.
alter table areas         enable row level security;
alter table funcionarios  enable row level security;
alter table aprobaciones  enable row level security;
alter table observaciones enable row level security;
