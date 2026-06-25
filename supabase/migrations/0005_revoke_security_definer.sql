-- 0005_revoke_security_definer.sql — Cierra el advisor de SECURITY DEFINER.
--
-- Las funciones SECURITY DEFINER de 0003/0004 (`rol_de`, `es_superadmin`,
-- `es_usuario_activo`, `es_supervisor`, `area_de`) nacen, por defecto de
-- PostgreSQL, con EXECUTE para PUBLIC. Eso permite que cualquier cliente con la
-- `anon key` (que es pública: vive en el frontend) las invoque por RPC/PostgREST
-- y enumere el rol/área/condición de superadmin de cualquier usuario por su uuid.
--
-- Estas funciones solo deben ejecutarse dentro de las políticas RLS, que se
-- evalúan con los privilegios del DUEÑO (definer), no del invocador. Por tanto,
-- revocar EXECUTE a anon/authenticated/public NO rompe la RLS: las políticas
-- siguen pudiendo llamarlas. Solo se cierra la invocación directa por el cliente.

revoke execute on function
  public.rol_de(uuid),
  public.es_superadmin(uuid),
  public.es_usuario_activo(uuid),
  public.es_supervisor(uuid),
  public.area_de(uuid)
from anon, authenticated, public;
