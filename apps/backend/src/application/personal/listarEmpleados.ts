import type {
  Empleado,
  FiltroEmpleados,
  ResultadoPaginado,
  Usuario,
} from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const GESTORES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/** Catálogo del maestro de empleados (ACTIVO + trámite), paginado. */
export function listarEmpleados(deps: { repo: FuncionarioRepo }) {
  return async (
    actor: Usuario,
    filtro?: FiltroEmpleados,
  ): Promise<ResultadoPaginado<Empleado>> => {
    exigirRol(actor, GESTORES, "No tiene permiso para ver el catálogo de personal.")
    return deps.repo.listarEmpleadosPaginado(filtro)
  }
}
