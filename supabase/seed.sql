-- seed.sql — Datos semilla (espejo de lib/seed.ts).
-- IDs deterministas para que el modo demo y Supabase coincidan.
-- estado_global va calculado a mano para coincidir con la máquina de estados.

-- ── Áreas ────────────────────────────────────────────────────────────────
insert into areas (id, nombre, orden, activa) values
  ('a0000000-0000-0000-0000-000000000001', 'Activos fijos',           1, true),
  ('a0000000-0000-0000-0000-000000000002', 'Sistemas de información', 2, true),
  ('a0000000-0000-0000-0000-000000000003', 'Iceberg',                 3, true),
  ('a0000000-0000-0000-0000-000000000004', 'Sinu',                    4, true),
  ('a0000000-0000-0000-0000-000000000005', 'Eva',                     5, true),
  ('a0000000-0000-0000-0000-000000000006', 'Tesorería',               6, true),
  ('a0000000-0000-0000-0000-000000000007', 'Contabilidad',            7, true),
  ('a0000000-0000-0000-0000-000000000008', 'Carnetización',           8, true),
  ('a0000000-0000-0000-0000-000000000009', 'Biblioteca',              9, true),
  ('a0000000-0000-0000-0000-000000000010', 'Inhabilitar correos',    10, true);

-- ── Funcionarios ─────────────────────────────────────────────────────────
insert into funcionarios
  (id, documento, nombre_completo, fecha_retiro, area_origen, cargo, estado_global, fecha_liquidacion_generada, liquidacion_generada_por, fecha_liquidacion, liquidado_por, created_at, updated_at)
values
  ('f0000000-0000-0000-0000-000000000001', '1234892621', 'MERIÑO MENDIVIL ROGER MOISES',     '2026-04-08', 'MERCADEO Y COMUNICACIONES',       'LIDER COMERCIAL',        'LISTO_PARA_LIQUIDAR',  null,                       null,               null,                       null,               '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z'),
  ('f0000000-0000-0000-0000-000000000002', '1047050289', 'ARRIETA MANJARRES ELKIN ANDRES',   '2026-04-18', 'INFRAESTRUCTURA',                 'APRENDIZ',               'PENDIENTE',            null,                       null,               null,                       null,               '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z'),
  ('f0000000-0000-0000-0000-000000000003', '1104256681', 'ARRIETA HERNANDEZ ENA MARIA',      '2026-04-17', 'CARTERA',                         'AUXILIAR DE CARTERA',    'PENDIENTE',            null,                       null,               null,                       null,               '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z'),
  ('f0000000-0000-0000-0000-000000000004', '1047511448', 'CARRACEDO CORTES JORGE ENRIQUE',   '2026-04-17', 'ADMISIONES, REGISTRO Y CONTROL',  'AUXILIAR DE ADMISIONES', 'LIQUIDACION_GENERADA', '2026-03-20T14:30:00.000Z', 'Talento Humano',   null,                       null,               '2026-03-01T08:00:00Z', '2026-03-20T14:30:00Z'),
  ('f0000000-0000-0000-0000-000000000005', '1001825822', 'DE LA ROSA SABALZA DANIELA SARAY', '2026-04-17', 'MERCADEO Y COMUNICACIONES',       'ASESOR COMERCIAL',       'PENDIENTE',            null,                       null,               null,                       null,               '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z'),
  ('f0000000-0000-0000-0000-000000000006', '1010233625', 'FONTALVO GUTIERREZ BRENDA PATRICIA','2026-04-01', 'MERCADEO Y COMUNICACIONES',       'ASESOR COMERCIAL',       'PAZ_Y_SALVO',          '2026-04-04T10:00:00.000Z', 'Talento Humano',   '2026-04-05T15:00:00.000Z', 'Control Interno',  '2026-03-01T08:00:00Z', '2026-04-05T15:00:00Z'),
  ('f0000000-0000-0000-0000-000000000007', '1001788431', 'NATERA RODRIGUEZ DANNA PAOLA',     '2026-04-17', 'MERCADEO Y COMUNICACIONES',       'ASESOR COMERCIAL',       'PENDIENTE',            null,                       null,               null,                       null,               '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z'),
  ('f0000000-0000-0000-0000-000000000008', '1002343784', 'ORTEGA ESTAN DIEGO ANDRES FELIPE', '2026-04-17', 'MERCADEO Y COMUNICACIONES',       'ASESOR COMERCIAL',       'PENDIENTE',            null,                       null,               null,                       null,               '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z'),
  ('f0000000-0000-0000-0000-000000000009', '1129504789', 'SEVERICHE CARRILLO TANIA MARIA',   '2026-04-17', 'MERCADEO Y COMUNICACIONES',       'ASESOR COMERCIAL',       'PENDIENTE',            null,                       null,               null,                       null,               '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z');

-- ── Aprobaciones: base PENDIENTE (funcionarios × áreas) ──────────────────
insert into aprobaciones (funcionario_id, area_id, estado, updated_at)
select f.id, a.id, 'PENDIENTE'::estado_area, '2026-03-01T08:00:00Z'
from funcionarios f cross join areas a;

-- ── Overrides de estado por área ─────────────────────────────────────────
-- TODAS_OK = áreas 3 y 9 NO_APLICA; el resto APROBADO.

-- func1 (MERIÑO): todas OK, sin liquidar => LISTO_PARA_LIQUIDAR
update aprobaciones set estado = 'NO_APLICA'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000001'
    and area_id in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000009');
update aprobaciones set estado = 'APROBADO'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000001'
    and area_id not in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000009');

-- func4 (CARRACEDO): todas OK + TH generó (sin cerrar) => LIQUIDACION_GENERADA
update aprobaciones set estado = 'NO_APLICA'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000004'
    and area_id in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000009');
update aprobaciones set estado = 'APROBADO'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000004'
    and area_id not in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000009');

-- func6 (FONTALVO): todas OK + liquidado => PAZ_Y_SALVO
update aprobaciones set estado = 'NO_APLICA'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000006'
    and area_id in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000009');
update aprobaciones set estado = 'APROBADO'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000006'
    and area_id not in ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000009');

-- func2 (ARRIETA MANJARRES): progreso parcial => PENDIENTE
update aprobaciones set estado = 'APROBADO'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000002'
    and area_id in ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002');
update aprobaciones set estado = 'NO_APLICA'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000002'
    and area_id = 'a0000000-0000-0000-0000-000000000008';

-- func3 (ARRIETA HERNANDEZ): un rechazo en Tesorería => PENDIENTE con rechazo
update aprobaciones set estado = 'APROBADO'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000003'
    and area_id in ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007');
update aprobaciones set estado = 'NO_APROBADO'
  where funcionario_id = 'f0000000-0000-0000-0000-000000000003'
    and area_id = 'a0000000-0000-0000-0000-000000000006';

-- ── Observaciones ────────────────────────────────────────────────────────
insert into observaciones (funcionario_id, area_id, estado, texto, autor, created_at) values
  ('f0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000006',
   'NO_APROBADO',
   'Pendiente devolución de anticipo de viáticos antes de aprobar.',
   'Sistema (semilla)',
   '2026-03-01T08:00:00Z');

-- ── Usuarios (identidad y roles) ───────────────────────────────────────────
-- No se siembran filas en `usuarios`: su id referencia auth.users(id), que solo
-- existe tras un inicio de sesión real con Google. El superadmin se crea solo en
-- su primer ingreso (lib/usuarios.ts: decidirAltaUsuario promueve SUPERADMIN_EMAIL
-- a SUPERADMIN/ACTIVO). El resto de correos del dominio entran como AREA/PENDIENTE
-- y el superadmin les asigna rol/área desde /usuarios.
--
-- Tras el primer login del superadmin, si hiciera falta forzar la promoción:
--   update usuarios set rol = 'SUPERADMIN', estado = 'ACTIVO', area_id = null
--     where email = 'leonardoreales@americana.edu.co';
