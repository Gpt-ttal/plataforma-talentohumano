import type { Leccion, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function moverLeccionCurso(deps: { repo: CursoRepo }) {
  return async (
    actor: Usuario,
    cursoId: string,
    moduloId: string,
    leccionId: string,
    direccion: "subir" | "bajar",
  ): Promise<Leccion[]> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden reordenar lecciones.")

    const detalle = await deps.repo.obtenerDetalle(cursoId)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para gestionar este curso.")
    }

    // La lección debe pertenecer a un módulo de ESTE curso (guarda IDOR cross-ámbito).
    const modulo = detalle.modulos.find((m) => m.id === moduloId)
    if (!modulo || !modulo.lecciones.some((l) => l.id === leccionId)) {
      throw new ErrorNoEncontrado("La lección no existe.")
    }

    return deps.repo.moverLeccion(moduloId, leccionId, direccion)
  }
}
