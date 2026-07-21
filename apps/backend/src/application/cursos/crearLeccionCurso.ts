import DOMPurify from "isomorphic-dompurify"
import type { CrearLeccionInput, Leccion, Usuario } from "@pys/shared"
import { puedeGestionarAmbito } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const ROLES_GESTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

// Etiquetas/atributos permitidos en el HTML de una lección de texto (salida de
// Tiptap): formato básico + listas + enlaces. Nada de scripts/estilos/iframes.
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

export function crearLeccionCurso(deps: { repo: CursoRepo }) {
  return async (
    actor: Usuario,
    cursoId: string,
    moduloId: string,
    input: CrearLeccionInput,
  ): Promise<Leccion> => {
    exigirRol(actor, [...ROLES_GESTORES], "Solo gestores pueden crear lecciones.")

    const detalle = await deps.repo.obtenerDetalle(cursoId)
    if (!detalle) throw new ErrorNoEncontrado("El curso no existe.")

    if (!puedeGestionarAmbito(actor.rol, detalle.curso.ambito)) {
      throw new ErrorAutorizacion("No tiene permiso para gestionar este curso.")
    }

    // El módulo debe pertenecer a ESTE curso (guarda IDOR cross-ámbito).
    if (!detalle.modulos.some((m) => m.id === moduloId)) {
      throw new ErrorNoEncontrado("El módulo no existe.")
    }

    // Sanitizar el HTML antes de persistir: el repo NO sanitiza, esta es la
    // única frontera de confianza para contenido enriquecido.
    const contenidoSaneado =
      input.contenidoTexto !== undefined
        ? DOMPurify.sanitize(input.contenidoTexto, {
            ALLOWED_TAGS: TAGS_PERMITIDOS,
            ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS,
          })
        : null

    return deps.repo.crearLeccion(cursoId, moduloId, {
      titulo: input.titulo,
      tipoContenido: input.tipoContenido,
      contenidoTexto: contenidoSaneado,
      urlVideo: input.urlVideo ?? null,
    })
  }
}
