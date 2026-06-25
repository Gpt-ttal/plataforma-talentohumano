import type { FuncionarioDetalle, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const SUPERVISORES = ["SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO"] as const

/**
 * Detalle de un funcionario (aprobaciones + observaciones). Guarda de rol: solo
 * los roles de supervisión. 404 si el funcionario no existe.
 */
export function obtenerDetalle(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    funcionarioId: string,
  ): Promise<FuncionarioDetalle> => {
    exigirRol(usuario, SUPERVISORES, "No tiene permiso para ver el detalle.")
    const detalle = await deps.repo.obtenerDetalle(funcionarioId)
    if (!detalle) throw new ErrorNoEncontrado("Funcionario no encontrado.")
    return detalle
  }
}
