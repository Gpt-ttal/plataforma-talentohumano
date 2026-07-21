import type { CapacitacionPlaneada, CrearCapacitacionPlaneadaInput, Usuario } from "@pys/shared"
import { ambitoPorDefecto, puedeGestionarAmbito } from "@pys/shared"
import type { PlanificadorRepo } from "../../domain/ports/PlanificadorRepo.js"
import { ErrorAutorizacion, ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function crearCapacitacionPlaneada(deps: { repo: PlanificadorRepo }) {
  return async (
    actor: Usuario,
    input: CrearCapacitacionPlaneadaInput,
  ): Promise<CapacitacionPlaneada> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden planear capacitaciones.")

    const ambito = input.ambito ?? ambitoPorDefecto(actor.rol)
    if (!ambito) {
      throw new ErrorValidacion("El superadministrador debe especificar el ámbito (TH o SST).")
    }
    if (!puedeGestionarAmbito(actor.rol, ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para planear capacitaciones de este ámbito.")
    }

    return deps.repo.crear({
      titulo: input.titulo,
      areaObjetivo: input.areaObjetivo ?? null,
      ambito,
      anio: input.anio,
      mes: input.mes,
      notas: input.notas ?? null,
      creadaPor: actor.nombre,
    })
  }
}
