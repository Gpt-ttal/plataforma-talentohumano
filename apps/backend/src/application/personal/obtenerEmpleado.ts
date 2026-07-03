import type { EmpleadoDetalle, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Ficha del empleado: el maestro + su historial de novedades. 404 si no existe. */
export function obtenerEmpleado(deps: { repo: FuncionarioRepo }) {
  return async (actor: Usuario, id: string): Promise<EmpleadoDetalle> => {
    exigirRol(actor, GESTORES, "No tiene permiso para ver la ficha del empleado.")
    const detalle = await deps.repo.obtenerEmpleado(id)
    if (!detalle) throw new ErrorNoEncontrado("Empleado no encontrado.")
    return detalle
  }
}
