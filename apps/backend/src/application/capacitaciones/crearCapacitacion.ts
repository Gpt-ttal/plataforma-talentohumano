import type { Capacitacion, CrearCapacitacionInput, Usuario } from "@pys/shared"
import { ambitoPorDefecto, puedeGestionarAmbito } from "@pys/shared"
import type { CapacitacionRepo } from "../../domain/ports/CapacitacionRepo.js"
import { ErrorAutorizacion, ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function crearCapacitacion(deps: { repo: CapacitacionRepo }) {
  return async (actor: Usuario, input: CrearCapacitacionInput): Promise<Capacitacion> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores de capacitaciones pueden crear eventos.")

    // El SA debe especificar el ámbito en el body (no tiene defecto).
    const ambito = input.ambito ?? ambitoPorDefecto(actor.rol)
    if (!ambito) {
      throw new ErrorValidacion("El superadministrador debe especificar el ámbito (TH o SST).")
    }
    if (!puedeGestionarAmbito(actor.rol, ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para crear capacitaciones de este ámbito.")
    }

    return deps.repo.crearCapacitacion({
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      ambito,
      lugar: input.lugar ?? null,
      instructor: input.instructor ?? null,
      iniciaEn: input.iniciaEn,
      terminaEn: input.terminaEn,
      horas: input.horas ?? null,
      creadaPor: actor.nombre,
    })
  }
}
