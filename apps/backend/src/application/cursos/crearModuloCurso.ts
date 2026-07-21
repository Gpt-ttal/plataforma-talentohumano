import type { CursoModulo, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function crearModuloCurso(deps: { repo: CursoRepo }) {
  return async (actor: Usuario, cursoId: string, titulo: string): Promise<CursoModulo> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden crear módulos.")

    // Carga+autorización vía el curso dueño (no hay atajo: el módulo no trae su
    // propio ámbito).
    const detalle = await deps.repo.obtenerDetalle(cursoId)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para gestionar este curso.")
    }

    return deps.repo.crearModulo(cursoId, titulo)
  }
}
