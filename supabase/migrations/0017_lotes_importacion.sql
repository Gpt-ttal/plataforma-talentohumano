-- 0017_lotes_importacion.sql — Importación masiva de desvinculaciones (preview + confirmación parcial).
--
-- Gestión de Desvinculaciones: sube un Excel con documentos a desvincular, se
-- previsualiza fila por fila (válida/con error/duplicada) antes de confirmar.
-- Al confirmar una fila válida se reusa `iniciarTramiteDesvinculacion` (mismo
-- puente que "Finalizar contrato" individual, 0009/0015). RLS sin políticas
-- (deny directo; todo acceso pasa por el backend con service role), mismo
-- patrón que `capacitaciones`/`novedades` (0008/0009).

create type lote_estado as enum (
  'CARGADO',
  'PREVISUALIZADO',
  'CONFIRMADO_PARCIAL',
  'CONFIRMADO_TOTAL'
);

create type fila_lote_estado as enum (
  'VALIDA',
  'CON_ERROR',
  'DUPLICADA',
  'CONFIRMADA',
  'DESCARTADA'
);

create table lotes_importacion (
  id uuid primary key default gen_random_uuid(),
  nombre_archivo text not null,
  estado lote_estado not null default 'CARGADO',
  total_filas integer not null default 0,
  filas_confirmadas integer not null default 0,
  creado_por text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una fila por documento a desvincular dentro de un lote. `funcionario_id` solo
-- se rellena al confirmar (puente ejecutado). `documento`/`nombre_completo`/
-- `fecha_retiro`/`cargo` son la lectura cruda del Excel, previa a validar.
create table filas_lote (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references lotes_importacion(id) on delete cascade,
  numero_fila integer not null,
  documento text not null,
  nombre_completo text not null,
  fecha_retiro date not null,
  cargo text,
  estado fila_lote_estado not null,
  mensaje_error text,
  funcionario_id uuid references funcionarios(id),
  unique (lote_id, numero_fila)
);

create index filas_lote_lote_idx on filas_lote (lote_id);

alter table lotes_importacion enable row level security;
alter table filas_lote enable row level security;
