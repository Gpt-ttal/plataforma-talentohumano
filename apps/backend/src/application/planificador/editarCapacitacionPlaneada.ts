import type { CapacitacionPlaneada, EditarCapacitacionPlaneadaInput, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { PlanificadorRepo } from "../../domain/ports/PlanificadorRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function editarCapacitacionPlaneada(deps: { repo: PlanificadorRepo }) {
  return async (
    actor: Usuario,
    id: string,
    input: EditarCapacitacionPlaneadaInput,
  ): Promise<CapacitacionPlaneada> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden editar el planificador.")

    const detalle = await deps.repo.obtenerDetalle(id)
    if (!detalle) throw new ErrorNoEncontrado("La capacitación planeada no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para editar esta capacitación planeada.")
    }

    return deps.repo.editar(id, input)
  }
}
