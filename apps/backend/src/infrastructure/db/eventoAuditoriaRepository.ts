import { eventosAuditoria } from "./schema.js"
import type { Ejecutor } from "./recomputarEstado.js"
import { db } from "./client.js"

/**
 * Evento de auditoría a registrar. Función standalone (no una clase de repo)
 * porque se invoca DENTRO de transacciones ajenas — mismo patrón que
 * `recomputarEstado(id, tx)` — nunca como paso separado de la mutación que audita.
 */
export interface EventoAuditoriaInput {
  entidadTipo: string
  entidadId: string
  accion: string
  actorId?: string | null
  actorNombre: string
  estadoAnterior?: unknown
  estadoNuevo?: unknown
  observacion?: string | null
  metadata?: unknown
}

export async function registrarEvento(
  evento: EventoAuditoriaInput,
  ex: Ejecutor = db,
): Promise<void> {
  await ex.insert(eventosAuditoria).values({
    entidadTipo: evento.entidadTipo,
    entidadId: evento.entidadId,
    accion: evento.accion,
    actorId: evento.actorId ?? null,
    actorNombre: evento.actorNombre,
    estadoAnterior: evento.estadoAnterior ?? null,
    estadoNuevo: evento.estadoNuevo ?? null,
    observacion: evento.observacion ?? null,
    metadata: evento.metadata ?? null,
  })
}
