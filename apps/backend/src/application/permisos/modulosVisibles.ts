import type { Usuario } from "@pys/shared"
import { modulosVisiblesDesdeMatriz } from "@pys/shared"
import type { CargadorMatriz } from "./cargarMatriz.js"

/**
 * Módulos que el usuario autenticado puede ver, según su rol efectivo y la matriz
 * (nivel ≥ LECTURA). Alimenta el filtrado de sidebar/lanzador en el frontend. No
 * exige rol: cada quien consulta su propia visibilidad.
 */
export function modulosVisibles(deps: { cargador: CargadorMatriz }) {
  return async (actor: Usuario): Promise<string[]> => {
    const matriz = await deps.cargador.obtenerMatriz()
    return modulosVisiblesDesdeMatriz(matriz, actor.rol)
  }
}
