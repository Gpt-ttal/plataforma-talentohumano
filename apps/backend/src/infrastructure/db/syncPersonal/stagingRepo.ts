/**
 * stagingRepo.ts — Persistencia del lote en staging (NO muta el expediente).
 *
 * Crea el lote y sus filas normalizadas, clasificándolas (VALIDA/DUPLICADA) con el
 * núcleo puro `clasificarFilasSync`, y expone la lectura de un lote con su diff.
 * Idempotente por `idempotencyKey`: una corrida ya vista devuelve el lote existente
 * sin duplicar. La escritura al expediente vive en `reconcileRepo` + el puente.
 */

import { eq } from "drizzle-orm"
import type {
  ErrorParseoFila,
  RegistroSyncNormalizado,
  SyncPersonalRepo,
} from "../../../domain/ports/SyncPersonalRepo.js"
import type { LoteSyncPrevisualizacion, OrigenLoteSync } from "@pys/shared"
import { db } from "../client.js"
import { filasSyncPersonal, lotesSyncPersonal } from "../schema.js"
import { clasificarFilasSync } from "./diffSync.js"
import { construirPrevisualizacion } from "./mappersSync.js"

/** `numeric` de pg se escribe como string. */
function numAString(v: number | null): string | null {
  return v === null || v === undefined ? null : String(v)
}

/** Registro normalizado → valores de columna para `filas_sync_personal`. */
function aColumnas(r: RegistroSyncNormalizado) {
  return {
    numeroFila: r.numeroFila,
    documento: r.documento,
    nombreCompleto: r.nombreCompleto,
    genero: r.genero,
    tipoDocumento: r.tipoDocumento,
    fechaExpedicion: r.fechaExpedicion,
    nacionalidad: r.nacionalidad,
    fechaNacimiento: r.fechaNacimiento,
    lugarResidencia: r.lugarResidencia,
    direccion: r.direccion,
    telefono: r.telefono,
    barrio: r.barrio,
    estadoCivil: r.estadoCivil,
    personasACargo: r.personasACargo,
    correo: r.correo,
    cargo: r.cargo,
    estadoContrato: r.estadoContrato,
    centroCostos: r.centroCostos,
    fondoSede: r.fondoSede,
    fechaIngreso: r.fechaIngreso,
    fechaFinContrato: r.fechaFinContrato,
    dependencia: r.dependencia,
    tipoEmpleado: r.tipoEmpleado,
    tipoContrato: r.tipoContrato,
    categoria: r.categoria,
    salario: numAString(r.salario),
    eps: r.eps,
    fondoPensionCesantias: r.fondoPensionCesantias,
    certificadoBancario: r.certificadoBancario,
  }
}

export const stagingRepo: Pick<SyncPersonalRepo, "crearLoteConFilas" | "obtenerLote"> = {
  async crearLoteConFilas(
    origen: OrigenLoteSync,
    registros: RegistroSyncNormalizado[],
    erroresParseo: ErrorParseoFila[],
    creadoPor: string,
    idempotencyKey: string | null,
  ): Promise<LoteSyncPrevisualizacion> {
    // Idempotencia: una corrida ya registrada devuelve su lote (sin recrear ni
    // re-emitir erroresParseo, que solo pertenecen a la previsualización original).
    if (idempotencyKey) {
      const [existente] = await db
        .select()
        .from(lotesSyncPersonal)
        .where(eq(lotesSyncPersonal.idempotencyKey, idempotencyKey))
        .limit(1)
      if (existente) {
        const filas = await db
          .select()
          .from(filasSyncPersonal)
          .where(eq(filasSyncPersonal.loteId, existente.id))
        return construirPrevisualizacion(existente, filas, [], db)
      }
    }

    return db.transaction(async (tx) => {
      const [lote] = await tx
        .insert(lotesSyncPersonal)
        .values({
          origen,
          estado: "PREVISUALIZADO",
          totalFilas: registros.length,
          creadoPor,
          idempotencyKey,
        })
        .returning()
      if (!lote) throw new Error("No se pudo crear el lote de sync.")

      const clasif = clasificarFilasSync(registros.map((r) => r.documento))
      const filasAInsertar = registros.map((r, i) => {
        const c = clasif[i]!
        return {
          loteId: lote.id,
          ...aColumnas(r),
          estado: c.estado,
          mensajeError: c.mensajeError,
        }
      })

      const filas = filasAInsertar.length
        ? await tx.insert(filasSyncPersonal).values(filasAInsertar).returning()
        : []

      return construirPrevisualizacion(lote, filas, erroresParseo, tx)
    })
  },

  async obtenerLote(id: string): Promise<LoteSyncPrevisualizacion | null> {
    const [lote] = await db
      .select()
      .from(lotesSyncPersonal)
      .where(eq(lotesSyncPersonal.id, id))
      .limit(1)
    if (!lote) return null
    const filas = await db
      .select()
      .from(filasSyncPersonal)
      .where(eq(filasSyncPersonal.loteId, id))
    return construirPrevisualizacion(lote, filas, [], db)
  },
}
