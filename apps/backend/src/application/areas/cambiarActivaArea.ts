import type { AreaVistoBueno, CambiarActivaAreaInput, Usuario } from "@pys/shared"
import type { AreaRepo } from "../../domain/ports/AreaRepo.js"
import { exigirRol } from "../guards.js"

/**
 * El SUPERADMIN activa/desactiva una dependencia (D2). El recálculo en lote de
 * los funcionarios afectados lo hace el repo en una transacción. Devuelve el
 * catálogo actualizado.
 */
export function cambiarActivaArea(deps: { repo: AreaRepo }) {
  return async (actor: Usuario, input: CambiarActivaAreaInput): Promise<AreaVistoBueno[]> => {
    exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador activa o desactiva áreas.")
    return deps.repo.cambiarActivaArea(input.areaId, input.activa)
  }
}
