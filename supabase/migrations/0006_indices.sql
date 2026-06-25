-- 0006_indices.sql — Índices de apoyo a filtros y RLS.
--
--  · funcionarios.estado_global: lo filtran/segmentan las vistas TH/CI y las
--    métricas del panel (bandejas por estado).
--  · observaciones.area_id: la política RLS de área compara `area_id = area_de()`
--    y el detalle filtra por área; sin índice hace seq scan.
-- Impacto hoy es nulo (volúmenes pequeños), pero el costo de tenerlos es trivial
-- y evita degradación a medida que crece el histórico.

create index if not exists funcionarios_estado_global_idx
  on funcionarios (estado_global);

create index if not exists observaciones_area_idx
  on observaciones (area_id);
