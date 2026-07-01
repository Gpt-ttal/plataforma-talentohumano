import { and, eq } from "drizzle-orm"
import type { EstadoArea } from "@pys/shared"
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

/**
 * Recalcula y persiste el estado global de un funcionario a partir de sus
 * aprobaciones **de áreas activas** (D2: una dependencia inactiva deja de
 * exigirse, sale del conjunto que alimenta a `calcularEstadoGlobal`). Si las
 * áreas activas no están todas OK, limpia los hitos de liquidación para que el
 * relevo TH → CI se reinicie limpio.
 *
 * La máquina de estados (`calcularEstadoGlobal`) es intocable; aquí solo
 * decidimos QUÉ estados de área le pasamos.
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

  const esOk = (e: EstadoArea) => e === "APROBADO" || e === "NO_APLICA"
  const todasOk = estadosAreas.length > 0 && estadosAreas.every(esOk)

  let fechaLiquidacionGenerada = fRow.fechaLiquidacionGenerada
  let fechaLiquidacion = fRow.fechaLiquidacion

  const update: Partial<FuncionarioRow> & { updatedAt: Date } = {
    updatedAt: new Date(),
  }

  if (!todasOk) {
    // Un área volvió: se limpian los hitos para reiniciar el relevo TH → CI.
    fechaLiquidacionGenerada = null
    fechaLiquidacion = null
    update.fechaLiquidacionGenerada = null
    update.liquidacionGeneradaPor = null
    update.fechaLiquidacion = null
    update.liquidadoPor = null
  }

  const { estadoGlobal, hayRechazo } = calcularEstadoGlobal({
    estadosAreas,
    liquidacionGenerada: fechaLiquidacionGenerada !== null,
    liquidado: fechaLiquidacion !== null,
  })
  update.estadoGlobal = estadoGlobal

  await ex.update(funcionarios).set(update).where(eq(funcionarios.id, funcionarioId))

  return { estadoGlobal, hayRechazo }
}
