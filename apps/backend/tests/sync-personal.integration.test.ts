import { afterEach, describe, expect, it } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db } from "../src/infrastructure/db/client"
import {
  empleadoSalarial,
  eventosAuditoria,
  filasSyncPersonal,
  funcionarios,
  lotesSyncPersonal,
} from "../src/infrastructure/db/schema"
import { syncPersonalRepository as repo } from "../src/infrastructure/db/syncPersonalRepository"
import type { RegistroSyncNormalizado } from "../src/domain/ports/SyncPersonalRepo"

/**
 * Integración del sync de personal contra un Postgres de test con la migración
 * 0019 aplicada. Gated por DATABASE_URL_TEST (mismo molde que
 * `crearEmpleado.integration.test.ts`): se salta si no hay BD de test.
 *
 * Cubre lo que la capa pura/unit no puede: upsert por documento (crea + actualiza),
 * auditoría de sobrescritura divergente, tolerancia a fallos parciales e
 * idempotencia por `idempotency_key`.
 */
const DB = process.env.DATABASE_URL_TEST

function hacerRegistro(
  numeroFila: number,
  documento: string,
  p: Partial<RegistroSyncNormalizado> = {},
): RegistroSyncNormalizado {
  return {
    numeroFila,
    documento,
    nombreCompleto: "Sync Integración",
    genero: null,
    tipoDocumento: null,
    fechaExpedicion: null,
    nacionalidad: null,
    fechaNacimiento: null,
    lugarResidencia: null,
    direccion: null,
    telefono: null,
    barrio: null,
    estadoCivil: null,
    personasACargo: null,
    correo: null,
    cargo: null,
    estadoContrato: null,
    centroCostos: null,
    fondoSede: null,
    fechaIngreso: null,
    fechaFinContrato: null,
    dependencia: null,
    tipoEmpleado: null,
    tipoContrato: null,
    categoria: null,
    salario: null,
    eps: null,
    fondoPensionCesantias: null,
    certificadoBancario: null,
    ...p,
  }
}

const documentosCreados = new Set<string>()
const lotesCreados = new Set<string>()

function doc(): string {
  const d = `SYNC-INT-${crypto.randomUUID()}`
  documentosCreados.add(d)
  return d
}

describe.skipIf(!DB)("sync de personal — reparto al expediente (integración)", () => {
  afterEach(async () => {
    if (documentosCreados.size > 0) {
      const docs = [...documentosCreados]
      const funcs = await db
        .select({ id: funcionarios.id })
        .from(funcionarios)
        .where(inArray(funcionarios.documento, docs))
      const ids = funcs.map((f) => f.id)
      if (ids.length > 0) {
        await db.delete(eventosAuditoria).where(inArray(eventosAuditoria.entidadId, ids))
        await db.delete(funcionarios).where(inArray(funcionarios.id, ids)) // satélites: cascade
      }
      documentosCreados.clear()
    }
    if (lotesCreados.size > 0) {
      await db.delete(lotesSyncPersonal).where(inArray(lotesSyncPersonal.id, [...lotesCreados])) // filas: cascade
      lotesCreados.clear()
    }
  })

  it("documento inexistente → alta de empleado nuevo (upsert crea)", async () => {
    const d = doc()
    const lote = await repo.crearLoteConFilas(
      "SERVICIO",
      [hacerRegistro(1, d, { cargo: "Analista", salario: 2500000 })],
      [],
      "Test",
      null,
    )
    lotesCreados.add(lote.id)
    const fila = lote.filas[0]!
    expect(fila.estado).toBe("VALIDA")
    expect(fila.esNuevoIngreso).toBe(true)

    const res = await repo.confirmarParcial(lote.id, [fila.id], "Laura TH")
    expect(res.confirmadas).toBe(1)
    expect(res.fallidas).toEqual([])

    const [creado] = await db.select().from(funcionarios).where(eq(funcionarios.documento, d))
    expect(creado?.cargo).toBe("Analista")
    const [sal] = await db
      .select()
      .from(empleadoSalarial)
      .where(eq(empleadoSalarial.funcionarioId, creado!.id))
    expect(Number(sal?.salarioBasico)).toBe(2500000)
  })

  it("documento existente → actualiza y audita la sobrescritura divergente", async () => {
    const d = doc()
    const [existente] = await db
      .insert(funcionarios)
      .values({ documento: d, nombreCompleto: "Sync Integración", cargo: "Auxiliar", areaOrigen: "X" })
      .returning({ id: funcionarios.id })

    const lote = await repo.crearLoteConFilas(
      "MANUAL",
      [hacerRegistro(1, d, { cargo: "Analista" })],
      [],
      "Test",
      null,
    )
    lotesCreados.add(lote.id)
    expect(lote.filas[0]!.esNuevoIngreso).toBe(false)

    await repo.confirmarParcial(lote.id, [lote.filas[0]!.id], "Laura TH")

    const [actualizado] = await db.select().from(funcionarios).where(eq(funcionarios.id, existente!.id))
    expect(actualizado?.cargo).toBe("Analista")

    const eventos = await db
      .select()
      .from(eventosAuditoria)
      .where(eq(eventosAuditoria.entidadId, existente!.id))
    const sync = eventos.find((e) => e.accion === "SYNC_ACTUALIZAR_EMPLEADO")
    expect(sync, "debe registrar el evento de sobrescritura").toBeTruthy()
    expect(JSON.stringify(sync?.estadoNuevo)).toContain("cargo")
  })

  it("audita la sobrescritura del fondo pensión/cesantías con la clave canónica del diff", async () => {
    // Regresión: el evento de auditoría debe usar la clave del diff
    // (`fondoPensionCesantias`, la de `CAMPOS_DIFF`), NO el nombre de la columna
    // destino (`fondoCesantias`) — si no, la vista previa y la bitácora divergen.
    const d = doc()
    const [existente] = await db
      .insert(funcionarios)
      .values({ documento: d, nombreCompleto: "Sync Integración", cargo: "Auxiliar", areaOrigen: "X" })
      .returning({ id: funcionarios.id })
    await db.insert(empleadoSalarial).values({ funcionarioId: existente!.id, fondoCesantias: "Porvenir" })

    const lote = await repo.crearLoteConFilas(
      "MANUAL",
      [hacerRegistro(1, d, { fondoPensionCesantias: "Colfondos" })],
      [],
      "Test",
      null,
    )
    lotesCreados.add(lote.id)

    await repo.confirmarParcial(lote.id, [lote.filas[0]!.id], "Laura TH")

    const eventos = await db
      .select()
      .from(eventosAuditoria)
      .where(eq(eventosAuditoria.entidadId, existente!.id))
    const sync = eventos.find((e) => e.accion === "SYNC_ACTUALIZAR_EMPLEADO")
    expect(sync, "debe registrar el evento de sobrescritura del fondo").toBeTruthy()
    const claves = Object.keys(sync?.estadoNuevo as Record<string, unknown>)
    expect(claves).toContain("fondoPensionCesantias")
    expect(claves).not.toContain("fondoCesantias")
  })

  it("fallo parcial: una fila inválida no aborta el lote; la válida se confirma", async () => {
    const dA = doc()
    const dB = doc()
    // dA repetido → ambas DUPLICADA; dB único → VALIDA.
    const lote = await repo.crearLoteConFilas(
      "SERVICIO",
      [hacerRegistro(1, dA), hacerRegistro(2, dA), hacerRegistro(3, dB, { cargo: "Analista" })],
      [],
      "Test",
      null,
    )
    lotesCreados.add(lote.id)
    const ids = lote.filas.map((f) => f.id)

    const res = await repo.confirmarParcial(lote.id, ids, "Laura TH")
    expect(res.confirmadas).toBe(1)
    expect(res.fallidas).toHaveLength(2)

    const [creadoB] = await db.select().from(funcionarios).where(eq(funcionarios.documento, dB))
    expect(creadoB?.cargo).toBe("Analista")
  })

  it("idempotencia: reenviar la misma idempotencyKey devuelve el lote existente", async () => {
    const d = doc()
    const key = `corrida-${crypto.randomUUID()}`
    const reg = [hacerRegistro(1, d, { cargo: "Analista" })]

    const lote1 = await repo.crearLoteConFilas("SERVICIO", reg, [], "Test", key)
    lotesCreados.add(lote1.id)
    const lote2 = await repo.crearLoteConFilas("SERVICIO", reg, [], "Test", key)

    expect(lote2.id).toBe(lote1.id)
    const todos = await db
      .select({ id: lotesSyncPersonal.id })
      .from(lotesSyncPersonal)
      .where(eq(lotesSyncPersonal.idempotencyKey, key))
    expect(todos).toHaveLength(1)
  })
})
