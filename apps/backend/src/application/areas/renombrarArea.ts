import type { AreaVistoBueno, RenombrarAreaInput, Usuario } from "@pys/shared"
import type { AreaRepo } from "../../domain/ports/AreaRepo.js"
import { exigirRol } from "../guards.js"

/** El SUPERADMIN renombra una dependencia. Devuelve el catálogo actualizado. */
export function renombrarArea(deps: { repo: AreaRepo }) {
  return async (actor: Usuario, input: RenombrarAreaInput): Promise<AreaVistoBueno[]> => {
    exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador renombra áreas.")
    return deps.repo.renombrarArea(input.areaId, input.nombre)
  }
}
