import type { DatosSalariales, GuardarSalarialInput, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { ErrorAutorizacion } from "../errors.js"
import { exigirRol } from "../guards.js"
import { veSalarial } from "./obtenerExpedientePersonal.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/**
 * Upsert del bloque salarial/prestacional (SENSIBLE). Doble guarda explícita
 * (rol de gestor + `veSalarial`) aunque hoy coincidan: es la capa de aplicación
 * de la defensa en profundidad documentada junto a la RLS de `empleado_salarial`.
 */
export function guardarSalarial(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    id: string,
    datos: GuardarSalarialInput,
  ): Promise<DatosSalariales> => {
    exigirRol(actor, GESTORES, "No tiene permiso para editar el expediente del empleado.")
    if (!veSalarial(actor.rol)) {
      throw new ErrorAutorizacion("No tiene permiso para editar el bloque salarial.")
    }
    return deps.repo.guardarSalarial(id, datos)
  }
}
