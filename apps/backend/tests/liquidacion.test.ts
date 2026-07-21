import { describe, it, expect, vi } from "vitest"
import { generarLiquidacion } from "../src/application/funcionarios/generarLiquidacion"
import { registrarLiquidacion } from "../src/application/funcionarios/registrarLiquidacion"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../src/application/errors"
import { hacerFuncionario, hacerUsuario } from "./_fixtures"

const detalleConEstado = (estado: any) => ({
  funcionario: hacerFuncionario(estado),
  aprobaciones: [],
  observaciones: [],
})

// Gestión de Desvinculaciones: guard invertido — CI valida (penúltimo hito,
// `generarLiquidacion`), TH cierra oficialmente (último hito, `registrarLiquidacion`).

describe("generarLiquidacion (Control Interno / SUPERADMIN + transición)", () => {
  it("rechaza a un usuario AREA → 403", async () => {
    const repo = { obtenerDetalle: vi.fn(), generarLiquidacion: vi.fn() } as any
    const uc = generarLiquidacion({ repo })
    await expect(uc(hacerUsuario({ rol: "AREA", areaId: "a1" }), "f1")).rejects.toBeInstanceOf(
      ErrorAutorizacion,
    )
    expect(repo.generarLiquidacion).not.toHaveBeenCalled()
  })

  it("rechaza a TALENTO_HUMANO → 403", async () => {
    const repo = { obtenerDetalle: vi.fn(), generarLiquidacion: vi.fn() } as any
    const uc = generarLiquidacion({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("404 si el funcionario no existe", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(null),
      generarLiquidacion: vi.fn(),
    } as any
    const uc = generarLiquidacion({ repo })
    await expect(
      uc(hacerUsuario({ rol: "CONTROL_INTERNO" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
  })

  it("rechaza la transición si no está LISTO_PARA_LIQUIDAR → 400", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleConEstado("PENDIENTE")),
      generarLiquidacion: vi.fn(),
    } as any
    const uc = generarLiquidacion({ repo })
    await expect(
      uc(hacerUsuario({ rol: "CONTROL_INTERNO" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.generarLiquidacion).not.toHaveBeenCalled()
  })

  it("genera si CI y estado LISTO_PARA_LIQUIDAR (autor = nombre)", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleConEstado("LISTO_PARA_LIQUIDAR")),
      generarLiquidacion: vi
        .fn()
        .mockResolvedValue({ estadoGlobal: "LIQUIDACION_GENERADA", hayRechazo: false, hayDevolucion: false }),
    } as any
    const uc = generarLiquidacion({ repo })
    const r = await uc(hacerUsuario({ rol: "CONTROL_INTERNO", nombre: "Bea CI" }), "f1")
    expect(r.estadoGlobal).toBe("LIQUIDACION_GENERADA")
    expect(repo.generarLiquidacion).toHaveBeenCalledWith("f1", "Bea CI")
  })
})

describe("registrarLiquidacion (Talento Humano / SUPERADMIN + transición)", () => {
  it("rechaza a CONTROL_INTERNO → 403", async () => {
    const repo = { obtenerDetalle: vi.fn(), registrarLiquidacion: vi.fn() } as any
    const uc = registrarLiquidacion({ repo })
    await expect(
      uc(hacerUsuario({ rol: "CONTROL_INTERNO" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.registrarLiquidacion).not.toHaveBeenCalled()
  })

  it("rechaza la transición si no está LIQUIDACION_GENERADA → 400", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleConEstado("LISTO_PARA_LIQUIDAR")),
      registrarLiquidacion: vi.fn(),
    } as any
    const uc = registrarLiquidacion({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.registrarLiquidacion).not.toHaveBeenCalled()
  })

  it("registra si TH y estado LIQUIDACION_GENERADA (autor = nombre)", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleConEstado("LIQUIDACION_GENERADA")),
      registrarLiquidacion: vi
        .fn()
        .mockResolvedValue({ estadoGlobal: "PAZ_Y_SALVO", hayRechazo: false, hayDevolucion: false }),
    } as any
    const uc = registrarLiquidacion({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO", nombre: "Ana TH" }), "f1")
    expect(r.estadoGlobal).toBe("PAZ_Y_SALVO")
    expect(repo.registrarLiquidacion).toHaveBeenCalledWith("f1", "Ana TH")
  })
})
