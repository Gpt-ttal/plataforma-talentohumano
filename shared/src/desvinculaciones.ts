/**
 * desvinculaciones.ts — Tipos puros de la importación masiva de desvinculaciones.
 *
 * "PREVALIDADO" no es un estado del funcionario: es el ciclo de vida de un
 * concepto acotado (lote → filas). Al confirmar una fila válida se reusa el
 * mismo puente que "Finalizar contrato" individual (`iniciarTramiteDesvinculacion`).
 */

export type LoteEstado =
  | "CARGADO"
  | "PREVISUALIZADO"
  | "CONFIRMADO_PARCIAL"
  | "CONFIRMADO_TOTAL";

export const ESTADOS_LOTE: readonly LoteEstado[] = [
  "CARGADO",
  "PREVISUALIZADO",
  "CONFIRMADO_PARCIAL",
  "CONFIRMADO_TOTAL",
] as const;

export type FilaLoteEstado =
  | "VALIDA"
  | "CON_ERROR"
  | "DUPLICADA"
  | "CONFIRMADA"
  | "DESCARTADA";

export const ESTADOS_FILA_LOTE: readonly FilaLoteEstado[] = [
  "VALIDA",
  "CON_ERROR",
  "DUPLICADA",
  "CONFIRMADA",
  "DESCARTADA",
] as const;

/** Una fila del lote: la lectura cruda del Excel + el resultado de su validación. */
export interface FilaLote {
  id: string;
  numeroFila: number;
  documento: string;
  nombreCompleto: string;
  fechaRetiro: string; // ISO date (yyyy-mm-dd)
  cargo: string | null;
  estado: FilaLoteEstado;
  mensajeError: string | null;
  /** Solo poblado tras confirmar (el puente ya creó/tocó el trámite). */
  funcionarioId: string | null;
}

/** Lote de importación con sus filas ya validadas, listo para previsualizar/confirmar. */
export interface LotePrevisualizacion {
  id: string;
  nombreArchivo: string;
  estado: LoteEstado;
  totalFilas: number;
  filasConfirmadas: number;
  creadoPor: string;
  createdAt: string;
  filas: FilaLote[];
  /**
   * Filas del Excel que no se pudieron leer (sin documento/fecha reconocible).
   * Nunca llegan a persistirse como `FilaLote`; solo se devuelven en la
   * respuesta de la previsualización que las generó (vacío en lecturas
   * posteriores del mismo lote).
   */
  erroresParseo: { numeroFila: number; motivo: string }[];
}

// `ConfirmarImportacionParcialInput` vive en `schemas.ts` (inferido de su Zod
// schema), no aquí — mismo patrón que `CambiarEstadoAreaInput`.

export interface ResultadoConfirmacionLote {
  lote: LotePrevisualizacion;
  confirmadas: number;
  fallidas: { filaId: string; motivo: string }[];
}
