import type {
  CrearPreaprobadoInput,
  EstadoUsuario,
  Preaprobacion,
  Usuario,
} from "@pys/shared"
import { errorInvarianteUsuario, esEmailValido } from "@pys/shared"
import type { PreaprobacionRepo } from "../../domain/ports/PreaprobacionRepo.js"
import { ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

/**
 * El SUPERADMIN pre-aprueba un correo con el rol/área/estado con que ingresará. En
 * su primer login se materializa como `Usuario` (ver `asegurarUsuario`).
 *
 * Guardas:
 *  - Rol del actor = SUPERADMIN → si no, 403.
 *  - Invariante rol↔área: un AREA lleva área; el resto de roles no (se fuerza a
 *    null). Si se viola → 400.
 *
 * El upsert del repo permite re-pre-aprobar un correo (actualiza rol/área/estado).
 */
export function crearPreaprobado(deps: { repo: PreaprobacionRepo }) {
  return async (
    actor: Usuario,
    input: CrearPreaprobadoInput,
  ): Promise<Preaprobacion> => {
    exigirRol(
      actor,
      ["SUPERADMIN"],
      "Solo el superadministrador pre-aprueba correos.",
    )

    if (!esEmailValido(input.email)) {
      throw new ErrorValidacion("El correo no tiene un formato válido.")
    }

    const rol = input.rol
    const areaId = rol === "AREA" ? (input.areaId ?? null) : null
    const estado: EstadoUsuario = input.estado ?? "ACTIVO"

    const violacion = errorInvarianteUsuario({ rol, estado, areaId })
    if (violacion) throw new ErrorValidacion(violacion)

    return deps.repo.crear({
      email: input.email,
      rol,
      areaId,
      estado,
      invitadoPor: actor.id,
    })
  }
}
