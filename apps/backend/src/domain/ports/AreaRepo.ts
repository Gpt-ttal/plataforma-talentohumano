import type { AreaVistoBueno } from "@pys/shared"

export interface AreaRepo {
  listarAreas(): Promise<AreaVistoBueno[]>
}
