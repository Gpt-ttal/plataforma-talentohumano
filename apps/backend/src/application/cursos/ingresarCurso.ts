import type { IngresarCursoInput, IngresoCursoResultado } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"

/**
 * Caso de uso PÚBLICO: no requiere actor (anónimo). El token valida que el
 * curso existe y es accesible; el repo hace el insert idempotente (UNIQUE
 * curso_id+documento → onConflictDoNothing) dentro de una transacción.
 */
export function ingresarCurso(deps: { repo: CursoRepo }) {
  return async (token: string, datos: IngresarCursoInput): Promise<IngresoCursoResultado> => {
    return deps.repo.ingresarInscripcion(token, datos)
  }
}
