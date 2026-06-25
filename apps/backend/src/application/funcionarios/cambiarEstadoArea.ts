import type {
  CambiarEstadoAreaInput,
  ResultadoMutacion,
  Usuario,
} from "@pys/shared"
import { areaPermitida } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../errors.js"

/**
 * Da (o no) el visto bueno de un área a un funcionario.
 *
 * Guardas:
 *  - Autorización: solo quien gestiona ESA área (un usuario AREA su propia área,
 *    el SUPERADMIN cualquiera). El resto de roles no gestionan áreas → 403.
 *  - Validación: una observación es obligatoria al RECHAZAR (NO_APROBADO) o al
 *    DEVOLVER a PENDIENTE, porque son transiciones que exigen justificación.
 *  - Transición: el funcionario debe existir (si no, 404) y NO estar en el estado
 *    terminal PAZ_Y_SALVO — un trámite cerrado no admite mover áreas (igual que
 *    los hitos de liquidación validan su transición antes de escribir).
 *
 * El autor que queda registrado es el nombre del usuario autenticado.
 */
export function cambiarEstadoArea(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    input: CambiarEstadoAreaInput,
  ): Promise<ResultadoMutacion> => {
    if (!areaPermitida(usuario, input.areaId)) {
      throw new ErrorAutorizacion(
        "No puede modificar el visto bueno de esta área.",
      )
    }

    const exigeNota =
      input.estado === "NO_APROBADO" || input.estado === "PENDIENTE"
    if (exigeNota && !input.observacion?.trim()) {
      throw new ErrorValidacion(
        input.estado === "NO_APROBADO"
          ? "Debe indicar el motivo del rechazo."
          : "Debe indicar el motivo al devolver el área a pendiente.",
      )
    }

    const detalle = await deps.repo.obtenerDetalle(input.funcionarioId)
    if (!detalle) throw new ErrorNoEncontrado("Funcionario no encontrado.")
    if (detalle.funcionario.estadoGlobal === "PAZ_Y_SALVO") {
      throw new ErrorValidacion(
        "El trámite ya está cerrado (paz y salvo); no se pueden modificar las áreas.",
      )
    }

    return deps.repo.cambiarEstadoArea({
      funcionarioId: input.funcionarioId,
      areaId: input.areaId,
      estado: input.estado,
      observacion: input.observacion,
      autor: usuario.nombre,
    })
  }
}
