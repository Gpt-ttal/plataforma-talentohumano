import type { CapacitacionDetalle, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CapacitacionRepo } from "../../domain/ports/CapacitacionRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_LECTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function obtenerDetalleCapacitacion(deps: { repo: CapacitacionRepo }) {
  return async (actor: Usuario, id: string): Promise<CapacitacionDetalle> => {
    exigirRol(actor, [...ROLES_LECTORES], "Acceso denegado.")

    const detalle = await deps.repo.obtenerDetalle(id)
    if (!detalle) throw new ErrorNoEncontrado("La capacitación no existe.")

    // TH y SST solo ven su propio ámbito.
    if (!puedeGestionarAmbito(actor.rol, detalle.capacitacion.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para ver esta capacitación.")
    }

    return detalle
  }
}
