import type { LoteSyncPrevisualizacion, Usuario } from "@pys/shared"
import type { SyncPersonalRepo } from "../../domain/ports/SyncPersonalRepo.js"
import { exigirRol } from "../guards.js"
import { ErrorNoEncontrado } from "../errors.js"

/**
 * Lote de sync con sus filas y el diff campo-a-campo, para la pantalla de
 * revisión. Guarda de rol SA/TH. 404 si el lote no existe.
 */
export function obtenerLoteSync(deps: { repo: SyncPersonalRepo }) {
  return async (
    usuario: Usuario,
    loteId: string,
  ): Promise<LoteSyncPrevisualizacion> => {
    exigirRol(
      usuario,
      ["SUPERADMIN", "TALENTO_HUMANO"],
      "No tiene permiso para ver el lote de sincronización.",
    )

    const lote = await deps.repo.obtenerLote(loteId)
    if (!lote) throw new ErrorNoEncontrado("Lote no encontrado.")
    return lote
  }
}
