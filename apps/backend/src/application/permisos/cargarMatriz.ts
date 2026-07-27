import type { CeldaPermiso, NivelPermiso, RolUsuario } from "@pys/shared"
import { permisosSeedPorDefecto } from "@pys/shared"
import type { PermisoRepo } from "../../domain/ports/PermisoRepo.js"

/**
 * Loader de la matriz de permisos. Lectura FRESCA por request (la matriz es pequeña
 * —a lo sumo roles × módulos— y sin caché para que un cambio surta efecto en la
 * siguiente petición, sin re-login, igual que rol/estado).
 *
 * Resolución con fallback y merge:
 *  - Tabla ausente (0023 sin aplicar) → matriz semilla derivada de MODULOS
 *    (`permisosSeedPorDefecto`), preservando la visibilidad actual (merge-safe).
 *  - Tabla presente → las celdas persistidas son autoritativas; las (rol, módulo)
 *    faltantes caen al default de la semilla. Así la matriz siempre está completa.
 */
export function cargarMatriz(deps: { repo: PermisoRepo }) {
  const obtenerMatriz = async (): Promise<CeldaPermiso[]> => {
    const consulta = await deps.repo.listarMatriz()
    const seed = permisosSeedPorDefecto()
    if (consulta.tabla === "ausente") return seed

    const guardado = new Map(
      consulta.celdas.map((c) => [`${c.rol}|${c.moduloId}`, c.nivel]),
    )
    return seed.map((celda) => ({
      ...celda,
      nivel: guardado.get(`${celda.rol}|${celda.moduloId}`) ?? celda.nivel,
    }))
  }

  const nivelDe = async (
    rol: RolUsuario,
    moduloId: string,
  ): Promise<NivelPermiso> => {
    const matriz = await obtenerMatriz()
    const celda = matriz.find((c) => c.rol === rol && c.moduloId === moduloId)
    return celda?.nivel ?? "NINGUNO"
  }

  return { obtenerMatriz, nivelDe }
}

export type CargadorMatriz = ReturnType<typeof cargarMatriz>
