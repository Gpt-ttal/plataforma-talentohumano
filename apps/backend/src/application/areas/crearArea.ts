import type { AreaVistoBueno, CrearAreaInput, Usuario } from "@pys/shared"
import type { AreaRepo } from "../../domain/ports/AreaRepo.js"
import { exigirRol } from "../guards.js"

/**
 * El SUPERADMIN crea una dependencia nueva. El backfill de `aprobaciones` y el
 * recálculo de estados (D1) los hace el repo en una transacción. Devuelve el
 * catálogo completo actualizado.
 */
export function crearArea(deps: { repo: AreaRepo }) {
  return async (actor: Usuario, input: CrearAreaInput): Promise<AreaVistoBueno[]> => {
    exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador crea áreas.")
    return deps.repo.crearArea(input.nombre)
  }
}
