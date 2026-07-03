import type { CrearFormacionInput, Formacion, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Alta de un registro de formación académica (1-N). */
export function crearFormacion(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    datos: CrearFormacionInput,
  ): Promise<Formacion> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    return deps.repo.crearFormacion(id, datos)
  }
}
