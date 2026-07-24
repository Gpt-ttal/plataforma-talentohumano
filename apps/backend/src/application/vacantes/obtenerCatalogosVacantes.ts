import type { Usuario } from "@pys/shared"
import type { CatalogosVacantes, VacanteRepo } from "../../domain/ports/VacanteRepo.js"
import { exigirRol } from "../guards.js"
import { ROLES_VACANTES } from "./listarVacantes.js"

/**
 * `areas` aquí es el catálogo dedicado de Vacantes (`vacante_areas`, migración
 * 0021) — no el catálogo de dependencias que dan visto bueno en paz y salvo
 * (`AreaRepo`/`areas`), un dominio distinto y sin traslape.
 */
export function obtenerCatalogosVacantes(deps: { repo: VacanteRepo }) {
  return async (actor: Usuario): Promise<CatalogosVacantes> => {
    exigirRol(actor, [...ROLES_VACANTES], "Solo Talento Humano puede ver los catálogos de vacantes.")
    return deps.repo.obtenerCatalogos()
  }
}
