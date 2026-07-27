import type { Preaprobacion, Usuario } from "@pys/shared"
import type { PreaprobacionRepo } from "../../domain/ports/PreaprobacionRepo.js"
import { exigirRol } from "../guards.js"

/** El SUPERADMIN lista la allowlist de correos pre-aprobados. */
export function listarPreaprobados(deps: { repo: PreaprobacionRepo }) {
  return async (actor: Usuario): Promise<Preaprobacion[]> => {
    exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador ve la lista de acceso.")
    return deps.repo.listar()
  }
}
