create type estado_capacitacion_planeada as enum ('PLANEADA', 'EN_CURSO', 'COMPLETADA');

create table capacitaciones_planeadas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  area_objetivo text,
  ambito ambito_capacitacion not null,
  anio integer not null,
  mes integer not null,
  estado estado_capacitacion_planeada not null default 'PLANEADA',
  notas text,
  creada_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mes between 1 and 12)
);
create index capacitaciones_planeadas_ambito_idx on capacitaciones_planeadas (ambito);
create index capacitaciones_planeadas_periodo_idx on capacitaciones_planeadas (anio, mes);

alter table capacitaciones_planeadas enable row level security;
