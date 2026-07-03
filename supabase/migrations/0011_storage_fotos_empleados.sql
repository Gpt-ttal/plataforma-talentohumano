-- 0011_storage_fotos_empleados.sql — Hoja de Vida 360°, Sprint 2: bucket de fotos.
--
-- Bucket PRIVADO para la foto del expediente (`funcionarios.foto_path`, columna ya
-- creada en 0010). Deny-directo por diseño: NO se agregan políticas RLS sobre
-- `storage.objects` para este bucket (mismo patrón que `novedades`/`capacitaciones`
-- — RLS habilitada por Supabase a nivel de plataforma + sin políticas = ningún
-- cliente anon/authenticated puede leer u escribir directo).
--
-- El backend accede exclusivamente con el service role (bypassa RLS por diseño de
-- Supabase) para emitir URLs firmadas de un solo uso:
--   - Subida: `createSignedUploadUrl` — el navegador hace el PUT directo al bucket
--     con esa URL; el backend nunca ve los bytes de la imagen.
--   - Lectura: URL firmada de corta duración generada bajo demanda.
-- Ver `apps/backend/src/infrastructure/storage/supabaseStorage.ts`.

insert into storage.buckets (id, name, public)
values ('fotos-empleados', 'fotos-empleados', false)
on conflict (id) do nothing;
