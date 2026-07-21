import DOMPurify from "isomorphic-dompurify"
import type { EditarLeccionInput, Leccion, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

// Mismo whitelist que `crearLeccionCurso.ts` — cualquier cambio debe reflejarse
// en ambos casos de uso (no se extrajo a un módulo compartido, mismo estilo del
// resto del código: cada caso de uso es autocontenido).
const TAGS_PERMITIDOS = [
  "p",
  "strong",
  "em",
  "u",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "br",
  "a",
]
const ATRIBUTOS_PERMITIDOS = ["href"]

export function editarLeccionCurso(deps: { repo: CursoRepo }) {
  return async (
    actor: Usuario,
    cursoId: string,
    moduloId: string,
    leccionId: string,
    input: EditarLeccionInput,
  ): Promise<Leccion> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden editar lecciones.")

    const detalle = await deps.repo.obtenerDetalle(cursoId)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para gestionar este curso.")
    }

    // La lección debe pertenecer a un módulo de ESTE curso (guarda IDOR
    // cross-ámbito). `detalle` ya trae el árbol completo (cero queries).
    const modulo = detalle.modulos.find((m) => m.id === moduloId)
    if (!modulo || !modulo.lecciones.some((l) => l.id === leccionId)) {
      throw new ErrorNoEncontrado("La lección no existe.")
    }

    // Sanitiza solo si el patch trae `contenidoTexto`; si se omite, no se toca.
    return deps.repo.editarLeccion(cursoId, leccionId, {
      ...input,
      contenidoTexto:
        input.contenidoTexto !== undefined
          ? DOMPurify.sanitize(input.contenidoTexto, {
              ALLOWED_TAGS: TAGS_PERMITIDOS,
              ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS,
            })
          : undefined,
    })
  }
}
