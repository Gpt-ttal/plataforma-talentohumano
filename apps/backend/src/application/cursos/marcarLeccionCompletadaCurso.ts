import type { IngresoCursoResultado } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"

/**
 * Caso de uso PÚBLICO: no requiere actor (anónimo). Toda la validación de
 * negocio (existencia de la inscripción, pertenencia de la lección al curso)
 * vive en el repo, dentro de la misma transacción que registra el progreso.
 */
export function marcarLeccionCompletadaCurso(deps: { repo: CursoRepo }) {
  return async (
    token: string,
    documento: string,
    leccionId: string,
  ): Promise<IngresoCursoResultado> => {
    return deps.repo.marcarLeccionCompletada(token, documento, leccionId)
  }
}
