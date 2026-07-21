import type { CursoModulo, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function editarModuloCurso(deps: { repo: CursoRepo }) {
  return async (
    actor: Usuario,
    cursoId: string,
    moduloId: string,
    titulo: string,
  ): Promise<CursoModulo> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden editar módulos.")

    const detalle = await deps.repo.obtenerDetalle(cursoId)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para gestionar este curso.")
    }

    // El módulo debe pertenecer a ESTE curso: sin este cotejo, un gestor
    // autorizado en el curso de la URL podría apuntar a un módulo de otro curso
    // (IDOR/BOLA cross-ámbito). `detalle` ya trae el árbol completo (cero queries).
    if (!detalle.modulos.some((m) => m.id === moduloId)) {
      throw new ErrorNoEncontrado("El módulo no existe.")
    }

    return deps.repo.editarModulo(cursoId, moduloId, titulo)
  }
}
