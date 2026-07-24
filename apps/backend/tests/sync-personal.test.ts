import { describe, it, expect, vi } from "vitest"
import type { FilaSync } from "@pys/shared"
import { ingestarLoteSync } from "../src/application/sync-personal/ingestarLoteSync"
import { obtenerLoteSync } from "../src/application/sync-personal/obtenerLoteSync"
import { confirmarSyncParcial } from "../src/application/sync-personal/confirmarSyncParcial"
import { parsearRegistrosIceberg } from "../src/infrastructure/sync/parsearRegistrosIceberg"
import {
  calcularDiffs,
  clasificarFilasSync,
  type SnapshotActualSync,
} from "../src/infrastructure/db/syncPersonal/diffSync"
import { ErrorAutorizacion, ErrorNoEncontrado, ErrorValidacion } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"

const NO_GESTOR = ["CONTROL_INTERNO", "AREA", "SST"] as const

const loteBase = {
  id: "l1",
  origen: "SERVICIO" as const,
  estado: "PREVISUALIZADO" as const,
  totalFilas: 1,
  filasConfirmadas: 0,
  creadoPor: "Usuario Prueba",
  idempotencyKey: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  filas: [],
  erroresParseo: [],
}

const REGISTRO = { documento: "1000", nombreCompleto: "Ana Pérez" }

describe("ingestarLoteSync (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { crearLoteConFilas: vi.fn() } as any
    const uc = ingestarLoteSync({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {
        registros: [REGISTRO],
        origen: "SERVICIO",
        idempotencyKey: null,
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearLoteConFilas).not.toHaveBeenCalled()
  })

  it("400 si el lote no contiene registros", async () => {
    const repo = { crearLoteConFilas: vi.fn() } as any
    const uc = ingestarLoteSync({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), {
        registros: [],
        origen: "MANUAL",
        idempotencyKey: null,
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
  })

  it("TALENTO_HUMANO normaliza (ACL) y delega en el repo", async () => {
    const repo = { crearLoteConFilas: vi.fn().mockResolvedValue(loteBase) } as any
    const uc = ingestarLoteSync({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO", nombre: "Laura TH" }), {
      registros: [{ documento: "1000", nombreCompleto: "Ana Pérez", sexo: "F" }],
      origen: "SERVICIO",
      idempotencyKey: "corrida-1",
    })
    expect(r).toBe(loteBase)
    const [origen, filas, errores, creadoPor, idem] = repo.crearLoteConFilas.mock.calls[0]
    expect(origen).toBe("SERVICIO")
    expect(errores).toEqual([])
    expect(creadoPor).toBe("Laura TH")
    expect(idem).toBe("corrida-1")
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ numeroFila: 1, documento: "1000", genero: "FEMENINO" })
  })
})

describe("obtenerLoteSync (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerLote: vi.fn() } as any
    const uc = obtenerLoteSync({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "l1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerLote).not.toHaveBeenCalled()
  })

  it("404 si el lote no existe", async () => {
    const repo = { obtenerLote: vi.fn().mockResolvedValue(null) } as any
    const uc = obtenerLoteSync({ repo })
    await expect(uc(hacerUsuario({ rol: "SUPERADMIN" }), "l1")).rejects.toBeInstanceOf(
      ErrorNoEncontrado,
    )
  })
})

describe("confirmarSyncParcial (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerLote: vi.fn(), confirmarParcial: vi.fn() } as any
    const uc = confirmarSyncParcial({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "l1", ["f1"]),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerLote).not.toHaveBeenCalled()
  })

  it("404 si el lote no existe", async () => {
    const repo = { obtenerLote: vi.fn().mockResolvedValue(null), confirmarParcial: vi.fn() } as any
    const uc = confirmarSyncParcial({ repo })
    await expect(uc(hacerUsuario({ rol: "SUPERADMIN" }), "l1", ["f1"])).rejects.toBeInstanceOf(
      ErrorNoEncontrado,
    )
    expect(repo.confirmarParcial).not.toHaveBeenCalled()
  })

  it("400 si el lote ya fue confirmado en su totalidad", async () => {
    const repo = {
      obtenerLote: vi.fn().mockResolvedValue({ ...loteBase, estado: "CONFIRMADO_TOTAL" }),
      confirmarParcial: vi.fn(),
    } as any
    const uc = confirmarSyncParcial({ repo })
    await expect(uc(hacerUsuario({ rol: "SUPERADMIN" }), "l1", ["f1"])).rejects.toBeInstanceOf(
      ErrorValidacion,
    )
    expect(repo.confirmarParcial).not.toHaveBeenCalled()
  })

  it("TALENTO_HUMANO confirma y delega en el repo", async () => {
    const resultado = { lote: loteBase, confirmadas: 1, fallidas: [] }
    const repo = {
      obtenerLote: vi.fn().mockResolvedValue(loteBase),
      confirmarParcial: vi.fn().mockResolvedValue(resultado),
    } as any
    const uc = confirmarSyncParcial({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO", nombre: "Laura TH" }), "l1", ["f1"])
    expect(r).toBe(resultado)
    expect(repo.confirmarParcial).toHaveBeenCalledWith("l1", ["f1"], "Laura TH")
  })
})

describe("parsearRegistrosIceberg (ACL pura)", () => {
  it("registro sin documento va a errores, no a filas", () => {
    const { filas, errores } = parsearRegistrosIceberg([
      { documento: "", nombreCompleto: "Sin Cédula" } as any,
    ])
    expect(filas).toHaveLength(0)
    expect(errores).toEqual([{ numeroFila: 1, motivo: "Registro sin documento." }])
  })

  it("normaliza enums, fechas y montos crudos de Iceberg", () => {
    const { filas } = parsearRegistrosIceberg([
      {
        documento: "1000",
        nombreCompleto: "Ana Pérez",
        sexo: "M",
        tipoDocumento: "Cédula de ciudadanía",
        estadoCivil: "Soltero(a)",
        tipoEmpleado: "Docente",
        tipoContrato: "Término fijo",
        fechaNacimiento: "15/03/1990",
        salario: "2.500.000",
        personasACargo: "2",
      },
    ])
    expect(filas[0]).toMatchObject({
      genero: "MASCULINO",
      tipoDocumento: "CC",
      estadoCivil: "SOLTERO",
      tipoEmpleado: "DOCENTE",
      tipoContrato: "TERMINO_FIJO",
      fechaNacimiento: "1990-03-15",
      salario: 2500000,
      personasACargo: 2,
    })
  })

  it("best-effort: un enum desconocido queda null sin descartar la fila", () => {
    const { filas, errores } = parsearRegistrosIceberg([
      { documento: "1000", nombreCompleto: "Ana", sexo: "no-sé" } as any,
    ])
    expect(errores).toHaveLength(0)
    expect(filas[0]).toMatchObject({ documento: "1000", genero: null })
  })
})

// ── Lógica pura de reparto/diff (sin BD) ─────────────────────────────────────

function hacerFila(p: Partial<FilaSync>): FilaSync {
  return {
    id: "f1",
    numeroFila: 1,
    documento: "1000",
    nombreCompleto: "Ana Pérez",
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
    estado: "VALIDA",
    mensajeError: null,
    funcionarioId: null,
    ...p,
  }
}

describe("clasificarFilasSync (pura)", () => {
  it("marca DUPLICADA cada fila cuyo documento se repite en el lote; el resto VALIDA", () => {
    const r = clasificarFilasSync(["1", "2", "1"])
    expect(r.map((x) => x.estado)).toEqual(["DUPLICADA", "VALIDA", "DUPLICADA"])
    expect(r[0].mensajeError).toMatch(/repetido/i)
    expect(r[1].mensajeError).toBeNull()
  })

  it("un documento inexistente NO es error (el sync UPSERTEA): queda VALIDA", () => {
    const r = clasificarFilasSync(["99"])
    expect(r).toEqual([{ estado: "VALIDA", mensajeError: null }])
  })
})

describe("calcularDiffs (pura)", () => {
  it("sin expediente actual → esNuevoIngreso y toda columna entrante es CREA", () => {
    const { diffs, esNuevoIngreso } = calcularDiffs(
      null,
      hacerFila({ cargo: "Analista", salario: 2500000 }),
    )
    expect(esNuevoIngreso).toBe(true)
    expect(diffs.find((d) => d.campo === "cargo")).toMatchObject({
      actual: null,
      entrante: "Analista",
      accion: "CREA",
    })
    expect(diffs.find((d) => d.campo === "salario")).toMatchObject({
      entrante: "2.500.000",
      accion: "CREA",
    })
  })

  it("valor entrante distinto del actual → ACTUALIZA (muestra ambos formateados)", () => {
    const actual: SnapshotActualSync = { cargo: "Auxiliar" }
    const { diffs, esNuevoIngreso } = calcularDiffs(actual, hacerFila({ cargo: "Analista" }))
    expect(esNuevoIngreso).toBe(false)
    expect(diffs.find((d) => d.campo === "cargo")).toMatchObject({
      actual: "Auxiliar",
      entrante: "Analista",
      accion: "ACTUALIZA",
    })
  })

  it("valor entrante igual al actual → SIN_CAMBIO", () => {
    const { diffs } = calcularDiffs({ cargo: "Analista" }, hacerFila({ cargo: "Analista" }))
    expect(diffs.find((d) => d.campo === "cargo")?.accion).toBe("SIN_CAMBIO")
  })

  it("una columna que Iceberg no trae (null) no genera fila de diff", () => {
    const { diffs } = calcularDiffs({ cargo: "Auxiliar" }, hacerFila({}))
    expect(diffs.find((d) => d.campo === "cargo")).toBeUndefined()
  })

  it("el documento (identidad) nunca es una fila de diff", () => {
    const { diffs } = calcularDiffs(null, hacerFila({ cargo: "Analista" }))
    expect(diffs.find((d) => d.campo === "documento")).toBeUndefined()
  })
})
