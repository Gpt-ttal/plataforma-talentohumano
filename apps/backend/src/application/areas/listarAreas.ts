import type { AreaVistoBueno, Usuario } from "@pys/shared"
import type { AreaRepo } from "../../domain/ports/AreaRepo.js"
import { exigirRol } from "../guards.js"

/**
 * Catálogo de áreas. La lectura de áreas activas es dato de referencia para
 * cualquier usuario autenticado (dropdowns, colas). Pedir las inactivas
 * (`incluirInactivas`) es vista de administración → exige SUPERADMIN.
 */
export function listarAreas(deps: { repo: AreaRepo }) {
  return async (
    actor: Usuario,
    opts?: { incluirInactivas?: boolean },
  ): Promise<AreaVistoBueno[]> => {
    if (opts?.incluirInactivas) {
      exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador administra el catálogo de áreas.")
      return deps.repo.listarAreas(true)
    }
    return deps.repo.listarAreas(false)
  }
}
