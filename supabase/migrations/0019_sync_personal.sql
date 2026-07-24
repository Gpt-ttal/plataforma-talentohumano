-- 0019_sync_personal.sql — Sync de personal desde Iceberg (staging + revisión + upsert).
--
-- La solicitud "MANEJO DE DATOS ICEBERG" exige ingerir 28 atributos de personal
-- del maestro externo Iceberg por dos caminos (servicio n8n con API key / carga
-- manual de TH), SIN escribir directo: entran como LOTE pendiente de revisión y,
-- al confirmar, se reparten al expediente por UPSERT por documento. Esto reusa el
-- patrón de staging de desvinculaciones (0017): el ciclo de vida del lote/fila es
-- el MISMO (`lote_estado`/`fila_lote_estado` ya existen; no se recrean).
--
-- Cambios (100% aditivos; no tocan la máquina de estados ni el puente 0009):
--   1) 4 enums nuevos: tipo_documento, estado_civil, tipo_cuenta_bancaria,
--      origen_lote_sync.
--   2) `fondos_sede`: catálogo fijo (estilo `areas`) + FK desde `funcionarios`.
--   3) `funcionarios` gana columnas Iceberg no sensibles (tipo_documento,
--      nacionalidad, centro_costos, categoria, fondo_sede_id).
--   4) Satélites: `empleado_personales` (+estado_civil, lugar_residencia),
--      `empleado_salarial` (+fondo_cesantias), `empleado_familiares`
--      (+dependiente_economico).
--   5) `empleado_bancario` (1-1, SENSIBLE, PLACEHOLDER): el "certificado bancario";
--      su estructura exacta se cierra al ver el payload real de Iceberg.
--   6) Staging: `lotes_sync_personal` + `filas_sync_personal` (columna por atributo).
--
-- SEGURIDAD (defensa en profundidad, patrón 0004/0005/0010):
--   - `empleado_bancario` con RLS ESTRICTA: solo SUPERADMIN/TALENTO_HUMANO pueden
--     SELECT (función `ve_bancario`, clon EXACTO de `ve_salarial`). Escritura
--     deny-directo (solo backend privilegiado).
--   - `fondos_sede`: RLS "usuario activo" (catálogo legible, escritura backend).
--   - Staging (`lotes_sync_personal`/`filas_sync_personal`): RLS habilitada SIN
--     políticas (deny-directo; todo acceso pasa por el backend con service role),
--     mismo patrón que `lotes_importacion`/`filas_lote` (0017).

-- ── Enums ────────────────────────────────────────────────────────────────────
create type tipo_documento as enum ('CC', 'CE', 'PASAPORTE', 'PEP', 'TI', 'NIT');
create type estado_civil as enum (
  'SOLTERO', 'CASADO', 'UNION_LIBRE', 'SEPARADO', 'DIVORCIADO', 'VIUDO'
);
-- PLACEHOLDER: el conjunto real se cierra con el payload de Iceberg.
create type tipo_cuenta_bancaria as enum ('AHORROS', 'CORRIENTE');
create type origen_lote_sync as enum ('SERVICIO', 'MANUAL');

-- ── fondos_sede: catálogo fijo (estilo `areas`) ──────────────────────────────
-- `nombre` UNIQUE = clave natural del catálogo → permite resolver `fondo_sede_id`
-- por nombre al aplicar el sync, y hace el seed idempotente.
create table fondos_sede (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true
);

-- Seed PLACEHOLDER: las sedes reales se cargan cuando se confirme el catálogo.
insert into fondos_sede (nombre) values ('Sede Principal') on conflict (nombre) do nothing;

-- ── funcionarios: columnas Iceberg no sensibles + FK de fondo/sede ────────────
alter table funcionarios
  add column if not exists tipo_documento tipo_documento,
  add column if not exists nacionalidad   text,
  add column if not exists centro_costos  text,
  add column if not exists categoria      text,
  add column if not exists fondo_sede_id  uuid references fondos_sede(id);

create index if not exists funcionarios_fondo_sede_id_idx on funcionarios (fondo_sede_id);

-- ── Satélites: nuevas columnas Iceberg ───────────────────────────────────────
alter table empleado_personales
  add column if not exists estado_civil     estado_civil,
  add column if not exists lugar_residencia text;

alter table empleado_salarial
  add column if not exists fondo_cesantias text;

alter table empleado_familiares
  add column if not exists dependiente_economico boolean not null default false;

-- ── empleado_bancario (1-1, SENSIBLE, PLACEHOLDER) ───────────────────────────
-- El "certificado bancario". Campos placeholder hasta ver el payload real de
-- Iceberg; se crea ya la tabla con su RLS estricta para no re-migrar la seguridad.
create table empleado_bancario (
  funcionario_id uuid primary key references funcionarios(id) on delete cascade,
  banco          text,
  tipo_cuenta    tipo_cuenta_bancaria,
  numero_cuenta  text,
  titular        text,
  updated_at     timestamptz not null default now()
);

-- ── Staging del sync (lote → filas), reusa lote_estado/fila_lote_estado (0017) ─
create table lotes_sync_personal (
  id                uuid primary key default gen_random_uuid(),
  origen            origen_lote_sync not null,
  estado            lote_estado not null default 'CARGADO',
  total_filas       integer not null default 0,
  filas_confirmadas integer not null default 0,
  creado_por        text not null,
  -- Idempotencia de la corrida (header Idempotency-Key / servicio); NULL en manual.
  idempotency_key   text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Una fila por registro de Iceberg, NORMALIZADO a columna-por-atributo. Los campos
-- que no se pudieron normalizar quedan NULL + su motivo en `mensaje_error`.
-- `funcionario_id` solo se rellena al confirmar (puente ejecutado). `fondo_sede`
-- se guarda como NOMBRE crudo; se resuelve a FK al aplicar.
create table filas_sync_personal (
  id                      uuid primary key default gen_random_uuid(),
  lote_id                 uuid not null references lotes_sync_personal(id) on delete cascade,
  numero_fila             integer not null,
  -- Identidad / core
  documento               text not null,
  nombre_completo         text not null,
  -- Personales
  genero                  genero,
  tipo_documento          tipo_documento,
  fecha_expedicion        date,
  nacionalidad            text,
  fecha_nacimiento        date,
  lugar_residencia        text,
  direccion               text,
  telefono                text,
  barrio                  text,
  estado_civil            estado_civil,
  personas_a_cargo        integer,
  correo                  text,
  -- Contractual
  cargo                   text,
  estado_contrato         text,
  centro_costos           text,
  fondo_sede              text,
  fecha_ingreso           date,
  fecha_fin_contrato      date,
  dependencia             text,
  tipo_empleado           tipo_vinculacion,
  tipo_contrato           tipo_contrato,
  categoria               text,
  -- Salarial (sensible)
  salario                 numeric(14, 2),
  eps                     text,
  fondo_pension_cesantias text,
  -- Bancario (sensible, placeholder)
  certificado_bancario    text,
  -- Resultado de validación
  estado                  fila_lote_estado not null,
  mensaje_error           text,
  funcionario_id          uuid references funcionarios(id),
  unique (lote_id, numero_fila)
);

create index filas_sync_personal_lote_idx on filas_sync_personal (lote_id);

-- ── Seguridad: función que autoriza el bloque bancario (SA/TH) ────────────────
-- Clon EXACTO de `ve_salarial` (0010): SECURITY DEFINER + search_path fijo +
-- revoke a anon/authenticated/public (aunque llegue por PostgREST/MCP, la BD niega).
create or replace function public.ve_bancario(uid uuid)
  returns boolean
  language sql
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from usuarios
     where id = uid
       and estado = 'ACTIVO'
       and rol in ('SUPERADMIN', 'TALENTO_HUMANO')
  );
$$;

revoke execute on function public.ve_bancario(uuid) from anon, authenticated, public;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Catálogo de sedes: lectura para usuario activo (patrón `areas`/`funcionarios`).
alter table fondos_sede enable row level security;
create policy fondos_sede_select_activos on fondos_sede
  for select using (public.es_usuario_activo(auth.uid()));

-- Bloque bancario: SELECT solo SA/TH; escritura deny-directo (solo backend).
alter table empleado_bancario enable row level security;
create policy bancario_select_th on empleado_bancario
  for select using (public.ve_bancario(auth.uid()));

-- Staging: deny-directo (RLS habilitada sin políticas), patrón 0017.
alter table lotes_sync_personal enable row level security;
alter table filas_sync_personal enable row level security;
