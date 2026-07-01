import type {
  FiltroFuncionarios,
  MatrizGestion,
  Usuario,
} from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

const SUPERVISORES = ["SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO"] as const

/**
 * Matriz funcionario × área activa para la visibilidad consolidada de los
 * supervisores (TH/CI/SA): "qué áreas ya dieron visto bueno y cuáles faltan".
 * Misma guarda de rol que el catálogo; un usuario AREA no la ve (trabaja su cola).
 */
export function obtenerMatriz(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    filtro?: FiltroFuncionarios,
  ): Promise<MatrizGestion> => {
    exigirRol(usuario, SUPERVISORES, "No tiene permiso para ver la matriz de avance.")
    return deps.repo.listarMatrizPaginado(filtro)
  }
}
