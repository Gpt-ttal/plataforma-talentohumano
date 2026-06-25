import type {
  FilaGestionArea,
  Pagina,
  ResultadoPaginado,
  Usuario,
} from "@pys/shared"
import { areaPermitida } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { ErrorAutorizacion } from "../errors.js"

/**
 * Cola de trabajo de un área, paginada. Guarda combinada:
 *  - Un usuario AREA solo su propia cola; el SUPERADMIN cualquiera.
 *  - Cualquier otro rol → 403.
 * `areaPermitida` cubre ambas condiciones (SUPERADMIN siempre, AREA su área, resto no).
 */
export function listarGestionArea(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    areaId: string,
    pagina?: Pagina,
  ): Promise<ResultadoPaginado<FilaGestionArea>> => {
    if (!areaPermitida(usuario, areaId)) {
      throw new ErrorAutorizacion("No tiene permiso para ver esta cola de área.")
    }
    return deps.repo.listarGestionAreaPaginado(areaId, pagina)
  }
}
