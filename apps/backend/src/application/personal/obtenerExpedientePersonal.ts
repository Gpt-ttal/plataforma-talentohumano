import type { ExpedienteCompleto, RolUsuario, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { ErrorNoEncontrado } from "../errors.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Roles que pueden ver el bloque salarial/prestacional (sensible). */
export function veSalarial(rol: RolUsuario): boolean {
  return rol === "SUPERADMIN" || rol === "TALENTO_HUMANO"
}

/**
 * Expediente 360° de un empleado (hoja de vida completa). Guarda de rol SA/TH.
 * El bloque salarial solo se incluye si el actor puede verlo (`veSalarial`);
 * de lo contrario `salarialVisible = false` y la UI pinta "restringido".
 * Defensa en profundidad: la RLS de `empleado_salarial` niega el SELECT aparte.
 * 404 si el empleado no existe.
 */
export function obtenerExpedientePersonal(deps: { repo: FuncionarioRepo }) {
  return async (actor: Usuario, id: string): Promise<ExpedienteCompleto> => {
    exigirRol(actor, GESTORES, "No tiene permiso para ver el expediente del empleado.")
    const expediente = await deps.repo.obtenerExpediente(id, veSalarial(actor.rol))
    if (!expediente) throw new ErrorNoEncontrado("Empleado no encontrado.")
    return expediente
  }
}
