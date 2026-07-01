import type { RegistrarAsistenciaInput, ResultadoRegistro } from "@pys/shared"
import type { CapacitacionRepo } from "../../domain/ports/CapacitacionRepo.js"

/**
 * Caso de uso PÚBLICO: no requiere actor (anónimo). El token valida que la
 * capacitación existe y que el registro está ABIERTO; el repo hace el insert
 * idempotente (UNIQUE capacitacion_id+documento → onConflictDoNothing).
 */
export function registrarAsistenciaPublica(deps: { repo: CapacitacionRepo }) {
  return async (
    token: string,
    datos: RegistrarAsistenciaInput,
    usuarioId?: string,
  ): Promise<ResultadoRegistro> => {
    // La validación de negocio (token válido, registro ABIERTO) vive en el repo
    // dentro de la transacción para atomicidad. Si el registro está cerrado → 400.
    return deps.repo.registrarAsistencia(token, datos, usuarioId)
  }
}
