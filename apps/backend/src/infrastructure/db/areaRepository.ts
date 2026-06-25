import { asc } from "drizzle-orm"
import type { AreaVistoBueno } from "@pys/shared"
import type { AreaRepo } from "../../domain/ports/AreaRepo.js"
import { db } from "./client.js"
import { areas } from "./schema.js"

function mapArea(r: typeof areas.$inferSelect): AreaVistoBueno {
  return {
    id: r.id,
    nombre: r.nombre,
    orden: r.orden,
    activa: r.activa,
  }
}

export const areaRepository: AreaRepo = {
  async listarAreas(): Promise<AreaVistoBueno[]> {
    const rows = await db.select().from(areas).orderBy(asc(areas.orden))
    return rows.map(mapArea)
  },
}
