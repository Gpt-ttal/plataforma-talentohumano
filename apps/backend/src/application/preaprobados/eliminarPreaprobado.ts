import type { EliminarPreaprobadoInput, Usuario } from "@pys/shared"
import type { PreaprobacionRepo } from "../../domain/ports/PreaprobacionRepo.js"
import { exigirRol } from "../guards.js"

/**
 * El SUPERADMIN retira un correo de la allowlist. No revoca a un usuario ya
 * registrado (su fila en `usuarios` gobierna el acceso): para eso se inactiva el
 * usuario. Solo impide FUTUROS primeros ingresos de ese correo.
 */
export function eliminarPreaprobado(deps: { repo: PreaprobacionRepo }) {
  return async (actor: Usuario, input: EliminarPreaprobadoInput): Promise<void> => {
    exigirRol(
      actor,
      ["SUPERADMIN"],
      "Solo el superadministrador edita la lista de acceso.",
    )
    await deps.repo.eliminar(input.email)
  }
}
