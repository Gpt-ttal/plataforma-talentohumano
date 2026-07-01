import type { AreaVistoBueno, MoverAreaInput, Usuario } from "@pys/shared"
import type { AreaRepo } from "../../domain/ports/AreaRepo.js"
import { exigirRol } from "../guards.js"

/** El SUPERADMIN reordena una dependencia. Devuelve el catálogo actualizado. */
export function moverArea(deps: { repo: AreaRepo }) {
  return async (actor: Usuario, input: MoverAreaInput): Promise<AreaVistoBueno[]> => {
    exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador reordena áreas.")
    return deps.repo.moverArea(input.areaId, input.direccion)
  }
}
