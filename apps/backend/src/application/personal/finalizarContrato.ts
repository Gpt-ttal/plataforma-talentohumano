import type { ResultadoMutacion, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/**
 * Puente a Paz y Salvo: fija la fecha de retiro y dispara el trámite. El repo
 * hace el backfill de aprobaciones y el recálculo de estado en una transacción
 * con guarda TOCTOU (400 si el empleado ya estaba en trámite).
 */
export function finalizarContrato(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    fechaRetiro: string,
  ): Promise<ResultadoMutacion> => {
    exigirRol(actor, GESTORES, "No tiene permiso para finalizar contratos.")
    return deps.repo.finalizarContrato(id, fechaRetiro, actor.nombre ?? actor.email)
  }
}
