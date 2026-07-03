import type { Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Baja de un registro de formación registrado por error. */
export function eliminarFormacion(deps: { repo: FuncionarioRepo }) {
  return async (actor: Usuario, id: string, formacionId: string): Promise<void> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    return deps.repo.eliminarFormacion(id, formacionId)
  }
}
