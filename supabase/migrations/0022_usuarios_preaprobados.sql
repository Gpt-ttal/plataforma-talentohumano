-- 0022_usuarios_preaprobados.sql — Allowlist de acceso por correo (pre-aprobación).
--
-- CAMBIO DE MODELO DE ACCESO: hasta hoy, cualquier identidad del dominio
-- institucional (@americana.edu.co) que hiciera login con Google se autoregistraba
-- como AREA/PENDIENTE, quedando a la espera de que el superadmin le asignara rol.
-- La política nueva ("nosotros asignamos a los usuarios, no cualquiera con login
-- @americana entra") invierte eso a una allowlist: el superadmin pre-aprueba un
-- correo con su rol/área/estado y SOLO esos correos pueden crear su usuario en el
-- primer ingreso.
--
-- La PK de `usuarios` es `auth.users.id` (uuid de Supabase), desconocido antes del
-- primer login → la allowlist se llavea por EMAIL (normalizado a minúsculas por la
-- aplicación antes de escribir/consultar).
--
-- ROLLOUT SEGURO (no rompe a nadie):
--   • Los usuarios ya registrados conservan acceso: `asegurarUsuario` corta en la
--     rama "usuario existente" antes de mirar la allowlist.
--   • El correo de bootstrap (`SUPERADMIN_EMAIL` por env) siempre entra, aunque no
--     esté en la tabla (así el primer SA puede poblar la lista).
--   • El código consulta la tabla con FALLBACK: mientras esta migración no esté
--     aplicada, `asegurarUsuario` detecta la ausencia de la tabla y preserva el
--     autoregistro histórico (patrón de la 0019). El gate solo se activa cuando la
--     tabla existe en la BD.
--
-- SEGURIDAD: RLS "deny-directo" (ADR-0006) — RLS habilitado sin políticas; el
-- backend accede con service role, nunca el cliente autenticado directo.

create table usuarios_preaprobados (
  email        text primary key,
  rol          rol_usuario not null,
  area_id      uuid references areas(id),
  estado       estado_usuario not null default 'ACTIVO',
  invitado_por uuid references usuarios(id),
  created_at   timestamptz not null default now()
);

alter table usuarios_preaprobados enable row level security;
