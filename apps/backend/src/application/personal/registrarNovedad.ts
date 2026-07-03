import type { EmpleadoDetalle, RegistrarNovedadInput, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** "Otro sí" ligero: registra la novedad y aplica el cambio al empleado. */
export function registrarNovedad(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    novedad: RegistrarNovedadInput,
  ): Promise<EmpleadoDetalle> => {
    exigirRol(actor, GESTORES, "No tiene permiso para registrar novedades.")
    return deps.repo.registrarNovedad(id, novedad, actor.nombre ?? actor.email)
  }
}
