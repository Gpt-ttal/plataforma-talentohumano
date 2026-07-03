import type { CrearFamiliarInput, Familiar, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Alta de un familiar a cargo del empleado (1-N). */
export function crearFamiliar(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    datos: CrearFamiliarInput,
  ): Promise<Familiar> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    return deps.repo.crearFamiliar(id, datos)
  }
}
