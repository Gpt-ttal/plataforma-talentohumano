import { and, eq, inArray } from "drizzle-orm"
import type { EstadoArea, EstadoGlobal } from "@pys/shared"
import { calcularEstadoGlobal } from "@pys/shared"
import type { ResultadoMutacion } from "../../domain/ports/FuncionarioRepo.js"
import { db } from "./client.js"
import { aprobaciones, areas, funcionarios } from "./schema.js"

/**
 * Ejecutor de consultas: el `db` normal o una transacción (`tx`). Permite que el
 * recálculo corra dentro de la misma transacción que la mutación que lo dispara
 * (cambio de visto bueno, hito de liquidación o mutación del catálogo de áreas),
 * garantizando que la escritura y el recálculo del estado global se confirman
 * juntos o no se confirman.
 */
export type Ejecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

type FuncionarioRow = typeof funcionarios.$inferSelect

/** Hitos de liquidación relevantes para el recálculo. */
interface HitosLiquidacion {
  fechaLiquidacionGenerada: Date | null
  fechaLiquidacion: Date | null
}

/**
 * Decisión PURA (sin I/O) del recálculo de un funcionario a partir de sus estados
 * de área activa y sus hitos actuales. Es la única fuente de verdad que comparten
 * el recálculo individual (`recomputarEstado`) y el de lote (`recomputarEstadoEnLote`),
 * así ambos caminos no pueden divergir. La máquina de estados (`calcularEstadoGlobal`)
 * es intocable; aquí solo decidimos QUÉ le pasamos y si hay que limpiar hitos.
 *
 * `limpiarHitos` = las áreas activas NO están todas OK → el relevo TH → CI debe
 * reiniciarse (se anulan los hitos antes de calcular, por eso `liquidacionGenerada`/
 * `liquidado` se fuerzan a false en ese caso).
 */
export function decidirRecalculo(
  estadosAreas: EstadoArea[],
  hitos: HitosLiquidacion,
): {
  estadoGlobal: EstadoGlobal
  hayRechazo: boolean
  hayDevolucion: boolean
  limpiarHitos: boolean
} {
  const esOk = (e: EstadoArea) => e === "APROBADO" || e === "NO_APLICA"
  const todasOk = estadosAreas.length > 0 && estadosAreas.every(esOk)

  const fechaLiquidacionGenerada = todasOk ? hitos.fechaLiquidacionGenerada : null
  const fechaLiquidacion = todasOk ? hitos.fechaLiquidacion : null

  const { estadoGlobal, hayRechazo, hayDevolucion } = calcularEstadoGlobal({
    estadosAreas,
    liquidacionGenerada: fechaLiquidacionGenerada !== null,
    liquidado: fechaLiquidacion !== null,
  })

  return { estadoGlobal, hayRechazo, hayDevolucion, limpiarHitos: !todasOk }
}

/**
 * Recalcula y persiste el estado global de un funcionario a partir de sus
 * aprobaciones **de áreas activas** (D2: una dependencia inactiva deja de
 * exigirse, sale del conjunto que alimenta a `calcularEstadoGlobal`). Si las
 * áreas activas no están todas OK, limpia los hitos de liquidación para que el
 * relevo TH → CI se reinicie limpio.
 */
export async function recomputarEstado(
  funcionarioId: string,
  ex: Ejecutor = db,
): Promise<ResultadoMutacion> {
  // Estados de las aprobaciones, restringidos a áreas activas.
  const apRows = await ex
    .select({ estado: aprobaciones.estado })
    .from(aprobaciones)
    .innerJoin(areas, eq(aprobaciones.areaId, areas.id))
    .where(and(eq(aprobaciones.funcionarioId, funcionarioId), eq(areas.activa, true)))

  const estadosAreas = apRows.map((r) => r.estado as EstadoArea)

  // Hitos actuales del funcionario.
  const fRows = await ex
    .select({
      fechaLiquidacionGenerada: funcionarios.fechaLiquidacionGenerada,
      fechaLiquidacion: funcionarios.fechaLiquidacion,
    })
    .from(funcionarios)
    .where(eq(funcionarios.id, funcionarioId))
    .limit(1)

  const fRow = fRows[0]
  if (!fRow) throw new Error(`recomputarEstado: funcionario ${funcionarioId} no encontrado`)

  const { estadoGlobal, hayRechazo, hayDevolucion, limpiarHitos } = decidirRecalculo(
    estadosAreas,
    fRow,
  )

  const update: Partial<FuncionarioRow> & { updatedAt: Date } = {
    updatedAt: new Date(),
    estadoGlobal,
  }
  if (limpiarHitos) {
    // Un área volvió: se limpian los hitos para reiniciar el relevo TH → CI.
    update.fechaLiquidacionGenerada = null
    update.liquidacionGeneradaPor = null
    update.fechaLiquidacion = null
    update.liquidadoPor = null
  }

  await ex.update(funcionarios).set(update).where(eq(funcionarios.id, funcionarioId))

  return { estadoGlobal, hayRechazo, hayDevolucion }
}

/**
 * Versión en lote de `recomputarEstado` para las mutaciones del catálogo de áreas
 * (`crearArea`/`cambiarActivaArea`), que antes hacían `for (f) await recomputarEstado(f)`
 * → 3 queries por funcionario (~1.600 con 543 funcionarios en una sola transacción,
 * pool `max:1` → riesgo de statement-timeout). Aquí el I/O se colapsa a **2 lecturas**
 * (todas las aprobaciones de áreas activas + todos los hitos, agrupados en memoria) y
 * **escrituras agrupadas por estado destino** (≤ 8 UPDATE `IN (...)` en vez de N). La
 * decisión por funcionario reusa `decidirRecalculo`, idéntica al camino individual.
 */
export async function recomputarEstadoEnLote(
  funcionarioIds: string[],
  ex: Ejecutor = db,
): Promise<void> {
  if (funcionarioIds.length === 0) return

  // (1) Todas las aprobaciones de áreas activas de esos funcionarios, en 1 query.
  const apRows = await ex
    .select({ funcionarioId: aprobaciones.funcionarioId, estado: aprobaciones.estado })
    .from(aprobaciones)
    .innerJoin(areas, eq(aprobaciones.areaId, areas.id))
    .where(and(inArray(aprobaciones.funcionarioId, funcionarioIds), eq(areas.activa, true)))

  const estadosPorFuncionario = new Map<string, EstadoArea[]>()
  for (const r of apRows) {
    const arr = estadosPorFuncionario.get(r.funcionarioId) ?? []
    arr.push(r.estado as EstadoArea)
    estadosPorFuncionario.set(r.funcionarioId, arr)
  }

  // (2) Hitos actuales de esos funcionarios, en 1 query. Este es el conjunto
  // autoritativo de filas existentes a recalcular.
  const fRows = await ex
    .select({
      id: funcionarios.id,
      fechaLiquidacionGenerada: funcionarios.fechaLiquidacionGenerada,
      fechaLiquidacion: funcionarios.fechaLiquidacion,
    })
    .from(funcionarios)
    .where(inArray(funcionarios.id, funcionarioIds))

  // Agrupar por (limpiarHitos, estadoGlobal) para colapsar las escrituras. Un
  // funcionario sin aprobaciones de áreas activas cae en estadosAreas = [] →
  // PENDIENTE + limpiarHitos (idéntico al loop individual).
  const conLimpieza = new Map<EstadoGlobal, string[]>()
  const sinLimpieza = new Map<EstadoGlobal, string[]>()
  for (const f of fRows) {
    const estadosAreas = estadosPorFuncionario.get(f.id) ?? []
    const { estadoGlobal, limpiarHitos } = decidirRecalculo(estadosAreas, f)
    const destino = limpiarHitos ? conLimpieza : sinLimpieza
    const arr = destino.get(estadoGlobal) ?? []
    arr.push(f.id)
    destino.set(estadoGlobal, arr)
  }

  const ahora = new Date()

  // Con limpieza de hitos (un área volvió/desapareció): estado + anular hitos.
  for (const [estadoGlobal, ids] of conLimpieza) {
    await ex
      .update(funcionarios)
      .set({
        estadoGlobal,
        fechaLiquidacionGenerada: null,
        liquidacionGeneradaPor: null,
        fechaLiquidacion: null,
        liquidadoPor: null,
        updatedAt: ahora,
      })
      .where(inArray(funcionarios.id, ids))
  }

  // Sin limpieza (todas OK): solo el estado destino, se conservan los hitos.
  for (const [estadoGlobal, ids] of sinLimpieza) {
    await ex
      .update(funcionarios)
      .set({ estadoGlobal, updatedAt: ahora })
      .where(inArray(funcionarios.id, ids))
  }
}
