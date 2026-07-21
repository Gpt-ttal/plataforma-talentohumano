import type { CursoModulo, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function moverModuloCurso(deps: { repo: CursoRepo }) {
  return async (
    actor: Usuario,
    cursoId: string,
    moduloId: string,
    direccion: "subir" | "bajar",
  ): Promise<CursoModulo[]> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden reordenar módulos.")

    const detalle = await deps.repo.obtenerDetalle(cursoId)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para gestionar este curso.")
    }

    // El módulo debe pertenecer a ESTE curso (guarda IDOR cross-ámbito).
    if (!detalle.modulos.some((m) => m.id === moduloId)) {
      throw new ErrorNoEncontrado("El módulo no existe.")
    }

    return deps.repo.moverModulo(cursoId, moduloId, direccion)
  }
}
