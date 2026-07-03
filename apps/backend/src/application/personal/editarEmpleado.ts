import type { EditarEmpleadoInput, Empleado, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Edición del núcleo del expediente (no toca `fechaRetiro` ni el trámite). */
export function editarEmpleado(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    input: EditarEmpleadoInput,
  ): Promise<Empleado> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar empleados.")
    return deps.repo.editarEmpleado(id, input)
  }
}
