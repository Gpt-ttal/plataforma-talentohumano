import type { CambiarEstadoUsuarioInput, Usuario } from "@pys/shared"
import { errorInvarianteUsuario } from "@pys/shared"
import type { UsuarioRepo } from "../../domain/ports/UsuarioRepo.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

/**
 * El SUPERADMIN activa o inactiva un usuario. Reusa los datos actuales para validar
 * el invariante: no se puede ACTIVAR a un AREA que aún no tiene área asignada.
 *
 * Guardas:
 *  - Rol del actor = SUPERADMIN → si no, 403.
 *  - 404 si el usuario objetivo no existe.
 *  - Invariante rol↔área sobre el estado solicitado → 400 si se viola.
 */
export function cambiarEstadoUsuario(deps: { repo: UsuarioRepo }) {
  return async (
    actor: Usuario,
    input: CambiarEstadoUsuarioInput,
  ): Promise<Usuario> => {
    exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador cambia el estado de un usuario.")

    const actual = await deps.repo.obtenerUsuarioPorId(input.usuarioId)
    if (!actual) throw new ErrorNoEncontrado("Usuario no encontrado.")

    const violacion = errorInvarianteUsuario({
      rol: actual.rol,
      estado: input.estado,
      areaId: actual.areaId,
    })
    if (violacion) throw new ErrorValidacion(violacion)

    return deps.repo.actualizarUsuario(input.usuarioId, { estado: input.estado })
  }
}
