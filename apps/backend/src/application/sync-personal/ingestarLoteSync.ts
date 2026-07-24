import type {
  LoteSyncPrevisualizacion,
  OrigenLoteSync,
  RegistroIcebergCrudo,
  Usuario,
} from "@pys/shared"
import type { SyncPersonalRepo } from "../../domain/ports/SyncPersonalRepo.js"
import { exigirRol } from "../guards.js"
import { ErrorValidacion } from "../errors.js"
import { parsearRegistrosIceberg } from "../../infrastructure/sync/parsearRegistrosIceberg.js"

/**
 * Ingesta un lote de registros de Iceberg (servicio n8n o carga manual de TH):
 * los normaliza con la ACL y los guarda como lote PENDIENTE de revisión — NUNCA
 * escribe al expediente aquí. Ambos caminos (servicio/manual) convergen en este
 * núcleo. Guarda de rol SA/TH (el actor de servicio también la satisface).
 * Idempotente por `idempotencyKey` (lo resuelve el repo).
 */
export function ingestarLoteSync(deps: { repo: SyncPersonalRepo }) {
  return async (
    usuario: Usuario,
    input: {
      registros: RegistroIcebergCrudo[]
      origen: OrigenLoteSync
      idempotencyKey: string | null
    },
  ): Promise<LoteSyncPrevisualizacion> => {
    exigirRol(
      usuario,
      ["SUPERADMIN", "TALENTO_HUMANO"],
      "No tiene permiso para ingerir datos de personal.",
    )

    const { filas, errores } = parsearRegistrosIceberg(input.registros)
    if (filas.length === 0 && errores.length === 0) {
      throw new ErrorValidacion("El lote no contiene registros.")
    }

    return deps.repo.crearLoteConFilas(
      input.origen,
      filas,
      errores,
      usuario.nombre,
      input.idempotencyKey,
    )
  }
}
