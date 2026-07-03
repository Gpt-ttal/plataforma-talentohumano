import type { Usuario } from "@pys/shared"
import type { StoragePort, UrlSubidaFoto } from "../../domain/ports/StoragePort.js"
import { ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const
const EXTENSIONES_PERMITIDAS = new Set(["jpg", "jpeg", "png", "webp"])

/**
 * Paso 1 de la subida de foto: genera una URL firmada de un solo uso hacia el
 * bucket privado `fotos-empleados`. El frontend hace el `PUT` directo con esa
 * URL y luego confirma con `guardarFoto` — el backend nunca ve los bytes.
 */
export function crearUrlSubidaFoto(deps: { storage: StoragePort }) {
  return async (actor: Usuario, id: string, extension: string): Promise<UrlSubidaFoto> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    const ext = extension.toLowerCase()
    if (!EXTENSIONES_PERMITIDAS.has(ext)) {
      throw new ErrorValidacion("Formato de imagen no soportado (use jpg, png o webp).")
    }
    return deps.storage.crearUrlSubidaFoto(id, ext)
  }
}
