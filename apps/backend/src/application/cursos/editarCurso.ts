import type { Curso, EditarCursoInput, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function editarCurso(deps: { repo: CursoRepo }) {
  return async (actor: Usuario, id: string, input: EditarCursoInput): Promise<Curso> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden editar cursos.")

    const detalle = await deps.repo.obtenerDetalle(id)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    // Ámbito ACTUAL: ni TH ni SST pueden tocar un curso fuera de su ámbito.
    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para editar este curso.")
    }

    // Ámbito NUEVO (si se reasigna): tampoco pueden mover un curso HACIA un
    // ámbito ajeno. El SA puede lo que sea en ambos chequeos. A diferencia de
    // `editarCapacitacion`, no se restringe a `estadoRegistro === "BORRADOR"`:
    // el contenido del curso puede seguir editándose con el registro abierto.
    if (input.ambito !== undefined && input.ambito !== detalle.curso.ambito) {
      if (!puedeGestionarAmbito(actor.rol, input.ambito)) {
        throw new ErrorAutorizacion("No tiene permiso para reasignar el curso a ese ámbito.")
      }
    }

    return deps.repo.editarCurso(id, input)
  }
}
