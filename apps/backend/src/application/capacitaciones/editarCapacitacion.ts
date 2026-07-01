import type { Capacitacion, EditarCapacitacionInput, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CapacitacionRepo } from "../../domain/ports/CapacitacionRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado, ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function editarCapacitacion(deps: { repo: CapacitacionRepo }) {
  return async (actor: Usuario, id: string, input: EditarCapacitacionInput): Promise<Capacitacion> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden editar capacitaciones.")

    const detalle = await deps.repo.obtenerDetalle(id)
    if (!detalle) throw new ErrorNoEncontrado("La capacitación no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.capacitacion.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para editar esta capacitación.")
    }

    // Solo se puede editar mientras está en BORRADOR.
    if (detalle.capacitacion.estadoRegistro !== "BORRADOR") {
      throw new ErrorValidacion(
        "No se puede editar una capacitación con el registro abierto o cerrado.",
      )
    }

    // Rango fusionado: editar UN solo extremo no puede invertir el rango contra
    // el valor persistido. El schema solo valida cuando ambas fechas vienen juntas.
    const iniciaEn = input.iniciaEn ?? detalle.capacitacion.iniciaEn
    const terminaEn = input.terminaEn ?? detalle.capacitacion.terminaEn
    if (new Date(iniciaEn) >= new Date(terminaEn)) {
      throw new ErrorValidacion(
        "La hora de fin debe ser posterior a la de inicio.",
      )
    }

    return deps.repo.editarCapacitacion(id, input)
  }
}
