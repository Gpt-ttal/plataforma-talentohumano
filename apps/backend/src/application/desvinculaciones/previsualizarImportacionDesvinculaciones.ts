import type { LotePrevisualizacion, Usuario } from "@pys/shared"
import type { LoteImportacionRepo } from "../../domain/ports/LoteImportacionRepo.js"
import { exigirRol } from "../guards.js"
import { ErrorValidacion } from "../errors.js"
import { parsearArchivoDesvinculaciones } from "../../infrastructure/importacion/parsearArchivoDesvinculaciones.js"

/**
 * Sube un Excel de desvinculaciones masivas, lo parsea y valida cada fila
 * contra la BD (documento existe como empleado ACTIVO, no duplicado en el
 * archivo). No modifica nada todavía: el lote queda `PREVISUALIZADO`, listo
 * para que Talento Humano confirme (parcial o totalmente) vía
 * `confirmarImportacionParcial`.
 */
export function previsualizarImportacionDesvinculaciones(deps: {
  repo: LoteImportacionRepo
}) {
  return async (
    usuario: Usuario,
    input: { nombreArchivo: string; buffer: Buffer },
  ): Promise<LotePrevisualizacion> => {
    exigirRol(
      usuario,
      ["SUPERADMIN", "TALENTO_HUMANO"],
      "Solo Talento Humano puede importar desvinculaciones.",
    )

    const { filas, errores } = parsearArchivoDesvinculaciones(input.buffer)
    if (filas.length === 0 && errores.length === 0) {
      throw new ErrorValidacion("El archivo está vacío.")
    }

    return deps.repo.crearLoteConFilas(
      input.nombreArchivo,
      filas,
      errores,
      usuario.nombre,
    )
  }
}
