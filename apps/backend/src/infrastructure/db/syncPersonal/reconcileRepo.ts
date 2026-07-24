/**
 * reconcileRepo.ts — Confirmación del lote → expediente (transacción con lock).
 *
 * Clon del patrón `loteImportacionRepository.confirmarParcial`: lock pesimista
 * sobre el lote (serializa dos confirmaciones concurrentes del MISMO lote), y por
 * cada fila VALIDA seleccionada invoca el puente `aplicarRegistroSync` DENTRO de la
 * misma transacción. Tolerante a fallos parciales: una fila que falla queda
 * `DESCARTADA` con el motivo, sin abortar el resto del lote.
 */

import { and, eq, inArray } from "drizzle-orm"
import type { SyncPersonalRepo } from "../../../domain/ports/SyncPersonalRepo.js"
import type { LoteEstado, ResultadoConfirmacionSync } from "@pys/shared"
import { ErrorNoEncontrado } from "../../../application/errors.js"
import { db } from "../client.js"
import { filasSyncPersonal, lotesSyncPersonal } from "../schema.js"
import { registrarEvento } from "../eventoAuditoriaRepository.js"
import { aplicarRegistroSync } from "./aplicarRegistroSync.js"
import { construirPrevisualizacion } from "./mappersSync.js"

export const reconcileRepo: Pick<SyncPersonalRepo, "confirmarParcial"> = {
  async confirmarParcial(
    loteId: string,
    filaIds: string[],
    autor: string,
  ): Promise<ResultadoConfirmacionSync> {
    return db.transaction(async (tx) => {
      const [lote] = await tx
        .select()
        .from(lotesSyncPersonal)
        .where(eq(lotesSyncPersonal.id, loteId))
        .for("update")
      if (!lote) throw new ErrorNoEncontrado("Lote no encontrado.")

      const seleccionadas = filaIds.length
        ? await tx
            .select()
            .from(filasSyncPersonal)
            .where(
              and(eq(filasSyncPersonal.loteId, loteId), inArray(filasSyncPersonal.id, filaIds)),
            )
        : []

      const fallidas: { filaId: string; motivo: string }[] = []
      let confirmadasEnEstaLlamada = 0

      for (const fila of seleccionadas) {
        if (fila.estado !== "VALIDA") {
          fallidas.push({
            filaId: fila.id,
            motivo: `La fila no está en estado VALIDA (está ${fila.estado}).`,
          })
          continue
        }
        try {
          const { funcionarioId } = await aplicarRegistroSync(fila, autor, tx)
          await tx
            .update(filasSyncPersonal)
            .set({ estado: "CONFIRMADA", funcionarioId, mensajeError: null })
            .where(eq(filasSyncPersonal.id, fila.id))
          confirmadasEnEstaLlamada++
        } catch (e) {
          // Un fallo de fila NO aborta el lote: se descarta con el motivo.
          const motivo = e instanceof Error ? e.message : "Error al confirmar la fila."
          fallidas.push({ filaId: fila.id, motivo })
          await tx
            .update(filasSyncPersonal)
            .set({ estado: "DESCARTADA", mensajeError: motivo })
            .where(eq(filasSyncPersonal.id, fila.id))
        }
      }

      const filasFinal = await tx
        .select()
        .from(filasSyncPersonal)
        .where(eq(filasSyncPersonal.loteId, loteId))
      const confirmadasTotal = filasFinal.filter((f) => f.estado === "CONFIRMADA").length
      const quedanValidas = filasFinal.some((f) => f.estado === "VALIDA")
      const nuevoEstado: LoteEstado =
        confirmadasTotal > 0
          ? quedanValidas
            ? "CONFIRMADO_PARCIAL"
            : "CONFIRMADO_TOTAL"
          : lote.estado

      const [loteFinal] = await tx
        .update(lotesSyncPersonal)
        .set({
          estado: nuevoEstado,
          filasConfirmadas: confirmadasTotal,
          updatedAt: new Date(),
        })
        .where(eq(lotesSyncPersonal.id, loteId))
        .returning()

      await registrarEvento(
        {
          entidadTipo: "lote_sync_personal",
          entidadId: loteId,
          accion: "CONFIRMAR_SYNC_PARCIAL",
          actorNombre: autor?.trim() || "Talento Humano",
          estadoNuevo: { confirmadas: confirmadasEnEstaLlamada, fallidas: fallidas.length },
        },
        tx,
      )

      return {
        lote: await construirPrevisualizacion(loteFinal!, filasFinal, [], tx),
        confirmadas: confirmadasEnEstaLlamada,
        fallidas,
      }
    })
  },
}
