import type { Capacitacion, FiltroCapacitaciones, Usuario } from "@pys/shared"
import { ambitosVisibles } from "@pys/shared"
import type { ResultadoPaginado } from "@pys/shared"
import type { CapacitacionRepo } from "../../domain/ports/CapacitacionRepo.js"
import { exigirRol } from "../guards.js"

const ROLES_LECTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function listarCapacitaciones(deps: { repo: CapacitacionRepo }) {
  return async (
    actor: Usuario,
    filtro: FiltroCapacitaciones,
  ): Promise<ResultadoPaginado<Capacitacion>> => {
    exigirRol(actor, [...ROLES_LECTORES], "Solo gestores de capacitaciones pueden listar eventos.")

    // Si el rol no es SA, filtrar por su ámbito propio (ignora el ámbito del query).
    const visibles = ambitosVisibles(actor.rol)
    const ambito =
      visibles.length === 1
        ? visibles[0] // TH → TH; SST → SST (fijado)
        : filtro.ambito // SA puede filtrar libremente

    return deps.repo.listarCapacitaciones({ ...filtro, ambito })
  }
}
