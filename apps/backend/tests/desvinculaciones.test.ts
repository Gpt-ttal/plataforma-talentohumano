import { describe, it, expect, vi } from "vitest"
import * as XLSX from "xlsx"
import { previsualizarImportacionDesvinculaciones } from "../src/application/desvinculaciones/previsualizarImportacionDesvinculaciones"
import { confirmarImportacionParcial } from "../src/application/desvinculaciones/confirmarImportacionParcial"
import { parsearArchivoDesvinculaciones } from "../src/infrastructure/importacion/parsearArchivoDesvinculaciones"
import { ErrorAutorizacion, ErrorNoEncontrado, ErrorValidacion } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"

const NO_GESTOR = ["CONTROL_INTERNO", "AREA", "SST"] as const

const loteBase = {
  id: "l1",
  nombreArchivo: "desvinculaciones.xlsx",
  estado: "PREVISUALIZADO" as const,
  totalFilas: 1,
  filasConfirmadas: 0,
  creadoPor: "Usuario Prueba",
  createdAt: "2026-01-01T00:00:00.000Z",
  filas: [],
  erroresParseo: [],
}

function bufferXlsx(filas: Record<string, unknown>[]): Buffer {
  const hoja = XLSX.utils.json_to_sheet(filas)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, "Hoja1")
  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer
}

describe("previsualizarImportacionDesvinculaciones (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { crearLoteConFilas: vi.fn() } as any
    const uc = previsualizarImportacionDesvinculaciones({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {
        nombreArchivo: "x.xlsx",
        buffer: bufferXlsx([]),
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearLoteConFilas).not.toHaveBeenCalled()
  })

  it("400 si el archivo está vacío (sin filas ni errores de parseo)", async () => {
    const repo = { crearLoteConFilas: vi.fn() } as any
    const uc = previsualizarImportacionDesvinculaciones({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), {
        nombreArchivo: "x.xlsx",
        buffer: bufferXlsx([]),
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
  })

  it("TALENTO_HUMANO parsea y delega en el repo", async () => {
    const repo = { crearLoteConFilas: vi.fn().mockResolvedValue(loteBase) } as any
    const uc = previsualizarImportacionDesvinculaciones({ repo })
    const buffer = bufferXlsx([
      { Documento: "1000", "Nombre Completo": "Ana Pérez", "Fecha Retiro": "2026-03-01" },
    ])
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO", nombre: "Laura TH" }), {
      nombreArchivo: "lote.xlsx",
      buffer,
    })
    expect(r).toBe(loteBase)
    expect(repo.crearLoteConFilas).toHaveBeenCalledWith(
      "lote.xlsx",
      [
        {
          numeroFila: 2,
          documento: "1000",
          nombreCompleto: "Ana Pérez",
          fechaRetiro: "2026-03-01",
          cargo: null,
        },
      ],
      [],
      "Laura TH",
    )
  })
})

describe("confirmarImportacionParcial (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerLote: vi.fn(), confirmarParcial: vi.fn() } as any
    const uc = confirmarImportacionParcial({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "l1", ["f1"]),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerLote).not.toHaveBeenCalled()
  })

  it("404 si el lote no existe", async () => {
    const repo = { obtenerLote: vi.fn().mockResolvedValue(null), confirmarParcial: vi.fn() } as any
    const uc = confirmarImportacionParcial({ repo })
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
    const uc = confirmarImportacionParcial({ repo })
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
    const uc = confirmarImportacionParcial({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO", nombre: "Laura TH" }), "l1", ["f1"])
    expect(r).toBe(resultado)
    expect(repo.confirmarParcial).toHaveBeenCalledWith("l1", ["f1"], "Laura TH")
  })
})

describe("parsearArchivoDesvinculaciones", () => {
  it("fila sin documento va a errores, no a filas", () => {
    const buffer = bufferXlsx([
      { Documento: "", "Nombre Completo": "Sin Cédula", "Fecha Retiro": "2026-03-01" },
    ])
    const { filas, errores } = parsearArchivoDesvinculaciones(buffer)
    expect(filas).toHaveLength(0)
    expect(errores).toEqual([{ numeroFila: 2, motivo: "Fila sin documento." }])
  })

  it("caso feliz: documento, nombre y fecha reconocidos", () => {
    const buffer = bufferXlsx([
      { Documento: "2000", "Nombre Completo": "Carlos Ruiz", "Fecha Retiro": "2026-04-15", Cargo: "Auxiliar" },
    ])
    const { filas, errores } = parsearArchivoDesvinculaciones(buffer)
    expect(errores).toHaveLength(0)
    expect(filas).toEqual([
      {
        numeroFila: 2,
        documento: "2000",
        nombreCompleto: "Carlos Ruiz",
        fechaRetiro: "2026-04-15",
        cargo: "Auxiliar",
      },
    ])
  })

  it("dos filas con el mismo documento se parsean ambas (la deduplicación es responsabilidad del repo)", () => {
    const buffer = bufferXlsx([
      { Documento: "3000", "Nombre Completo": "Uno", "Fecha Retiro": "2026-01-01" },
      { Documento: "3000", "Nombre Completo": "Dos", "Fecha Retiro": "2026-01-02" },
    ])
    const { filas, errores } = parsearArchivoDesvinculaciones(buffer)
    expect(errores).toHaveLength(0)
    expect(filas.map((f) => f.documento)).toEqual(["3000", "3000"])
  })
})
