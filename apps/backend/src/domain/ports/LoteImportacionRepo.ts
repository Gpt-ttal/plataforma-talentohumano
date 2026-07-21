import type {
  LotePrevisualizacion,
  ResultadoConfirmacionLote,
} from "@pys/shared"

/** Fila cruda leída del Excel, previa a validar contra la BD. */
export interface FilaCruda {
  numeroFila: number
  documento: string
  nombreCompleto: string
  fechaRetiro: string
  cargo: string | null
}

/** Fila del Excel que no se pudo leer (sin documento/fecha reconocible). */
export interface ErrorParseoFila {
  numeroFila: number
  motivo: string
}

export interface LoteImportacionRepo {
  /**
   * Crea el lote y valida cada fila contra la BD: documento existente como
   * empleado ACTIVO → VALIDA; no existe o ya tiene trámite en curso →
   * CON_ERROR; documento repetido dentro del propio archivo → DUPLICADA.
   */
  crearLoteConFilas(
    nombreArchivo: string,
    filas: FilaCruda[],
    erroresParseo: ErrorParseoFila[],
    creadoPor: string,
  ): Promise<LotePrevisualizacion>
  obtenerLote(id: string): Promise<LotePrevisualizacion | null>
  /**
   * Confirma las filas VALIDA seleccionadas: por cada una, reusa
   * `iniciarTramiteDesvinculacion` dentro de una sola transacción. Una fila
   * que falla al confirmar (p. ej. el empleado cambió de estado mientras
   * tanto) queda `DESCARTADA` con el motivo, sin abortar el resto del lote.
   */
  confirmarParcial(
    loteId: string,
    filaIds: string[],
    autor: string,
  ): Promise<ResultadoConfirmacionLote>
}
