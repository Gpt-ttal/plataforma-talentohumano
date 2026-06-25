-- 0003_usuarios_y_roles.sql — Identidad, roles y autorización.
--
-- Añade la tabla `usuarios` (perfil ligado a auth.users) con rol y área, el
-- invariante de integridad rol↔área (espejo de lib/usuarios.ts), y RLS no
-- recursiva mediante funciones SECURITY DEFINER.
--
-- Nota: los datos del dominio se siguen leyendo por service-role (que ignora RLS);
-- estas políticas son defensa en profundidad para anon/authenticated.

-- ── Enums ──────────────────────────────────────────────────────────────────
create type rol_usuario as enum (
  'SUPERADMIN', 'TALENTO_HUMANO', 'CONTROL_INTERNO', 'AREA'
);

-- Declarado con PENDIENTE primero: ordenar por la columna deja lo pendiente
-- (lo que el superadmin debe resolver) al inicio del listado.
create type estado_usuario as enum (
  'PENDIENTE', 'ACTIVO', 'INACTIVO'
);

-- ── Tabla usuarios (perfil 1:1 con auth.users) ──────────────────────────────
create table usuarios (
  id         uuid           primary key references auth.users(id) on delete cascade,
  email      text           not null unique,
  nombre     text           not null,
  rol        rol_usuario    not null default 'AREA',
  area_id    uuid           references areas(id) on delete restrict,
  estado     estado_usuario not null default 'PENDIENTE',
  created_at timestamptz    not null default now(),
  updated_at timestamptz    not null default now(),

  -- Invariante rol↔área (espejo exacto de errorInvarianteUsuario):
  --   · un rol distinto de AREA nunca lleva área;
  --   · un AREA en estado ACTIVO debe tener área (PENDIENTE/INACTIVO puede no tenerla).
  constraint usuarios_rol_area_chk check (
    (rol = 'AREA' or area_id is null)
    and (rol <> 'AREA' or estado <> 'ACTIVO' or area_id is not null)
  )
);
create index usuarios_estado_idx on usuarios (estado);
create index usuarios_area_idx   on usuarios (area_id);

-- ── Funciones SECURITY DEFINER (rompen la recursión de RLS) ──────────────────
-- Consultan `usuarios` con privilegios del dueño, evitando que la política de la
-- propia tabla se evalúe recursivamente al preguntar por el rol del solicitante.
create or replace function public.rol_de(uid uuid)
  returns rol_usuario
  language sql
  security definer
  stable
  set search_path = public
as $$
  select rol from public.usuarios where id = uid;
$$;

create or replace function public.es_superadmin(uid uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = uid and rol = 'SUPERADMIN' and estado = 'ACTIVO'
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table usuarios enable row level security;

-- Cada usuario puede leer su propia fila (política base, no recursiva).
create policy usuarios_select_propio on usuarios
  for select
  using (id = auth.uid());

-- El superadmin puede leer y administrar todas las filas.
create policy usuarios_select_superadmin on usuarios
  for select
  using (public.es_superadmin(auth.uid()));

create policy usuarios_admin_todo on usuarios
  for all
  using (public.es_superadmin(auth.uid()))
  with check (public.es_superadmin(auth.uid()));
