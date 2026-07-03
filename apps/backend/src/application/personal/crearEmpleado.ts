import type { CrearEmpleadoInput, Empleado, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Alta manual de un empleado ACTIVO (sin trámite, sin aprobaciones). */
export function crearEmpleado(deps: { repo: FuncionarioRepo }) {
  return async (actor: Usuario, input: CrearEmpleadoInput): Promise<Empleado> => {
    exigirRol(actor, GESTORES, "No tiene permiso para registrar empleados.")
    return deps.repo.crearEmpleado(input)
  }
}
