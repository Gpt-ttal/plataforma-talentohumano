import type { DashboardVacantes, Usuario } from "@pys/shared"
import { calcularDashboardVacantes, derivarVacante } from "@pys/shared"
import type { VacanteRepo } from "../../domain/ports/VacanteRepo.js"
import { exigirRol } from "../guards.js"
import { ROLES_VACANTES } from "./listarVacantes.js"

export function obtenerDashboardVacantes(deps: { repo: VacanteRepo }) {
  return async (actor: Usuario): Promise<DashboardVacantes> => {
    exigirRol(actor, [...ROLES_VACANTES], "Solo Talento Humano puede ver el dashboard de vacantes.")

    const hoy = new Date().toISOString().slice(0, 10)
    const filas = await deps.repo.listarParaDashboard()
    const vacantes = filas.map((f) => ({ ...derivarVacante(f, hoy), areaNombre: f.areaNombre }))
    return calcularDashboardVacantes(vacantes, hoy)
  }
}
