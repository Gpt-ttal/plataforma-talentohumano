import type { Usuario } from "@pys/shared"
import type {
  ArchivarCasoResultado,
  FuncionarioRepo,
} from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../errors.js"

/**
 * Sella el archivado formal de un trámite ya cerrado. "ARCHIVADO" no es un
 * estado del funcionario, es un timestamp ortogonal (`archivadoEn`) solo
 * asignable sobre un trámite en `PAZ_Y_SALVO` — el módulo `/archivo` ya trata
 * ese estado como cerrado/solo-lectura.
 *
 * Guardas:
 *  - Rol ∈ {TALENTO_HUMANO, SUPERADMIN} → si no, 403.
 *  - El funcionario debe existir (404) y estar en `PAZ_Y_SALVO` (400 si no).
 *  - El repo cierra el TOCTOU (idempotencia) con un UPDATE condicionado.
 */
export function archivarCaso(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    funcionarioId: string,
  ): Promise<ArchivarCasoResultado> => {
    exigirRol(
      usuario,
      ["SUPERADMIN", "TALENTO_HUMANO"],
      "Solo Talento Humano puede archivar el caso.",
    )

    const detalle = await deps.repo.obtenerDetalle(funcionarioId)
    if (!detalle) throw new ErrorNoEncontrado("Funcionario no encontrado.")
    if (detalle.funcionario.estadoGlobal !== "PAZ_Y_SALVO") {
      throw new ErrorValidacion(
        "Solo se puede archivar un trámite cerrado (paz y salvo).",
      )
    }

    return deps.repo.archivarCaso(funcionarioId, usuario.nombre)
  }
}
