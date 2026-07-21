import { asc, eq, sql } from "drizzle-orm"
import type { AreaVistoBueno } from "@pys/shared"
import { estadoInicialAreaNueva } from "@pys/shared"
import type { AreaRepo } from "../../domain/ports/AreaRepo.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../../application/errors.js"
import { db } from "./client.js"
import { aprobaciones, areas, funcionarios } from "./schema.js"
import { recomputarEstadoEnLote, type Ejecutor } from "./recomputarEstado.js"

function mapArea(r: typeof areas.$inferSelect): AreaVistoBueno {
  return {
    id: r.id,
    nombre: r.nombre,
    orden: r.orden,
    activa: r.activa,
  }
}

/** Catálogo completo, ordenado (incluye inactivas: lo consume la vista admin). */
async function listarTodas(ex: Ejecutor = db): Promise<AreaVistoBueno[]> {
  const rows = await ex.select().from(areas).orderBy(asc(areas.orden))
  return rows.map(mapArea)
}

export const areaRepository: AreaRepo = {
  async listarAreas(incluirInactivas = false): Promise<AreaVistoBueno[]> {
    const rows = await db
      .select()
      .from(areas)
      .where(incluirInactivas ? undefined : eq(areas.activa, true))
      .orderBy(asc(areas.orden))
    return rows.map(mapArea)
  },

  async crearArea(nombre: string): Promise<AreaVistoBueno[]> {
    return db.transaction(async (tx) => {
      // Idempotencia a nivel de aplicación: doble clic/reintento con el mismo
      // nombre (normalizado) no crea 2 áreas ni repite el backfill masivo.
      const yaExiste = await tx
        .select({ id: areas.id })
        .from(areas)
        .where(sql`lower(trim(${areas.nombre})) = lower(trim(${nombre}))`)
        .limit(1)
      if (yaExiste.length > 0) {
        throw new ErrorValidacion("Ya existe un área con ese nombre.")
      }

      // Orden = max + 1 (1 si el catálogo está vacío).
      const [agg] = await tx
        .select({ max: sql<number | null>`max(${areas.orden})` })
        .from(areas)
      const orden = (agg?.max ?? 0) + 1

      const [area] = await tx
        .insert(areas)
        .values({ nombre, orden, activa: true })
        .returning({ id: areas.id })
      if (!area) throw new Error("crearArea: la inserción no devolvió el área.")

      // Backfill de aprobaciones para todos los funcionarios (D1).
      const fRows = await tx
        .select({ id: funcionarios.id, estadoGlobal: funcionarios.estadoGlobal })
        .from(funcionarios)

      if (fRows.length > 0) {
        await tx.insert(aprobaciones).values(
          fRows.map((f) => ({
            funcionarioId: f.id,
            areaId: area.id,
            estado: estadoInicialAreaNueva(f.estadoGlobal),
          })),
        )
        // Recalcular: un funcionario en proceso gana un área PENDIENTE → vuelve a
        // PENDIENTE; uno cerrado gana NO_APLICA → sigue a paz y salvo. En lote:
        // 2 lecturas + escrituras agrupadas, no 3 queries por funcionario.
        await recomputarEstadoEnLote(
          fRows.map((f) => f.id),
          tx,
        )
      }

      return listarTodas(tx)
    })
  },

  async renombrarArea(id: string, nombre: string): Promise<AreaVistoBueno[]> {
    const filas = await db
      .update(areas)
      .set({ nombre })
      .where(eq(areas.id, id))
      .returning({ id: areas.id })
    if (filas.length === 0) throw new ErrorNoEncontrado("El área no existe.")
    return listarTodas()
  },

  async moverArea(
    id: string,
    direccion: "subir" | "bajar",
  ): Promise<AreaVistoBueno[]> {
    return db.transaction(async (tx) => {
      const [actual] = await tx
        .select({ id: areas.id, orden: areas.orden })
        .from(areas)
        .where(eq(areas.id, id))
        .limit(1)
      if (!actual) throw new ErrorNoEncontrado("El área no existe.")

      // Vecino inmediato en la dirección pedida (orden contiguo por catálogo denso).
      const ordenVecino = direccion === "subir" ? actual.orden - 1 : actual.orden + 1
      const [vecino] = await tx
        .select({ id: areas.id, orden: areas.orden })
        .from(areas)
        .where(eq(areas.orden, ordenVecino))
        .limit(1)
      // En los extremos no hay vecino: no-op.
      if (!vecino) return listarTodas(tx)

      // Swap con sentinela temporal para no violar UNIQUE(orden).
      await tx.update(areas).set({ orden: -1 }).where(eq(areas.id, actual.id))
      await tx.update(areas).set({ orden: actual.orden }).where(eq(areas.id, vecino.id))
      await tx.update(areas).set({ orden: vecino.orden }).where(eq(areas.id, actual.id))

      return listarTodas(tx)
    })
  },

  async cambiarActivaArea(
    id: string,
    activa: boolean,
  ): Promise<AreaVistoBueno[]> {
    return db.transaction(async (tx) => {
      const filas = await tx
        .update(areas)
        .set({ activa })
        .where(eq(areas.id, id))
        .returning({ id: areas.id })
      if (filas.length === 0) throw new ErrorNoEncontrado("El área no existe.")

      // Recalcular el estado global de los funcionarios con fila en esta área:
      // si se desactiva y era el único bloqueante, suben a LISTO_PARA_LIQUIDAR;
      // si se reactiva, vuelven a PENDIENTE.
      const afectados = await tx
        .selectDistinct({ funcionarioId: aprobaciones.funcionarioId })
        .from(aprobaciones)
        .where(eq(aprobaciones.areaId, id))
      await recomputarEstadoEnLote(
        afectados.map((a) => a.funcionarioId),
        tx,
      )

      return listarTodas(tx)
    })
  },
}
