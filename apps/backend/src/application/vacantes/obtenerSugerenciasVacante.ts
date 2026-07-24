import type { SugerenciasVacante, Usuario } from "@pys/shared"
import type { VacanteRepo } from "../../domain/ports/VacanteRepo.js"
import { exigirRol } from "../guards.js"
import { ROLES_VACANTES } from "./listarVacantes.js"

export function obtenerSugerenciasVacante(deps: { repo: VacanteRepo }) {
  return async (actor: Usuario, input: { areaId?: string; cargo?: string }): Promise<SugerenciasVacante> => {
    exigirRol(actor, [...ROLES_VACANTES], "Solo Talento Humano puede usar el autocompletar de vacantes.")
    return deps.repo.obtenerSugerencias(input)
  }
}
