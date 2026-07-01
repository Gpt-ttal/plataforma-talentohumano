import type { AreaVistoBueno } from "@pys/shared"

export interface AreaRepo {
  /** Catálogo de áreas. Por defecto solo activas; el admin pide todas. */
  listarAreas(incluirInactivas?: boolean): Promise<AreaVistoBueno[]>
  /**
   * Crea una dependencia nueva (orden = max+1, activa) y hace backfill de
   * `aprobaciones` para todos los funcionarios (D1: PENDIENTE si están en
   * proceso, NO_APLICA si ya están a paz y salvo), recalculando su estado
   * global en la misma transacción. Devuelve el catálogo completo actualizado.
   */
  crearArea(nombre: string): Promise<AreaVistoBueno[]>
  /** Renombra un área. Devuelve el catálogo completo actualizado. */
  renombrarArea(id: string, nombre: string): Promise<AreaVistoBueno[]>
  /**
   * Intercambia el orden con la dependencia vecina (no-op en los extremos).
   * Devuelve el catálogo completo actualizado.
   */
  moverArea(id: string, direccion: "subir" | "bajar"): Promise<AreaVistoBueno[]>
  /**
   * Activa/desactiva una dependencia (D2: una inactiva deja de exigirse) y
   * recalcula el estado global de los funcionarios afectados en la misma
   * transacción. Devuelve el catálogo completo actualizado.
   */
  cambiarActivaArea(id: string, activa: boolean): Promise<AreaVistoBueno[]>
}
