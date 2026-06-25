import type { Pagina, ResultadoPaginado, Usuario } from "@pys/shared"
import type { UsuarioRepo } from "../../domain/ports/UsuarioRepo.js"
import { exigirRol } from "../guards.js"

/**
 * Listado de usuarios para la administración (PENDIENTE primero), paginado.
 * Solo el SUPERADMIN administra usuarios.
 */
export function listarUsuarios(deps: { repo: UsuarioRepo }) {
  return async (
    actor: Usuario,
    pagina?: Pagina,
  ): Promise<ResultadoPaginado<Usuario>> => {
    exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador ve los usuarios.")
    return deps.repo.listarUsuarios(pagina)
  }
}
