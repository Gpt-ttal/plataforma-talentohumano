import type { EmpleadoContractual, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/**
 * Persiste `foto_path` tras una subida exitosa a Storage (o lo borra con `null`).
 * El backend nunca ve los bytes de la imagen: el frontend sube directo al bucket
 * con la URL firmada de `crearUrlSubidaFoto` y solo reporta la ruta resultante.
 */
export function guardarFoto(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    fotoPath: string | null,
  ): Promise<EmpleadoContractual> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    return deps.repo.guardarFotoPath(id, fotoPath)
  }
}
