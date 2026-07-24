import type { Usuario, VacanteDerivada } from "@pys/shared"
import { derivarVacante } from "@pys/shared"
import type { VacanteRepo } from "../../domain/ports/VacanteRepo.js"
import { ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"
import { ROLES_VACANTES } from "./listarVacantes.js"

export function obtenerVacante(deps: { repo: VacanteRepo }) {
  return async (actor: Usuario, id: string): Promise<VacanteDerivada> => {
    exigirRol(actor, [...ROLES_VACANTES], "Solo Talento Humano puede consultar vacantes.")

    const vacante = await deps.repo.obtenerVacante(id)
    if (!vacante) throw new ErrorNoEncontrado("La vacante no existe.")

    const hoy = new Date().toISOString().slice(0, 10)
    return derivarVacante(vacante, hoy)
  }
}
