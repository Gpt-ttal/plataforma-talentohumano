import type { CeldaPermiso, RolUsuario } from "@pys/shared"

/**
 * Resultado de leer la matriz. Distingue "tabla ausente" (migración 0023 sin
 * aplicar → el loader cae a la semilla derivada de MODULOS) de "tabla presente con
 * estas celdas". Patrón de la 0019: el código se mergea antes de aplicar sin
 * cambiar el comportamiento.
 */
export type ConsultaMatriz =
  | { tabla: "ausente" }
  | { tabla: "presente"; celdas: CeldaPermiso[] }

export interface PermisoRepo {
  /** Lee todas las celdas persistidas, señalando si la tabla existe todavía. */
  listarMatriz(): Promise<ConsultaMatriz>
  /**
   * Reemplaza el conjunto de celdas de un rol de forma autoritativa: borra las
   * previas del rol y reinserta las recibidas, atómicamente. El frontend envía
   * TODAS las celdas del rol; las omitidas vuelven al default (NINGUNO por fallback).
   */
  reemplazarPermisosRol(
    rol: RolUsuario,
    celdas: CeldaPermiso[],
    actorId: string,
  ): Promise<void>
}
