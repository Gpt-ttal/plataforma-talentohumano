import type { CapacitacionPublica } from "@pys/shared"
import type { CapacitacionRepo } from "../../domain/ports/CapacitacionRepo.js"

/**
 * Caso de uso PÚBLICO: obtiene la proyección pública de un evento por su token.
 * Sin actor (anónimo). Devuelve null si el token no existe (el controller emite 404).
 */
export function obtenerCapacitacionPublica(deps: { repo: CapacitacionRepo }) {
  return async (token: string): Promise<CapacitacionPublica | null> => {
    return deps.repo.obtenerPorToken(token)
  }
}
