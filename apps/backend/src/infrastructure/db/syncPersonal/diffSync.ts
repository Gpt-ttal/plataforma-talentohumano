/**
 * diffSync.ts — Núcleo PURO (sin I/O) del reparto/revisión del sync de personal.
 *
 * Dos responsabilidades, ambas testeables sin base de datos:
 *  - `clasificarFilasSync`: decide VALIDA/DUPLICADA por documento repetido DENTRO
 *    del propio lote. A diferencia de la importación de desvinculaciones, un
 *    documento inexistente NO es error: el sync UPSERTEA (documento nuevo → alta).
 *  - `calcularDiffs`: compara el expediente actual con el valor entrante campo-a-
 *    campo y produce el `DiffCampo[]` que consume la pantalla de revisión, más el
 *    flag `esNuevoIngreso`. La MISMA lista de campos (`CAMPOS_DIFF`) alimenta la
 *    auditoría de sobrescrituras del puente `aplicarRegistroSync`, para que "qué se
 *    compara" no pueda divergir entre la vista y la escritura.
 *
 * `CONFLICTO_MANUAL` (edición manual pisada por el sync) NO se emite en v1: requiere
 * trackear por campo si hubo edición manual posterior (punto de extensión, §8 del
 * diseño). El tipo lo contempla para no cerrar esa puerta.
 */

import type { AccionDiff, DiffCampo, FilaLoteEstado, FilaSync } from "@pys/shared"

/** Campos de `FilaSync` que se comparan/repartan al expediente (excluye identidad y meta). */
export type CampoDiff =
  | "nombreCompleto"
  | "tipoDocumento"
  | "genero"
  | "fechaExpedicion"
  | "nacionalidad"
  | "fechaNacimiento"
  | "lugarResidencia"
  | "direccion"
  | "telefono"
  | "barrio"
  | "estadoCivil"
  | "correo"
  | "cargo"
  | "centroCostos"
  | "fondoSede"
  | "fechaIngreso"
  | "fechaFinContrato"
  | "dependencia"
  | "tipoEmpleado"
  | "tipoContrato"
  | "categoria"
  | "salario"
  | "eps"
  | "fondoPensionCesantias"

/**
 * Foto plana del expediente actual para el diff: solo los campos comparables, con
 * el MISMO tipo que en `FilaSync` (así la comparación es simétrica). Un campo
 * ausente/`undefined` se trata como sin valor actual.
 */
export type SnapshotActualSync = Partial<Pick<FilaSync, CampoDiff>>

interface DescriptorCampo {
  campo: CampoDiff
  etiqueta: string
  /** true si el valor es un monto numérico (formateo con separador de miles es-CO). */
  numerico?: boolean
}

/**
 * Orden y etiquetas es-CO de la tabla de revisión. `certificadoBancario`,
 * `personasACargo` y `estadoContrato` NO están aquí a propósito: son informativos
 * o de estructura aún no cerrada (ver `aplicarRegistroSync`), no se repartan en v1.
 */
export const CAMPOS_DIFF: readonly DescriptorCampo[] = [
  { campo: "nombreCompleto", etiqueta: "Nombre completo" },
  { campo: "tipoDocumento", etiqueta: "Tipo de documento" },
  { campo: "genero", etiqueta: "Sexo" },
  { campo: "fechaExpedicion", etiqueta: "Fecha de expedición" },
  { campo: "nacionalidad", etiqueta: "Nacionalidad" },
  { campo: "fechaNacimiento", etiqueta: "Fecha de nacimiento" },
  { campo: "lugarResidencia", etiqueta: "Lugar de residencia" },
  { campo: "direccion", etiqueta: "Dirección" },
  { campo: "telefono", etiqueta: "Teléfono" },
  { campo: "barrio", etiqueta: "Barrio" },
  { campo: "estadoCivil", etiqueta: "Estado civil" },
  { campo: "correo", etiqueta: "Correo" },
  { campo: "cargo", etiqueta: "Cargo" },
  { campo: "centroCostos", etiqueta: "Centro de costos" },
  { campo: "fondoSede", etiqueta: "Fondo / sede" },
  { campo: "fechaIngreso", etiqueta: "Fecha de ingreso" },
  { campo: "fechaFinContrato", etiqueta: "Fecha de finalización" },
  { campo: "dependencia", etiqueta: "Dependencia" },
  { campo: "tipoEmpleado", etiqueta: "Tipo de empleado" },
  { campo: "tipoContrato", etiqueta: "Tipo de contrato" },
  { campo: "categoria", etiqueta: "Categoría" },
  { campo: "salario", etiqueta: "Salario", numerico: true },
  { campo: "eps", etiqueta: "EPS" },
  { campo: "fondoPensionCesantias", etiqueta: "Fondo pensión/cesantías" },
] as const

/** Separador de miles es-CO determinista (sin depender de Intl/ICU). */
function agruparMiles(n: number): string {
  const [ent = "", dec] = String(n).split(".")
  const conMiles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return dec ? `${conMiles},${dec}` : conMiles
}

/** Formatea un valor de campo a texto para la tabla de revisión (o `null` si vacío). */
function formatear(valor: string | number | null | undefined, numerico?: boolean): string | null {
  if (valor === null || valor === undefined) return null
  if (numerico && typeof valor === "number") return agruparMiles(valor)
  const s = String(valor).trim()
  return s === "" ? null : s
}

/**
 * Compara el expediente actual (`null` si el documento no existe → nuevo ingreso)
 * con la fila entrante y devuelve el diff campo-a-campo + `esNuevoIngreso`. Solo
 * genera fila de diff para las columnas que Iceberg trae (entrante no vacío): lo
 * que el lote no incluye no se toca ni se muestra.
 */
export function calcularDiffs(
  actual: SnapshotActualSync | null,
  fila: FilaSync,
): { diffs: DiffCampo[]; esNuevoIngreso: boolean } {
  const esNuevoIngreso = actual === null
  const diffs: DiffCampo[] = []

  for (const { campo, etiqueta, numerico } of CAMPOS_DIFF) {
    const entrante = formatear(fila[campo] as string | number | null, numerico)
    if (entrante === null) continue // Iceberg no trae este campo → nada que revisar.

    const valorActual = formatear(actual?.[campo] as string | number | null, numerico)
    let accion: AccionDiff
    if (esNuevoIngreso) accion = "CREA"
    else if (valorActual === entrante) accion = "SIN_CAMBIO"
    else accion = "ACTUALIZA"

    diffs.push({ campo, etiqueta, actual: valorActual, entrante, accion })
  }

  return { diffs, esNuevoIngreso }
}

/**
 * Clasifica cada fila por documento repetido en el propio lote. El orden del
 * arreglo de salida coincide con el de entrada (una entrada por documento dado).
 */
export function clasificarFilasSync(
  documentos: string[],
): { estado: FilaLoteEstado; mensajeError: string | null }[] {
  const conteo = new Map<string, number>()
  for (const d of documentos) conteo.set(d, (conteo.get(d) ?? 0) + 1)

  return documentos.map((d) =>
    (conteo.get(d) ?? 0) > 1
      ? { estado: "DUPLICADA", mensajeError: "Documento repetido en el lote." }
      : { estado: "VALIDA", mensajeError: null },
  )
}
