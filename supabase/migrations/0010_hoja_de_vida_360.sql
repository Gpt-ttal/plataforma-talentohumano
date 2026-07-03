-- 0010_hoja_de_vida_360.sql — Administración de Personal v2: Hoja de Vida 360°.
--
-- v1 capturó el núcleo del empleado en `funcionarios` (una tabla, dos proyecciones).
-- El 360° añade el resto del expediente SIN inflar `funcionarios` con 36 columnas
-- nullables: los datos se reparten en TABLAS SATÉLITE por afinidad y sensibilidad.
--   1) `funcionarios` gana columnas CONTRACTUALES no sensibles + `area_id` (FK real,
--      desambiguando el `area_origen` texto libre) + `foto_path` (Storage).
--   2) Se desambiguan los 3 ejes hoy colapsados: `tipo_vinculacion` (naturaleza,
--      ya existe) ≠ `tipo_contrato` (término) ≠ `modalidad` (presencial/virtual).
--   3) 5 tablas satélite: personales (1-1), familiares (1-N), formación (1-N),
--      experiencia (1-N) y SALARIAL (1-1, aislada por sensibilidad).
--
-- SEGURIDAD (defensa en profundidad, patrón 0004/0005/0008):
--   - El bloque SALARIAL se aísla en su propia tabla con RLS ESTRICTA: solo
--     SUPERADMIN/TALENTO_HUMANO pueden SELECT (función `ve_salarial`). Aunque un rol
--     llegue por PostgREST/MCP, la BD niega. La escritura es deny-directo (backend).
--   - El resto de satélites llevan RLS "usuario activo" (mismo patrón que
--     `funcionarios` en 0004); la escritura pasa siempre por el backend privilegiado.
--
-- Nada de esto toca la máquina de estados ni el puente `finalizarContrato`: es
-- 100% aditivo. Los campos derivados (edad, antigüedad, rango) NO son columnas: se
-- calculan en `shared/src/personal.ts`.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type tipo_contrato as enum (
  'TERMINO_FIJO', 'TERMINO_INDEFINIDO', 'OBRA_LABOR', 'PRESTACION_SERVICIOS'
);
create type modalidad as enum ('PRESENCIAL', 'HIBRIDO', 'VIRTUAL');
create type genero as enum ('MASCULINO', 'FEMENINO', 'OTRO');
create type parentesco as enum ('CONYUGE', 'HIJO', 'PADRE', 'MADRE', 'OTRO');
create type nivel_formacion as enum (
  'BACHILLER', 'TECNICO', 'TECNOLOGO', 'PROFESIONAL',
  'ESPECIALIZACION', 'MAESTRIA', 'DOCTORADO', 'POSTDOCTORADO'
);

-- ── funcionarios: columnas contractuales + FK de área + foto ──────────────────
alter table funcionarios
  add column if not exists area_id              uuid references areas(id),
  add column if not exists tipo_contrato        tipo_contrato,
  add column if not exists modalidad            modalidad,
  add column if not exists programa             text,
  add column if not exists escalafon            text,
  add column if not exists jefe_inmediato       text,
  add column if not exists fecha_primer_ingreso date,
  add column if not exists observacion          text,
  add column if not exists foto_path            text;

create index if not exists funcionarios_area_id_idx on funcionarios (area_id);

-- Backfill de `area_id` desde `area_origen` (match por nombre normalizado). Los
-- que no matcheen quedan NULL + `area_origen` se conserva como respaldo histórico.
update funcionarios f
   set area_id = a.id
  from areas a
 where f.area_id is null
   and lower(btrim(f.area_origen)) = lower(btrim(a.nombre));

-- ── empleado_personales (1-1) ────────────────────────────────────────────────
create table empleado_personales (
  funcionario_id     uuid primary key references funcionarios(id) on delete cascade,
  fecha_expedicion   date,
  lugar_expedicion   text,
  fecha_nacimiento   date,
  lugar_nacimiento   text,
  genero             genero,
  direccion          text,
  barrio             text,
  municipio          text,
  correo_personal    text,
  updated_at         timestamptz not null default now()
);

-- ── empleado_familiares (1-N) ────────────────────────────────────────────────
create table empleado_familiares (
  id               uuid primary key default gen_random_uuid(),
  funcionario_id   uuid not null references funcionarios(id) on delete cascade,
  parentesco       parentesco not null,
  nombre           text not null,
  fecha_nacimiento date,
  genero           genero,
  created_at       timestamptz not null default now()
);
create index empleado_familiares_funcionario_idx
  on empleado_familiares (funcionario_id);

-- ── empleado_formacion (1-N) ─────────────────────────────────────────────────
create table empleado_formacion (
  id             uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  nivel          nivel_formacion not null,
  titulo         text not null,
  institucion    text,
  anio_inicio    int,
  anio_fin       int,
  created_at     timestamptz not null default now()
);
create index empleado_formacion_funcionario_idx
  on empleado_formacion (funcionario_id);

-- ── empleado_experiencia (1-N) ───────────────────────────────────────────────
create table empleado_experiencia (
  id             uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  empresa        text not null,
  cargo          text not null,
  fecha_inicio   date,
  fecha_fin      date,
  descripcion    text,
  created_at     timestamptz not null default now()
);
create index empleado_experiencia_funcionario_idx
  on empleado_experiencia (funcionario_id);

-- ── empleado_salarial (1-1, SENSIBLE) ────────────────────────────────────────
-- OPS no tiene salario/EPS/AFP (usa honorarios); admin/docente sí. Todo nullable
-- por eso. numeric(14,2) para pesos colombianos sin pérdida.
create table empleado_salarial (
  funcionario_id      uuid primary key references funcionarios(id) on delete cascade,
  salario_basico      numeric(14, 2),
  auxilio_transporte  numeric(14, 2),
  promedio_devengado  numeric(14, 2),
  valor_en_letras     text,
  honorarios          numeric(14, 2),
  eps                 text,
  afp                 text,
  updated_at          timestamptz not null default now()
);

-- ── Seguridad: función que autoriza el bloque salarial (SA/TH) ────────────────
-- Mismo estilo SECURITY DEFINER que `es_supervisor`/`es_usuario_activo` (0004).
create or replace function public.ve_salarial(uid uuid)
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

revoke execute on function public.ve_salarial(uuid) from anon, authenticated, public;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Satélites no sensibles: lectura para usuario activo (patrón `funcionarios`).
alter table empleado_personales  enable row level security;
alter table empleado_familiares  enable row level security;
alter table empleado_formacion   enable row level security;
alter table empleado_experiencia enable row level security;

create policy personales_select_activos on empleado_personales
  for select using (public.es_usuario_activo(auth.uid()));
create policy familiares_select_activos on empleado_familiares
  for select using (public.es_usuario_activo(auth.uid()));
create policy formacion_select_activos on empleado_formacion
  for select using (public.es_usuario_activo(auth.uid()));
create policy experiencia_select_activos on empleado_experiencia
  for select using (public.es_usuario_activo(auth.uid()));

-- Bloque salarial: SELECT solo SA/TH; escritura deny-directo (solo backend).
alter table empleado_salarial enable row level security;
create policy salarial_select_th on empleado_salarial
  for select using (public.ve_salarial(auth.uid()));
