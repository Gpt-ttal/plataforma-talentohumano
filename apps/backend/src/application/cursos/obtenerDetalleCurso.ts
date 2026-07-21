import type { CursoDetalle, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_LECTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function obtenerDetalleCurso(deps: { repo: CursoRepo }) {
  return async (actor: Usuario, id: string): Promise<CursoDetalle> => {
    exigirRol(actor, [...ROLES_LECTORES], "Acceso denegado.")

    const detalle = await deps.repo.obtenerDetalle(id)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    // TH y SST solo ven su propio ámbito.
    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para ver este curso.")
    }

    return detalle
  }
}
