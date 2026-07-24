/**
 * sync.ts — Tipos puros del sync de personal desde Iceberg.
 *
 * Espejo de `desvinculaciones.ts`: el dato de Iceberg NUNCA escribe directo. Entra
 * como un lote (→ filas) que TH revisa campo-a-campo y confirma; al confirmar una
 * fila válida se reparte al expediente vía el puente `aplicarRegistroSync` (upsert
 * por documento). El ciclo de vida del lote/fila se REUSA de la importación masiva
 * (`LoteEstado`/`FilaLoteEstado`) — misma máquina, mismo Semáforo Único.
 *
 * `RegistroIcebergCrudo` (la lectura cruda del contrato HTTP) vive en `schemas.ts`
 * inferido de su Zod schema — mismo patrón que `ConfirmarImportacionParcialInput`.
 */

import type {
  EstadoCivil,
  Genero,
  TipoContrato,
  TipoDocumento,
  TipoVinculacion,
} from "./domain.js";
import type { FilaLoteEstado, LoteEstado } from "./desvinculaciones.js";

/** Cómo llegó el lote: el endpoint de servicio (n8n) o la carga manual de TH. */
export type OrigenLoteSync = "SERVICIO" | "MANUAL";

export const ORIGENES_LOTE_SYNC: readonly OrigenLoteSync[] = [
  "SERVICIO",
  "MANUAL",
] as const;

/**
 * Acción que implica un valor entrante sobre el expediente actual:
 *  - CREA            ⟺ el empleado no existe (nuevo ingreso).
 *  - ACTUALIZA       ⟺ existe y el valor entrante difiere del actual.
 *  - SIN_CAMBIO      ⟺ existe y el valor coincide (no se toca).
 *  - CONFLICTO_MANUAL ⟺ existe, difiere, y el valor actual fue editado a mano
 *    después del último sync (se sobrescribe pero se marca y se audita).
 */
export type AccionDiff = "CREA" | "ACTUALIZA" | "SIN_CAMBIO" | "CONFLICTO_MANUAL";

export const ACCIONES_DIFF: readonly AccionDiff[] = [
  "CREA",
  "ACTUALIZA",
  "SIN_CAMBIO",
  "CONFLICTO_MANUAL",
] as const;

/**
 * Una fila del lote: el registro de Iceberg ya NORMALIZADO a columnas tipadas
 * (una por atributo) + el resultado de su validación. Los campos que no se
 * pudieron normalizar quedan `null` y su motivo va en `mensajeError`.
 */
export interface FilaSync {
  id: string;
  numeroFila: number;
  // ── Identidad / core ──
  documento: string;
  nombreCompleto: string;
  // ── Personales ──
  genero: Genero | null;
  tipoDocumento: TipoDocumento | null;
  fechaExpedicion: string | null; // ISO date
  nacionalidad: string | null;
  fechaNacimiento: string | null; // ISO date
  lugarResidencia: string | null;
  direccion: string | null;
  telefono: string | null;
  barrio: string | null;
  estadoCivil: EstadoCivil | null;
  /** "Personas a cargo" de Iceberg (conteo; no crea familiares por sí solo). */
  personasACargo: number | null;
  correo: string | null;
  // ── Contractual ──
  cargo: string | null;
  /** Estado del contrato tal como lo reporta Iceberg (texto; informativo). */
  estadoContrato: string | null;
  centroCostos: string | null;
  /** Nombre del fondo/sede; se resuelve a FK (`fondos_sede`) al aplicar. */
  fondoSede: string | null;
  fechaIngreso: string | null; // ISO date
  fechaFinContrato: string | null; // ISO date
  dependencia: string | null;
  tipoEmpleado: TipoVinculacion | null;
  tipoContrato: TipoContrato | null;
  categoria: string | null;
  // ── Salarial (sensible) ──
  salario: number | null;
  eps: string | null;
  /** Fondo de pensiones y cesantías tal como llega (una sola cadena en Iceberg). */
  fondoPensionCesantias: string | null;
  // ── Bancario (sensible, placeholder) ──
  /** "Certificado bancario" crudo; su estructura exacta se cierra con el payload real. */
  certificadoBancario: string | null;
  // ── Resultado de validación ──
  estado: FilaLoteEstado;
  mensajeError: string | null;
  /** Solo poblado tras confirmar (el puente ya creó/actualizó el expediente). */
  funcionarioId: string | null;
}

/**
 * Diferencia de un campo entre el expediente actual y el valor entrante, ya
 * formateada para la UI. La `accion` decide el tratamiento y el color.
 */
export interface DiffCampo {
  /** Clave técnica del atributo (p. ej. "cargo", "salario"). */
  campo: string;
  /** Etiqueta legible es-CO para la tabla de revisión. */
  etiqueta: string;
  /** Valor actual en el expediente, formateado. `null` si no existe/está vacío. */
  actual: string | null;
  /** Valor entrante del lote, formateado. `null` si el lote no lo trae. */
  entrante: string | null;
  accion: AccionDiff;
}

/** Fila del lote enriquecida con el diff campo-a-campo y si es un alta nueva. */
export interface FilaSyncConDiff extends FilaSync {
  diffs: DiffCampo[];
  /** true si no existe un empleado con este documento (el confirmar lo CREA). */
  esNuevoIngreso: boolean;
}

/** Vista ligera del lote para listados (sin filas). */
export interface LoteSync {
  id: string;
  origen: OrigenLoteSync;
  estado: LoteEstado;
  totalFilas: number;
  filasConfirmadas: number;
  creadoPor: string;
  createdAt: string;
}

/** Lote de sync con sus filas ya validadas y su diff, listo para revisar/confirmar. */
export interface LoteSyncPrevisualizacion {
  id: string;
  origen: OrigenLoteSync;
  estado: LoteEstado;
  totalFilas: number;
  filasConfirmadas: number;
  creadoPor: string;
  /** Clave de idempotencia de la corrida (header/servicio). `null` en carga manual. */
  idempotencyKey: string | null;
  createdAt: string;
  filas: FilaSyncConDiff[];
  /**
   * Registros que no se pudieron leer (sin documento/nombre reconocible). Nunca
   * se persisten como `FilaSync`; solo se devuelven en la respuesta de la
   * previsualización que los generó (vacío en lecturas posteriores del lote).
   */
  erroresParseo: { numeroFila: number; motivo: string }[];
}

// `ConfirmarSyncParcialInput` vive en `schemas.ts` (inferido de su Zod schema),
// no aquí — mismo patrón que `ConfirmarImportacionParcialInput`.

export interface ResultadoConfirmacionSync {
  lote: LoteSyncPrevisualizacion;
  confirmadas: number;
  fallidas: { filaId: string; motivo: string }[];
}
