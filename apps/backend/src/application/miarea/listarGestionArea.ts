import type {
  ColaGestionArea,
  FiltroGestionArea,
  Usuario,
} from "@pys/shared"
import { areaPermitida } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { ErrorAutorizacion } from "../errors.js"

/**
 * Cola de trabajo de un área, paginada y partida por bucket (por gestionar /
 * gestionados / todos) con contadores. Guarda combinada:
 *  - Un usuario AREA solo su propia cola; el SUPERADMIN cualquiera.
 *  - Cualquier otro rol → 403.
 * `areaPermitida` cubre ambas condiciones (SUPERADMIN siempre, AREA su área, resto no).
 */
export function listarGestionArea(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    areaId: string,
    filtro?: FiltroGestionArea,
  ): Promise<ColaGestionArea> => {
    if (!areaPermitida(usuario, areaId)) {
      throw new ErrorAutorizacion("No tiene permiso para ver esta cola de área.")
    }
    return deps.repo.listarGestionAreaPaginado(areaId, filtro)
  }
}
