import type { ResultadoConfirmacionSync, Usuario } from "@pys/shared"
import type { SyncPersonalRepo } from "../../domain/ports/SyncPersonalRepo.js"
import { exigirRol } from "../guards.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../errors.js"

/**
 * Confirma (parcial o total) las filas VALIDA seleccionadas de un lote de sync ya
 * previsualizado. Cada fila confirmada reparte al expediente vía
 * `aplicarRegistroSync` (upsert por documento), dentro de una sola transacción.
 * Espejo de `confirmarImportacionParcial`. Guarda de rol SA/TH; 404 si el lote no
 * existe; 400 si ya fue confirmado en su totalidad.
 */
export function confirmarSyncParcial(deps: { repo: SyncPersonalRepo }) {
  return async (
    usuario: Usuario,
    loteId: string,
    filaIds: string[],
  ): Promise<ResultadoConfirmacionSync> => {
    exigirRol(
      usuario,
      ["SUPERADMIN", "TALENTO_HUMANO"],
      "No tiene permiso para confirmar una sincronización.",
    )

    const lote = await deps.repo.obtenerLote(loteId)
    if (!lote) throw new ErrorNoEncontrado("Lote no encontrado.")
    if (lote.estado === "CONFIRMADO_TOTAL") {
      throw new ErrorValidacion("El lote ya fue confirmado en su totalidad.")
    }

    return deps.repo.confirmarParcial(loteId, filaIds, usuario.nombre)
  }
}
