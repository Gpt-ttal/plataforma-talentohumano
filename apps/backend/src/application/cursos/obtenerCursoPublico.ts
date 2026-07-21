import type { CursoPublico } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"

/**
 * Caso de uso PÚBLICO: obtiene la proyección pública de un curso por su token.
 * Sin actor (anónimo). Devuelve null si el token no existe (el controller emite 404).
 */
export function obtenerCursoPublico(deps: { repo: CursoRepo }) {
  return async (token: string): Promise<CursoPublico | null> => {
    return deps.repo.obtenerPorToken(token)
  }
}
