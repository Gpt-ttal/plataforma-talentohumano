import type { CapacitacionPlaneada, FiltroCapacitacionesPlaneadas } from "@pys/shared"
import type { ResultadoPaginado } from "@pys/shared"

/** Puerto del CRUD del Planificador — agenda anual, sin flujo público. */
export interface PlanificadorRepo {
  listar(
    filtro: FiltroCapacitacionesPlaneadas,
  ): Promise<ResultadoPaginado<CapacitacionPlaneada>>

  crear(
    input: Omit<CapacitacionPlaneada, "id" | "estado" | "createdAt" | "updatedAt">,
  ): Promise<CapacitacionPlaneada>

  obtenerDetalle(id: string): Promise<CapacitacionPlaneada | null>

  editar(
    id: string,
    input: Partial<
      Pick<CapacitacionPlaneada, "titulo" | "areaObjetivo" | "ambito" | "anio" | "mes" | "estado" | "notas">
    >,
  ): Promise<CapacitacionPlaneada>

  eliminar(id: string): Promise<void>
}
