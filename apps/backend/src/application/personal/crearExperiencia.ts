import type { CrearExperienciaInput, Experiencia, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Alta de un registro de experiencia laboral previa (1-N). */
export function crearExperiencia(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    datos: CrearExperienciaInput,
  ): Promise<Experiencia> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    return deps.repo.crearExperiencia(id, datos)
  }
}
