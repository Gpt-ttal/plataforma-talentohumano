import type { ResultadoMutacion, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../errors.js"

/**
 * Control Interno (o el SUPERADMIN) cierra el trámite: registra la liquidación
 * final → paz y salvo.
 *
 * Guardas:
 *  - Rol ∈ {CONTROL_INTERNO, SUPERADMIN} → si no, 403.
 *  - Transición: solo válido cuando Talento Humano ya generó la liquidación
 *    (estado LIQUIDACION_GENERADA). El repo NO valida esto; la guarda vive aquí.
 */
export function registrarLiquidacion(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    funcionarioId: string,
  ): Promise<ResultadoMutacion> => {
    if (usuario.rol !== "CONTROL_INTERNO" && usuario.rol !== "SUPERADMIN") {
      throw new ErrorAutorizacion(
        "Solo Control Interno puede registrar el paz y salvo.",
      )
    }

    const detalle = await deps.repo.obtenerDetalle(funcionarioId)
    if (!detalle) throw new ErrorNoEncontrado("Funcionario no encontrado.")

    if (detalle.funcionario.estadoGlobal !== "LIQUIDACION_GENERADA") {
      throw new ErrorValidacion(
        "Solo se puede registrar la liquidación cuando Talento Humano ya la generó " +
          "(estado LIQUIDACIÓN GENERADA).",
      )
    }

    return deps.repo.registrarLiquidacion(funcionarioId, usuario.nombre)
  }
}
