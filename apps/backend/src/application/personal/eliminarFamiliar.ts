import type { Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Baja de un familiar registrado por error (ownership la valida el repo). */
export function eliminarFamiliar(deps: { repo: FuncionarioRepo }) {
  return async (actor: Usuario, id: string, familiarId: string): Promise<void> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    return deps.repo.eliminarFamiliar(id, familiarId)
  }
}
