import type { AsignarRolInput, EstadoUsuario, Usuario } from "@pys/shared"
import { errorInvarianteUsuario } from "@pys/shared"
import type { UsuarioRepo } from "../../domain/ports/UsuarioRepo.js"
import { ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

/**
 * El SUPERADMIN asigna rol (+ área si es AREA) a un usuario y lo deja ACTIVO.
 *
 * Guardas:
 *  - Rol del actor = SUPERADMIN → si no, 403.
 *  - Invariante rol↔área: un AREA activo exige área; el resto de roles no llevan
 *    área (se fuerza a null). Si se viola → 400.
 */
export function asignarRol(deps: { repo: UsuarioRepo }) {
  return async (actor: Usuario, input: AsignarRolInput): Promise<Usuario> => {
    exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador asigna roles.")

    const rol = input.rol
    const areaId = rol === "AREA" ? (input.areaId ?? null) : null
    const estado: EstadoUsuario = "ACTIVO"

    const violacion = errorInvarianteUsuario({ rol, estado, areaId })
    if (violacion) throw new ErrorValidacion(violacion)

    return deps.repo.actualizarUsuario(input.usuarioId, { rol, areaId, estado })
  }
}
