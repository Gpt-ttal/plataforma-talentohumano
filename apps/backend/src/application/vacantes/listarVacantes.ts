import type { FiltroVacantes, Usuario, VacanteDerivada } from "@pys/shared"
import { derivarVacante } from "@pys/shared"
import type { ResultadoPaginado } from "@pys/shared"
import type { VacanteRepo } from "../../domain/ports/VacanteRepo.js"
import { exigirRol } from "../guards.js"

export const ROLES_VACANTES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

export function listarVacantes(deps: { repo: VacanteRepo }) {
  return async (actor: Usuario, filtro: FiltroVacantes): Promise<ResultadoPaginado<VacanteDerivada>> => {
    exigirRol(actor, [...ROLES_VACANTES], "Solo Talento Humano puede listar vacantes.")

    const hoy = new Date().toISOString().slice(0, 10)
    const pagina = await deps.repo.listarVacantes(filtro)
    return { ...pagina, items: pagina.items.map((v) => derivarVacante(v, hoy)) }
  }
}
