import type { InscritoConProgreso, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function listarInscritosCurso(deps: { repo: CursoRepo }) {
  return async (actor: Usuario, cursoId: string): Promise<InscritoConProgreso[]> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden ver los inscritos.")

    const detalle = await deps.repo.obtenerDetalle(cursoId)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para ver este curso.")
    }

    return deps.repo.listarInscritos(cursoId)
  }
}
