import type { FuncionarioDetalle, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"
import { ROLES_ARCHIVO } from "./listarArchivo.js"

/**
 * Expediente de un funcionario archivado: su detalle completo (áreas +
 * observaciones), que es la traza de auditoría disponible. Guarda de rol: solo la
 * plataforma (SA + TH). 404 si el funcionario no existe.
 *
 * Reusa `obtenerDetalle` del repo; no introduce una lectura nueva. La diferencia
 * con el caso de uso `obtenerDetalle` de supervisión es la guarda: el archivo no
 * lo ve Control Interno.
 */
export function obtenerExpediente(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    funcionarioId: string,
  ): Promise<FuncionarioDetalle> => {
    exigirRol(usuario, ROLES_ARCHIVO, "No tiene permiso para ver el expediente.")
    const detalle = await deps.repo.obtenerDetalle(funcionarioId)
    if (!detalle) throw new ErrorNoEncontrado("Funcionario no encontrado.")
    return detalle
  }
}
