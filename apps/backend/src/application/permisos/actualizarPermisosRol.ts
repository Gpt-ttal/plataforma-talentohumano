import type {
  ActualizarPermisosRolInput,
  CeldaPermiso,
  RolUsuario,
  Usuario,
} from "@pys/shared"
import { MODULOS } from "@pys/shared"
import type { PermisoRepo } from "../../domain/ports/PermisoRepo.js"
import { ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"

const MODULO_IDS = new Set(MODULOS.map((m) => m.id))

/**
 * El SUPERADMIN reemplaza los permisos de un rol (todas sus celdas).
 *
 * Guardas:
 *  - Rol del actor = SUPERADMIN → si no, 403.
 *  - **Anti-lockout:** el rol SUPERADMIN es inmutable — no se puede recortar su
 *    acceso (ni por esta vía ni por la matriz). Intentarlo → 400. Sumado a que este
 *    caso de uso se monta bajo `requireRol("SUPERADMIN")` (no bajo la propia
 *    matriz), la Configuración nunca puede cerrarse a sí misma.
 *  - Validación de módulo: cada `moduloId` debe existir en `MODULOS` (defensa; zod
 *    ya lo refina en la frontera).
 */
export function actualizarPermisosRol(deps: { repo: PermisoRepo }) {
  return async (
    actor: Usuario,
    rol: RolUsuario,
    input: ActualizarPermisosRolInput,
  ): Promise<void> => {
    exigirRol(
      actor,
      ["SUPERADMIN"],
      "Solo el superadministrador edita los permisos.",
    )

    if (rol === "SUPERADMIN") {
      throw new ErrorValidacion(
        "El superadministrador no puede perder acceso: su rol es inmutable.",
      )
    }

    for (const celda of input.celdas) {
      if (!MODULO_IDS.has(celda.moduloId)) {
        throw new ErrorValidacion(`Módulo desconocido: ${celda.moduloId}.`)
      }
    }

    const celdas: CeldaPermiso[] = input.celdas.map((c) => ({
      rol,
      moduloId: c.moduloId,
      nivel: c.nivel,
    }))

    await deps.repo.reemplazarPermisosRol(rol, celdas, actor.id)
  }
}
