import type { Funcionario, ResultadoMutacion, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../errors.js"

/**
 * Talento Humano (o el SUPERADMIN) genera la liquidación: marca el hito de TH y
 * avisa a Control Interno.
 *
 * Guardas:
 *  - Rol ∈ {TALENTO_HUMANO, SUPERADMIN} → si no, 403.
 *  - Transición: solo válido cuando el funcionario está LISTO_PARA_LIQUIDAR
 *    (todas las áreas al día). El repo NO valida esto; la guarda vive aquí.
 *
 * La notificación a Control Interno es best-effort: si falla, el cambio de estado
 * queda igual registrado (es la fuente de verdad).
 */
export function generarLiquidacion(deps: {
  repo: FuncionarioRepo
  notificar?: (funcionario: Funcionario) => Promise<void>
}) {
  return async (
    usuario: Usuario,
    funcionarioId: string,
  ): Promise<ResultadoMutacion> => {
    if (usuario.rol !== "TALENTO_HUMANO" && usuario.rol !== "SUPERADMIN") {
      throw new ErrorAutorizacion(
        "Solo Talento Humano puede generar la liquidación.",
      )
    }

    const detalle = await deps.repo.obtenerDetalle(funcionarioId)
    if (!detalle) throw new ErrorNoEncontrado("Funcionario no encontrado.")

    if (detalle.funcionario.estadoGlobal !== "LISTO_PARA_LIQUIDAR") {
      throw new ErrorValidacion(
        "Solo se puede generar la liquidación cuando todas las áreas están al día " +
          "(estado LISTO PARA LIQUIDAR).",
      )
    }

    const resultado = await deps.repo.generarLiquidacion(
      funcionarioId,
      usuario.nombre,
    )

    if (deps.notificar) {
      try {
        await deps.notificar(detalle.funcionario)
      } catch (e) {
        console.error("[generarLiquidacion] fallo al notificar a Control Interno:", e)
      }
    }

    return resultado
  }
}
