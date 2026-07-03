import type { Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import type { StoragePort } from "../../domain/ports/StoragePort.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** URL firmada de lectura para pintar la foto del expediente. `null` si no tiene. */
export function obtenerUrlFoto(deps: { repo: FuncionarioRepo; storage: StoragePort }) {
  return async (actor: Usuario, id: string): Promise<{ url: string } | null> => {
    exigirRol(actor, GESTORES, "No tiene permiso para ver el expediente del empleado.")
    const fotoPath = await deps.repo.obtenerFotoPath(id)
    if (!fotoPath) return null
    return deps.storage.crearUrlLecturaFoto(fotoPath)
  }
}
