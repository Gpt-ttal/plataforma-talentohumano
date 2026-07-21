-- 0016_eventos_auditoria.sql — Bitácora de auditoría institucional (append-only).
--
-- Gestión de Desvinculaciones: pieza de trazabilidad genuinamente nueva. Tabla
-- genérica (entidad_tipo/entidad_id) para no acoplarla a un solo dominio; se
-- escribe SIEMPRE dentro de la misma transacción que la mutación que audita
-- (mismo patrón que `recomputarEstado(id, tx)`), nunca como paso separado.
-- Escritura solo server-side (service role, ignora RLS). Lectura vía RLS
-- restringida a SUPERADMIN/CONTROL_INTERNO (contiene motivos de rechazo y
-- devolución — dato sensible).

create table eventos_auditoria (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null,
  entidad_id uuid not null,
  accion text not null,
  actor_id uuid,
  actor_nombre text not null,
  estado_anterior jsonb,
  estado_nuevo jsonb,
  observacion text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index eventos_auditoria_entidad_idx
  on eventos_auditoria (entidad_tipo, entidad_id, created_at desc);

-- ── RLS: solo SUPERADMIN/CONTROL_INTERNO pueden leer; sin policy de INSERT ───
alter table eventos_auditoria enable row level security;

create or replace function public.es_auditor(uid uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = uid
      and estado = 'ACTIVO'
      and rol in ('SUPERADMIN', 'CONTROL_INTERNO')
  );
$$;

create policy eventos_auditoria_select_auditor on eventos_auditoria
  for select
  using (public.es_auditor(auth.uid()));
