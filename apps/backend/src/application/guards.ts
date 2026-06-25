import type { RolUsuario, Usuario } from "@pys/shared"
import { ErrorAutorizacion } from "./errors.js"

/**
 * Verja de rol reutilizable: lanza `ErrorAutorizacion` (403) si el rol del usuario
 * no está entre los permitidos. La autorización fina por área se resuelve aparte
 * con `areaPermitida` de `@pys/shared`.
 */
export function exigirRol(
  usuario: Usuario,
  roles: readonly RolUsuario[],
  mensaje = "No tiene permiso para esta acción.",
): void {
  if (!roles.includes(usuario.rol)) {
    throw new ErrorAutorizacion(mensaje)
  }
}
