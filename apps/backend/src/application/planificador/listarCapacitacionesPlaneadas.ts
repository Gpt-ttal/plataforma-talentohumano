import type { CapacitacionPlaneada, FiltroCapacitacionesPlaneadas, Usuario } from "@pys/shared"
import { ambitosVisibles } from "@pys/shared"
import type { ResultadoPaginado } from "@pys/shared"
import type { PlanificadorRepo } from "../../domain/ports/PlanificadorRepo.js"
import { exigirRol } from "../guards.js"

const ROLES_LECTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function listarCapacitacionesPlaneadas(deps: { repo: PlanificadorRepo }) {
  return async (
    actor: Usuario,
    filtro: FiltroCapacitacionesPlaneadas,
  ): Promise<ResultadoPaginado<CapacitacionPlaneada>> => {
    exigirRol(actor, [...ROLES_LECTORES], "Solo gestores pueden ver el planificador.")

    const visibles = ambitosVisibles(actor.rol)
    const ambito = visibles.length === 1 ? visibles[0] : filtro.ambito

    return deps.repo.listar({ ...filtro, ambito })
  }
}
