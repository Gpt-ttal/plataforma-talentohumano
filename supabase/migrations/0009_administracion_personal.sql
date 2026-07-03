-- 0009_administracion_personal.sql — Módulo Administración de Personal (v1 núcleo).
--
-- La tabla `funcionarios` deja de ser "personas en trámite de retiro" y pasa a ser
-- el MAESTRO de empleados: una tabla, dos proyecciones. Un empleado nace ACTIVO
-- (`fecha_retiro IS NULL`, sin filas en `aprobaciones`) e invisible para Paz y
-- Salvo; al "Finalizar contrato" se le pone `fecha_retiro` y la MISMA fila pasa a
-- ser también un `Funcionario` en trámite. Por eso aquí:
--   1) `fecha_retiro` deja de ser NOT NULL (null = ACTIVO),
--   2) se añaden columnas de núcleo del expediente,
--   3) nace `novedades` (append-only) para el "Otro sí" ligero (cargo/extensión).
-- El bloque salarial/prestacional, familia, formación y escalafón son de fase 2.
--
-- RLS habilitado sin políticas (deny directo): todo acceso pasa por el backend con
-- rol privilegiado, coherente con 0004/0005/0008.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type tipo_vinculacion as enum ('ADMINISTRATIVO', 'DOCENTE', 'OPS');
create type novedad_tipo as enum ('CAMBIO_CARGO', 'EXTENSION_CONTRATO');

-- ── funcionarios → maestro de empleados ──────────────────────────────────────
alter table funcionarios
  alter column fecha_retiro drop not null;

alter table funcionarios
  add column if not exists tipo_vinculacion     tipo_vinculacion,
  add column if not exists fecha_ingreso         date,
  add column if not exists fecha_fin_contrato    date,
  add column if not exists correo_institucional  text,
  add column if not exists telefono              text;

-- Índice para el catálogo de empleados: filtra ACTIVO (fecha_retiro IS NULL) vs
-- en/tras trámite (IS NOT NULL) — el mismo predicado que acota las lecturas de
-- Paz y Salvo.
create index if not exists funcionarios_fecha_retiro_idx
  on funcionarios (fecha_retiro);

-- ── novedades (append-only: "Otro sí" ligero) ────────────────────────────────
create table novedades (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  tipo novedad_tipo not null,
  motivo text not null,
  valor_anterior text,
  valor_nuevo text,
  autor text not null,
  created_at timestamptz not null default now()
);

create index novedades_funcionario_idx on novedades (funcionario_id);

-- ── RLS (deny directo; todo acceso pasa por el backend) ──────────────────────
alter table novedades enable row level security;
