import type { Curso, CrearCursoInput, Usuario } from "@pys/shared"
import { ambitoPorDefecto, puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function crearCurso(deps: { repo: CursoRepo }) {
  return async (actor: Usuario, input: CrearCursoInput): Promise<Curso> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores de cursos pueden crear cursos.")

    // El SA debe especificar el ámbito en el body (no tiene defecto).
    const ambito = input.ambito ?? ambitoPorDefecto(actor.rol)
    if (!ambito) {
      throw new ErrorValidacion("El superadministrador debe especificar el ámbito (TH o SST).")
    }
    if (!puedeGestionarAmbito(actor.rol, ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para crear cursos de este ámbito.")
    }

    return deps.repo.crearCurso({
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      ambito,
      creadaPor: actor.nombre,
    })
  }
}
