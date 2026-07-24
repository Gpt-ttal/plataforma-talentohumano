/**
 * mappersSync.ts — Mapeo fila-persistida → dominio y armado de la previsualización.
 *
 * Compartido por `stagingRepo` (al crear/leer un lote) y `reconcileRepo` (al
 * devolver el lote tras confirmar), para que el enriquecimiento con diffs sea uno
 * solo. El diff se calcula contra el expediente ACTUAL de cada documento (leído en
 * lote), reusando el núcleo puro `calcularDiffs`.
 */

import { eq, inArray } from "drizzle-orm"
import type { FilaSync, FilaSyncConDiff, LoteSyncPrevisualizacion } from "@pys/shared"
import {
  empleadoPersonales,
  empleadoSalarial,
  filasSyncPersonal,
  fondosSede,
  funcionarios,
  lotesSyncPersonal,
} from "../schema.js"
import type { Ejecutor } from "../recomputarEstado.js"
import { calcularDiffs, type SnapshotActualSync } from "./diffSync.js"

export type FilaSyncRow = typeof filasSyncPersonal.$inferSelect
type LoteRow = typeof lotesSyncPersonal.$inferSelect

/** `numeric`/`int` de pg → número (o null). */
function num(v: string | number | null): number | null {
  return v === null || v === undefined ? null : Number(v)
}

/** Fila persistida → `FilaSync` de dominio (montos a número, resto directo). */
export function mapFilaSync(r: FilaSyncRow): FilaSync {
  return {
    id: r.id,
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
    salario: num(r.salario),
    eps: r.eps,
    fondoPensionCesantias: r.fondoPensionCesantias,
    certificadoBancario: r.certificadoBancario,
    estado: r.estado,
    mensajeError: r.mensajeError,
    funcionarioId: r.funcionarioId,
  }
}

/**
 * Lee el expediente actual de cada `documento` del lote (en 4 queries agrupadas) y
 * arma un snapshot por documento para el diff. Un documento sin fila en
 * `funcionarios` → sin entrada (→ `esNuevoIngreso`).
 */
async function snapshotsPorDocumento(
  documentos: string[],
  ex: Ejecutor,
): Promise<Map<string, SnapshotActualSync>> {
  const mapa = new Map<string, SnapshotActualSync>()
  if (documentos.length === 0) return mapa

  const funcRows = await ex
    .select()
    .from(funcionarios)
    .where(inArray(funcionarios.documento, documentos))
  if (funcRows.length === 0) return mapa

  const ids = funcRows.map((f) => f.id)
  const sedeIds = funcRows.map((f) => f.fondoSedeId).filter((v): v is string => v !== null)

  const [persRows, salRows, sedeRows] = await Promise.all([
    ex.select().from(empleadoPersonales).where(inArray(empleadoPersonales.funcionarioId, ids)),
    ex.select().from(empleadoSalarial).where(inArray(empleadoSalarial.funcionarioId, ids)),
    sedeIds.length
      ? ex.select().from(fondosSede).where(inArray(fondosSede.id, sedeIds))
      : Promise.resolve([] as (typeof fondosSede.$inferSelect)[]),
  ])
  const persPorId = new Map(persRows.map((p) => [p.funcionarioId, p]))
  const salPorId = new Map(salRows.map((s) => [s.funcionarioId, s]))
  const nombreSede = new Map(sedeRows.map((s) => [s.id, s.nombre]))

  for (const f of funcRows) {
    const p = persPorId.get(f.id)
    const s = salPorId.get(f.id)
    mapa.set(f.documento, {
      nombreCompleto: f.nombreCompleto,
      tipoDocumento: f.tipoDocumento,
      nacionalidad: f.nacionalidad,
      centroCostos: f.centroCostos,
      categoria: f.categoria,
      cargo: f.cargo,
      dependencia: f.areaOrigen,
      telefono: f.telefono,
      tipoEmpleado: f.tipoVinculacion,
      tipoContrato: f.tipoContrato,
      fechaIngreso: f.fechaIngreso,
      fechaFinContrato: f.fechaFinContrato,
      fondoSede: f.fondoSedeId ? (nombreSede.get(f.fondoSedeId) ?? null) : null,
      genero: p?.genero ?? null,
      fechaExpedicion: p?.fechaExpedicion ?? null,
      fechaNacimiento: p?.fechaNacimiento ?? null,
      direccion: p?.direccion ?? null,
      barrio: p?.barrio ?? null,
      correo: p?.correoPersonal ?? null,
      estadoCivil: p?.estadoCivil ?? null,
      lugarResidencia: p?.lugarResidencia ?? null,
      salario: s?.salarioBasico ? Number(s.salarioBasico) : null,
      eps: s?.eps ?? null,
      fondoPensionCesantias: s?.fondoCesantias ?? null,
    })
  }
  return mapa
}

/** Fila persistida → `FilaSyncConDiff` (diff vs. expediente actual + nuevo ingreso). */
function conDiff(r: FilaSyncRow, snapshots: Map<string, SnapshotActualSync>): FilaSyncConDiff {
  const fila = mapFilaSync(r)
  const actual = snapshots.get(r.documento) ?? null
  const { diffs, esNuevoIngreso } = calcularDiffs(actual, fila)
  return { ...fila, diffs, esNuevoIngreso }
}

/** Arma la vista de previsualización completa del lote (con diffs por fila). */
export async function construirPrevisualizacion(
  lote: LoteRow,
  filas: FilaSyncRow[],
  erroresParseo: { numeroFila: number; motivo: string }[],
  ex: Ejecutor,
): Promise<LoteSyncPrevisualizacion> {
  const snapshots = await snapshotsPorDocumento(
    filas.map((f) => f.documento),
    ex,
  )
  return {
    id: lote.id,
    origen: lote.origen,
    estado: lote.estado,
    totalFilas: lote.totalFilas,
    filasConfirmadas: lote.filasConfirmadas,
    creadoPor: lote.creadoPor,
    idempotencyKey: lote.idempotencyKey,
    createdAt: lote.createdAt.toISOString(),
    filas: filas.map((f) => conDiff(f, snapshots)),
    erroresParseo,
  }
}
