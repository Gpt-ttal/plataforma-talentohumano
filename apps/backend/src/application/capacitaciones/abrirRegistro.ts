import type { Capacitacion, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CapacitacionRepo } from "../../domain/ports/CapacitacionRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado, ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function abrirRegistro(deps: { repo: CapacitacionRepo }) {
  return async (actor: Usuario, id: string): Promise<Capacitacion> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden abrir el registro.")

    const detalle = await deps.repo.obtenerDetalle(id)
    if (!detalle) throw new ErrorNoEncontrado("La capacitación no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.capacitacion.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para gestionar esta capacitación.")
    }

    if (detalle.capacitacion.estadoRegistro !== "BORRADOR") {
      throw new ErrorValidacion("Solo se puede abrir el registro desde BORRADOR.")
    }

    return deps.repo.cambiarEstadoRegistro(id, "ABIERTO")
  }
}
