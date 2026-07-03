import type { EditarContractualInput, EmpleadoContractual, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Patch del bloque contractual extendido (tipo de contrato, modalidad, área FK, etc.). */
export function editarContractual(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    datos: EditarContractualInput,
  ): Promise<EmpleadoContractual> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    return deps.repo.editarContractual(id, datos)
  }
}
