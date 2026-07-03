import type { DatosPersonales, GuardarPersonalesInput, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Upsert del bloque personal (1-1): expedición, nacimiento, contacto. */
export function guardarPersonales(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    datos: GuardarPersonalesInput,
  ): Promise<DatosPersonales> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    return deps.repo.guardarPersonales(id, datos)
  }
}
