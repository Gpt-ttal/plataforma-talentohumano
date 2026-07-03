import type { Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Baja de un registro de experiencia registrado por error. */
export function eliminarExperiencia(deps: { repo: FuncionarioRepo }) {
  return async (actor: Usuario, id: string, experienciaId: string): Promise<void> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    return deps.repo.eliminarExperiencia(id, experienciaId)
  }
}
