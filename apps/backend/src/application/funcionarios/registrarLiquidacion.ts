import type { ResultadoMutacion, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../errors.js"

/**
 * Talento Humano (o el SUPERADMIN) cierra oficialmente el trámite: registra
 * la liquidación final → paz y salvo.
 *
 * Gestión de Desvinculaciones: guard invertido — Talento Humano cierra
 * oficialmente (último hito), después de que Control Interno ya validó
 * (`generarLiquidacion`, penúltimo hito). Ver nota de `generarLiquidacion.ts`.
 *
 * Guardas:
 *  - Rol ∈ {TALENTO_HUMANO, SUPERADMIN} → si no, 403.
 *  - Transición: solo válido cuando Control Interno ya validó
 *    (estado LIQUIDACION_GENERADA). El repo NO valida esto; la guarda vive aquí.
 */
export function registrarLiquidacion(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    funcionarioId: string,
  ): Promise<ResultadoMutacion> => {
    if (usuario.rol !== "TALENTO_HUMANO" && usuario.rol !== "SUPERADMIN") {
      throw new ErrorAutorizacion(
        "Solo Talento Humano puede registrar el paz y salvo.",
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
