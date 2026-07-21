-- 0014_estado_area_devuelto_ci.sql — Nuevo estado de área "Devuelto por Control Interno".
--
-- Gestión de Desvinculaciones: Control Interno puede devolver un caso a un área
-- puntual para revisión (distinto de un rechazo del área misma). Se añade el
-- valor al enum `estado_area` en SU PROPIA migración porque Postgres no permite
-- USAR un valor de enum recién agregado dentro de la misma transacción que lo
-- añade (mismo precedente que 0007_rol_sst.sql).

alter type estado_area add value if not exists 'DEVUELTO_POR_CI' after 'NO_APROBADO';
