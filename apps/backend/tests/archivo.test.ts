import { describe, it, expect, vi } from "vitest"
import { listarArchivo } from "../src/application/archivo/listarArchivo"
import { obtenerExpediente } from "../src/application/archivo/obtenerExpediente"
import { exportarArchivo } from "../src/application/archivo/exportarArchivo"
import { archivarCaso } from "../src/application/funcionarios/archivarCaso"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../src/application/errors"
import { hacerFuncionario, hacerUsuario } from "./_fixtures"

// El archivo es de la plataforma de gestión: SA + TH lo ven; CI y AREA no.
const PERMITIDOS = ["SUPERADMIN", "TALENTO_HUMANO"] as const
const VETADOS = ["CONTROL_INTERNO", "AREA"] as const

const paginaVacia = { items: [], total: 0, pagina: 1, porPagina: 10, totalPaginas: 1 }

describe("listarArchivo (plataforma: SUPERADMIN y TALENTO_HUMANO)", () => {
  it.each(VETADOS)("rechaza a %s → 403", async (rol) => {
    const repo = { listarArchivo: vi.fn() } as any
    const uc = listarArchivo({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null })),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.listarArchivo).not.toHaveBeenCalled()
  })

  it.each(PERMITIDOS)("permite a %s y delega el filtro", async (rol) => {
    const repo = { listarArchivo: vi.fn().mockResolvedValue(paginaVacia) } as any
    const uc = listarArchivo({ repo })
    const r = await uc(hacerUsuario({ rol }), { q: "ana", retiroDesde: "2026-01-01" })
    expect(r).toBe(paginaVacia)
    expect(repo.listarArchivo).toHaveBeenCalledWith({ q: "ana", retiroDesde: "2026-01-01" })
  })
})

describe("obtenerExpediente (plataforma: SUPERADMIN y TALENTO_HUMANO)", () => {
  it.each(VETADOS)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerDetalle: vi.fn() } as any
    const uc = obtenerExpediente({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "f1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerDetalle).not.toHaveBeenCalled()
  })

  it("404 si el funcionario no existe", async () => {
    const repo = { obtenerDetalle: vi.fn().mockResolvedValue(null) } as any
    const uc = obtenerExpediente({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
  })

  it("devuelve el expediente a la plataforma", async () => {
    const detalle = {
      funcionario: hacerFuncionario("PAZ_Y_SALVO"),
      aprobaciones: [],
      observaciones: [],
    }
    const repo = { obtenerDetalle: vi.fn().mockResolvedValue(detalle) } as any
    const uc = obtenerExpediente({ repo })
    expect(await uc(hacerUsuario({ rol: "SUPERADMIN" }), "f1")).toBe(detalle)
  })
})

describe("exportarArchivo (plataforma: SUPERADMIN y TALENTO_HUMANO)", () => {
  it.each(VETADOS)("rechaza a %s → 403", async (rol) => {
    const repo = { listarArchivo: vi.fn() } as any
    const uc = exportarArchivo({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null })),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.listarArchivo).not.toHaveBeenCalled()
  })

  it("serializa TODO el conjunto filtrado a CSV (no solo una página)", async () => {
    const finalizado = hacerFuncionario("PAZ_Y_SALVO", {
      documento: "777",
      nombreCompleto: "Cierre Total",
      fechaRetiro: "2026-01-10",
      fechaLiquidacion: "2026-01-20T16:30:00.000Z",
      liquidadoPor: "Control Interno",
    })
    // 1ª llamada: cabeza (total). 2ª: todas las filas con porPagina = total.
    const repo = {
      listarArchivo: vi
        .fn()
        .mockResolvedValueOnce({ ...paginaVacia, total: 1 })
        .mockResolvedValueOnce({ items: [finalizado], total: 1, pagina: 1, porPagina: 1, totalPaginas: 1 }),
    } as any
    const uc = exportarArchivo({ repo })
    const csv = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), { q: "cierre" })

    expect(csv).toContain("Documento")
    expect(csv).toContain("777")
    expect(csv).toContain("Cierre Total")
    expect(csv).toContain("10") // días de trámite
    // La 2ª lectura pide todas las filas (porPagina = total).
    expect(repo.listarArchivo).toHaveBeenLastCalledWith({
      q: "cierre",
      pagina: 1,
      porPagina: 1,
    })
  })
})

describe("archivarCaso (plataforma: SUPERADMIN y TALENTO_HUMANO)", () => {
  it.each(VETADOS)("rechaza a %s → 403", async (rol) => {
    const repo = { archivarCaso: vi.fn() } as any
    const uc = archivarCaso({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "f1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.archivarCaso).not.toHaveBeenCalled()
  })

  it("404 si el funcionario no existe", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(null),
      archivarCaso: vi.fn(),
    } as any
    const uc = archivarCaso({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.archivarCaso).not.toHaveBeenCalled()
  })

  it("400 si el trámite no está en PAZ_Y_SALVO", async () => {
    const repo = {
      obtenerDetalle: vi
        .fn()
        .mockResolvedValue({ funcionario: hacerFuncionario("LISTO_PARA_LIQUIDAR"), aprobaciones: [], observaciones: [] }),
      archivarCaso: vi.fn(),
    } as any
    const uc = archivarCaso({ repo })
    await expect(
      uc(hacerUsuario({ rol: "SUPERADMIN" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.archivarCaso).not.toHaveBeenCalled()
  })

  it("archiva el trámite cerrado y pasa el autor (nombre)", async () => {
    const repo = {
      obtenerDetalle: vi
        .fn()
        .mockResolvedValue({ funcionario: hacerFuncionario("PAZ_Y_SALVO"), aprobaciones: [], observaciones: [] }),
      archivarCaso: vi.fn().mockResolvedValue({ archivadoEn: "2026-07-08T00:00:00.000Z" }),
    } as any
    const uc = archivarCaso({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO", nombre: "Talento Humano" }), "f1")
    expect(r.archivadoEn).toBe("2026-07-08T00:00:00.000Z")
    expect(repo.archivarCaso).toHaveBeenCalledWith("f1", "Talento Humano")
  })
})
