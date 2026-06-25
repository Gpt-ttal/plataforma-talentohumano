import type { AreaVistoBueno, Usuario } from "@pys/shared"
import type { AreaRepo } from "../../domain/ports/AreaRepo.js"

/**
 * Catálogo de áreas (datos de referencia). Disponible para cualquier usuario
 * autenticado (lo consume el dropdown de asignación de área y la UI en general);
 * no hay autorización fina sobre datos de referencia, solo requiere sesión —
 * garantizada por `requireAuth` en la capa HTTP. Por eso recibe el `Usuario` pero
 * no aplica guarda de rol.
 */
export function listarAreas(deps: { repo: AreaRepo }) {
  return async (_actor: Usuario): Promise<AreaVistoBueno[]> => {
    return deps.repo.listarAreas()
  }
}
