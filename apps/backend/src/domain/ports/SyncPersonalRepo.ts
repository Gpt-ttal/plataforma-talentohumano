import type {
  FilaSync,
  LoteSyncPrevisualizacion,
  OrigenLoteSync,
  ResultadoConfirmacionSync,
} from "@pys/shared"

/**
 * Un registro de Iceberg YA NORMALIZADO por la ACL (`parsearRegistrosIceberg`):
 * columnas tipadas, sin los campos que asigna el repo al persistir (`id`,
 * `estado`, `mensajeError`, `funcionarioId`). Es la ENTRADA del staging.
 */
export type RegistroSyncNormalizado = Omit<
  FilaSync,
  "id" | "estado" | "mensajeError" | "funcionarioId"
>

/** Registro de Iceberg que no se pudo leer (sin documento/nombre reconocible). */
export interface ErrorParseoFila {
  numeroFila: number
  motivo: string
}

export interface SyncPersonalRepo {
  /**
   * Crea el lote y clasifica cada fila normalizada: documento repetido dentro
   * del propio lote → DUPLICADA; el resto → VALIDA (el sync UPSERTEA, así que un
   * documento inexistente NO es error: es un alta nueva). Idempotente por
   * `idempotencyKey`: si ya existe una corrida con esa clave, devuelve el lote
   * existente sin crear uno nuevo.
   */
  crearLoteConFilas(
    origen: OrigenLoteSync,
    registros: RegistroSyncNormalizado[],
    erroresParseo: ErrorParseoFila[],
    creadoPor: string,
    idempotencyKey: string | null,
  ): Promise<LoteSyncPrevisualizacion>
  obtenerLote(id: string): Promise<LoteSyncPrevisualizacion | null>
  /**
   * Confirma las filas VALIDA seleccionadas: por cada una, reparte al expediente
   * vía `aplicarRegistroSync` (upsert por documento) dentro de una sola
   * transacción. Una fila que falla queda `DESCARTADA` con el motivo, sin abortar
   * el resto del lote (tolerancia a fallos parciales).
   */
  confirmarParcial(
    loteId: string,
    filaIds: string[],
    autor: string,
  ): Promise<ResultadoConfirmacionSync>
}
