import type { ResultadoMutacion, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../errors.js"

/**
 * Control Interno (o el SUPERADMIN) valida el caso: marca el hito penúltimo.
 *
 * Gestión de Desvinculaciones: guard invertido respecto al proceso original —
 * ahora Control Interno valida (penúltimo hito) y Talento Humano cierra
 * oficialmente (`registrarLiquidacion`, último hito). El nombre técnico del
 * caso de uso/hito no cambia (evita migrar el enum de BD); el renombre de
 * presentación ("Validado por Control Interno") vive en `shared/src/ui.ts`.
 *
 * Guardas:
 *  - Rol ∈ {CONTROL_INTERNO, SUPERADMIN} → si no, 403.
 *  - Transición: solo válido cuando el funcionario está LISTO_PARA_LIQUIDAR
 *    (todas las áreas al día). El repo NO valida esto; la guarda vive aquí.
 */
export function generarLiquidacion(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    funcionarioId: string,
  ): Promise<ResultadoMutacion> => {
    if (usuario.rol !== "CONTROL_INTERNO" && usuario.rol !== "SUPERADMIN") {
      throw new ErrorAutorizacion(
        "Solo Control Interno puede validar el caso.",
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

    return deps.repo.generarLiquidacion(funcionarioId, usuario.nombre)
  }
}
