-- Enums
create type tipo_contenido_leccion as enum ('TEXTO', 'VIDEO');

-- cursos (reusa ambito_capacitacion, estado_registro_capacitacion de 0008)
create table cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  ambito ambito_capacitacion not null,
  token text not null unique,
  estado_registro estado_registro_capacitacion not null default 'BORRADOR',
  creada_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cursos_ambito_idx on cursos (ambito);

-- curso_modulos (orden denso por curso, mismo patrón que areas.orden)
create table curso_modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null,
  orden integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (curso_id, orden)
);
create index curso_modulos_curso_idx on curso_modulos (curso_id);

-- curso_lecciones
create table curso_lecciones (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references curso_modulos(id) on delete cascade,
  titulo text not null,
  tipo_contenido tipo_contenido_leccion not null,
  contenido_texto text,
  url_video text,
  orden integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (modulo_id, orden)
);
create index curso_lecciones_modulo_idx on curso_lecciones (modulo_id);

-- inscripciones (idempotente por curso × documento, mismo patrón que asistencias)
create table inscripciones (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  documento text not null,
  nombre text not null,
  correo text,
  iniciada_en timestamptz not null default now(),
  ultima_actividad_en timestamptz not null default now(),
  unique (curso_id, documento)
);
create index inscripciones_curso_idx on inscripciones (curso_id);

-- progreso_lecciones (existencia de fila = completada; idempotente por inscripcion × leccion)
create table progreso_lecciones (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references inscripciones(id) on delete cascade,
  leccion_id uuid not null references curso_lecciones(id) on delete cascade,
  completada_en timestamptz not null default now(),
  unique (inscripcion_id, leccion_id)
);
create index progreso_lecciones_inscripcion_idx on progreso_lecciones (inscripcion_id);

-- RLS deny-directo (idéntico a 0008)
alter table cursos enable row level security;
alter table curso_modulos enable row level security;
alter table curso_lecciones enable row level security;
alter table inscripciones enable row level security;
alter table progreso_lecciones enable row level security;
