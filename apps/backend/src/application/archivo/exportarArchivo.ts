import type { FiltroArchivo, Usuario } from "@pys/shared"
import { construirCsvArchivo } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"
import { ROLES_ARCHIVO } from "./listarArchivo.js"

/**
 * Export CSV del Archivo: serializa TODO el conjunto filtrado (no una sola
 * página) de trámites cerrados. Guarda de rol: solo la plataforma (SA + TH).
 *
 * Hace dos lecturas: una para conocer el total y otra para traer todas las filas
 * que cumplen el filtro, evitando depender del tamaño de página por defecto.
 */
export function exportarArchivo(deps: { repo: FuncionarioRepo }) {
  return async (usuario: Usuario, filtro?: FiltroArchivo): Promise<string> => {
    exigirRol(usuario, ROLES_ARCHIVO, "No tiene permiso para exportar el archivo.")

    const cabeza = await deps.repo.listarArchivo({ ...filtro, pagina: 1, porPagina: 1 })
    const todos = await deps.repo.listarArchivo({
      ...filtro,
      pagina: 1,
      porPagina: Math.max(1, cabeza.total),
    })
    return construirCsvArchivo(todos.items)
  }
}
