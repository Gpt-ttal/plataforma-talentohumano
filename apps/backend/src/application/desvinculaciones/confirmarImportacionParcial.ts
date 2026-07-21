import type { ResultadoConfirmacionLote, Usuario } from "@pys/shared"
import type { LoteImportacionRepo } from "../../domain/ports/LoteImportacionRepo.js"
import { exigirRol } from "../guards.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../errors.js"

/**
 * Confirma (parcial o total) las filas VALIDA seleccionadas de un lote ya
 * previsualizado. Cada fila confirmada dispara `iniciarTramiteDesvinculacion`
 * (mismo puente que "Finalizar contrato"), dentro de una sola transacción.
 */
export function confirmarImportacionParcial(deps: {
  repo: LoteImportacionRepo
}) {
  return async (
    usuario: Usuario,
    loteId: string,
    filaIds: string[],
  ): Promise<ResultadoConfirmacionLote> => {
    exigirRol(
      usuario,
      ["SUPERADMIN", "TALENTO_HUMANO"],
      "Solo Talento Humano puede confirmar una importación.",
    )

    const lote = await deps.repo.obtenerLote(loteId)
    if (!lote) throw new ErrorNoEncontrado("Lote no encontrado.")
    if (lote.estado === "CONFIRMADO_TOTAL") {
      throw new ErrorValidacion("El lote ya fue confirmado en su totalidad.")
    }

    return deps.repo.confirmarParcial(loteId, filaIds, usuario.nombre)
  }
}
