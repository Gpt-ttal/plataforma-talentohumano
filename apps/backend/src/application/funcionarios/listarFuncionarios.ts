import type {
  FiltroFuncionarios,
  Funcionario,
  ResultadoPaginado,
  Usuario,
} from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const SUPERVISORES = ["SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO"] as const

/**
 * Catálogo de funcionarios (vista de supervisión), con búsqueda + filtro de estado
 * + paginación. Guarda de rol: solo los roles de supervisión; un usuario AREA no
 * ve el catálogo global (trabaja su cola en `listarGestionArea`).
 */
export function listarFuncionarios(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    filtro?: FiltroFuncionarios,
  ): Promise<ResultadoPaginado<Funcionario>> => {
    exigirRol(usuario, SUPERVISORES, "No tiene permiso para ver el catálogo.")
    return deps.repo.listarFuncionariosPaginado(filtro)
  }
}
