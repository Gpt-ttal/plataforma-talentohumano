/**
 * syncPersonalRepository.ts — Adaptador Drizzle del puerto `SyncPersonalRepo`.
 *
 * Agregador por spread de los dos repos particionados por sub-dominio: `stagingRepo`
 * (persiste/lee el lote, no muta el expediente) + `reconcileRepo` (confirma con lock
 * y reparte vía el puente). La partición mantiene cada archivo con una sola
 * responsabilidad; este módulo solo los compone y fija el tipo del puerto completo.
 */

import type { SyncPersonalRepo } from "../../domain/ports/SyncPersonalRepo.js"
import { stagingRepo } from "./syncPersonal/stagingRepo.js"
import { reconcileRepo } from "./syncPersonal/reconcileRepo.js"

export const syncPersonalRepository: SyncPersonalRepo = {
  ...stagingRepo,
  ...reconcileRepo,
}
