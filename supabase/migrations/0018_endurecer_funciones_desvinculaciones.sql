-- 0018_endurecer_funciones_desvinculaciones.sql — Cierra 2 advisors nuevos de 0015/0016.
--
-- Mismo patrón ya aplicado en 0005_revoke_security_definer.sql: revocar EXECUTE
-- a anon/authenticated/public NO rompe RLS (las policies se evalúan con los
-- privilegios del definer), solo cierra la invocación directa por RPC/PostgREST.
-- `fn_archivado_en_requiere_paz_y_salvo` (trigger de 0015) no fijaba search_path.

revoke execute on function public.es_auditor(uuid)
from anon, authenticated, public;

create or replace function fn_archivado_en_requiere_paz_y_salvo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.archivado_en is not null and new.estado_global <> 'PAZ_Y_SALVO' then
    raise exception 'archivado_en solo puede asignarse cuando estado_global = PAZ_Y_SALVO';
  end if;
  return new;
end;
$$;
