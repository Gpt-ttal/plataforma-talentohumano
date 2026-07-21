import type { Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { PlanificadorRepo } from "../../domain/ports/PlanificadorRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function eliminarCapacitacionPlaneada(deps: { repo: PlanificadorRepo }) {
  return async (actor: Usuario, id: string): Promise<void> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden eliminar del planificador.")

    const detalle = await deps.repo.obtenerDetalle(id)
    if (!detalle) throw new ErrorNoEncontrado("La capacitación planeada no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para eliminar esta capacitación planeada.")
    }

    await deps.repo.eliminar(id)
  }
}
