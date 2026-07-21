import type { Curso, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado, ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function abrirRegistroCurso(deps: { repo: CursoRepo }) {
  return async (actor: Usuario, id: string): Promise<Curso> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden abrir el registro.")

    const detalle = await deps.repo.obtenerDetalle(id)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para gestionar este curso.")
    }

    if (detalle.curso.estadoRegistro !== "BORRADOR") {
      throw new ErrorValidacion("Solo se puede abrir el registro desde BORRADOR.")
    }

    return deps.repo.cambiarEstadoRegistro(id, "ABIERTO", "BORRADOR")
  }
}
