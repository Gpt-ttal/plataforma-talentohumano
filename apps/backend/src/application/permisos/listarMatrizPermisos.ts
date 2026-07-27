import type { CeldaPermiso, Usuario } from "@pys/shared"
import { exigirRol } from "../guards.js"
import type { CargadorMatriz } from "./cargarMatriz.js"

/**
 * El SUPERADMIN lee la matriz completa de permisos (rol × módulo) para editarla en
 * la Configuración. Devuelve todas las celdas (persistidas + defaults).
 */
export function listarMatrizPermisos(deps: { cargador: CargadorMatriz }) {
  return async (actor: Usuario): Promise<CeldaPermiso[]> => {
    exigirRol(actor, ["SUPERADMIN"], "Solo el superadministrador ve la matriz de permisos.")
    return deps.cargador.obtenerMatriz()
  }
}
