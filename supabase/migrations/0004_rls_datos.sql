-- 0004_rls_datos.sql — RLS de los datos del dominio (defensa en profundidad).
--
-- El servidor lee/escribe con la service role key (que IGNORA RLS): estas
-- políticas son una segunda capa para anon/authenticated, coherentes con el
-- alcance por rol de la app:
--   · catálogo (areas, funcionarios)  → cualquier usuario ACTIVO puede leer;
--   · aprobaciones / observaciones     → supervisores (SUPERADMIN/TH/CI) leen todo;
--                                        un usuario de AREA solo su propia área.
-- No se abren políticas de escritura: las mutaciones siguen pasando por el
-- servidor (service-role). Reusa las funciones SECURITY DEFINER de 0003 y añade
-- las suyas para no evaluar `usuarios` de forma recursiva.

-- ── Helpers SECURITY DEFINER ─────────────────────────────────────────────────
-- ¿El solicitante es un usuario ACTIVO? (cualquier rol)
create or replace function public.es_usuario_activo(uid uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = uid and estado = 'ACTIVO'
  );
$$;

-- ¿El solicitante supervisa el flujo (ve todo el catálogo de gestión)?
create or replace function public.es_supervisor(uid uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = uid
      and estado = 'ACTIVO'
      and rol in ('SUPERADMIN', 'TALENTO_HUMANO', 'CONTROL_INTERNO')
  );
$$;

-- Área asignada del solicitante (null si no es un AREA activo).
create or replace function public.area_de(uid uuid)
  returns uuid
  language sql
  security definer
  stable
  set search_path = public
as $$
  select area_id from public.usuarios
  where id = uid and estado = 'ACTIVO';
$$;

-- ── Catálogo: lectura para cualquier usuario activo ──────────────────────────
create policy areas_select_activos on areas
  for select
  using (public.es_usuario_activo(auth.uid()));

create policy funcionarios_select_activos on funcionarios
  for select
  using (public.es_usuario_activo(auth.uid()));

-- ── Aprobaciones: supervisores ven todo; un AREA solo la suya ────────────────
-- (Varias políticas SELECT se combinan con OR — permisivas por defecto.)
create policy aprobaciones_select_supervisor on aprobaciones
  for select
  using (public.es_supervisor(auth.uid()));

create policy aprobaciones_select_area on aprobaciones
  for select
  using (area_id = public.area_de(auth.uid()));

-- ── Observaciones: mismo alcance que las aprobaciones ────────────────────────
create policy observaciones_select_supervisor on observaciones
  for select
  using (public.es_supervisor(auth.uid()));

create policy observaciones_select_area on observaciones
  for select
  using (area_id = public.area_de(auth.uid()));
