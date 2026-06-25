import type {
  FiltroArchivo,
  Funcionario,
  ResultadoPaginado,
  Usuario,
} from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

/** El Archivo institucional es de la plataforma de gestión (SA + Talento Humano). */
export const ROLES_ARCHIVO = ["SUPERADMIN", "TALENTO_HUMANO"] as const

/**
 * Listado del Archivo institucional: trámites cerrados (`PAZ_Y_SALVO`) con
 * búsqueda + rango de fecha de retiro + paginación. Guarda de rol: solo la
 * plataforma (SA + TH); Control Interno y AREA no acceden al archivo → 403.
 */
export function listarArchivo(deps: { repo: FuncionarioRepo }) {
  return async (
    usuario: Usuario,
    filtro?: FiltroArchivo,
  ): Promise<ResultadoPaginado<Funcionario>> => {
    exigirRol(usuario, ROLES_ARCHIVO, "No tiene permiso para ver el archivo.")
    return deps.repo.listarArchivo(filtro)
  }
}
