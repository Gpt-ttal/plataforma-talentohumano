-- 0007_rol_sst.sql — Nuevo rol SST (Seguridad y Salud en el Trabajo).
--
-- El módulo de Capacitaciones introduce un rol acotado `SST` que gestiona las
-- capacitaciones de su ámbito (las legales de seguridad y salud). Se añade el
-- valor al enum `rol_usuario` en SU PROPIA migración porque Postgres no permite
-- USAR un valor de enum recién agregado dentro de la misma transacción que lo
-- añade; las tablas que dependen del esquema van en 0008.

alter type rol_usuario add value if not exists 'SST';
