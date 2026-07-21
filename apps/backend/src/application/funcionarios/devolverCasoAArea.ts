import type {
  DevolverCasoAAreaInput,
  ResultadoMutacion,
  Usuario,
} from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../errors.js"

/**
 * Control Interno devuelve el caso a un área puntual para que lo revise de
 * nuevo (p. ej. encontró una inconsistencia después de que el área ya había
 * dado su visto bueno). Distinto de `cambiarEstadoArea`: aquí el actor es
 * SIEMPRE Control Interno/SUPERADMIN (no el área dueña), y la observación es
 * SIEMPRE obligatoria — no existe una devolución sin motivo.
 *
 * Guardas:
 *  - Rol ∈ {CONTROL_INTERNO, SUPERADMIN} → si no, 403.
 *  - Observación obligatoria → si no, 400.
 *  - Transición: el funcionario debe existir (404) y no estar cerrado
 *    (PAZ_Y_SALVO) — mismo criterio que `cambiarEstadoArea`.
 */
export function devolverCasoAArea(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    funcionarioId: string,
    input: DevolverCasoAAreaInput,
  ): Promise<ResultadoMutacion> => {
    exigirRol(
      usuario,
      ["SUPERADMIN", "CONTROL_INTERNO"],
      "Solo Control Interno puede devolver un caso a un área.",
    )

    if (!input.observacion?.trim()) {
      throw new ErrorValidacion("Debe indicar el motivo de la devolución.")
    }

    const detalle = await deps.repo.obtenerDetalle(funcionarioId)
    if (!detalle) throw new ErrorNoEncontrado("Funcionario no encontrado.")
    if (detalle.funcionario.estadoGlobal === "PAZ_Y_SALVO") {
      throw new ErrorValidacion(
        "El trámite ya está cerrado (paz y salvo); no se pueden modificar las áreas.",
      )
    }

    return deps.repo.devolverCasoAArea({
      funcionarioId,
      areaId: input.areaId,
      observacion: input.observacion,
      autor: usuario.nombre,
    })
  }
}
