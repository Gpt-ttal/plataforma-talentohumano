import type { Usuario } from "@pys/shared"
import { construirCsvAsistencias, puedeGestionarAmbito } from "@pys/shared"
import type { CapacitacionRepo } from "../../domain/ports/CapacitacionRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function exportarAsistencias(deps: { repo: CapacitacionRepo }) {
  return async (actor: Usuario, id: string): Promise<string> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden exportar asistencias.")

    const detalle = await deps.repo.obtenerDetalle(id)
    if (!detalle) throw new ErrorNoEncontrado("La capacitación no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.capacitacion.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para exportar esta capacitación.")
    }

    const asistencias = await deps.repo.listarAsistencias(id)
    return construirCsvAsistencias(asistencias)
  }
}
