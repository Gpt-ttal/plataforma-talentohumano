import { describe, it, expect, vi } from "vitest"
import { listarFuncionarios } from "../src/application/funcionarios/listarFuncionarios"
import { obtenerDetalle } from "../src/application/funcionarios/obtenerDetalle"
import { obtenerMetricas } from "../src/application/funcionarios/obtenerMetricas"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../src/application/errors"
import { hacerFuncionario, hacerUsuario } from "./_fixtures"

const SUPERVISORES = ["SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO"] as const

describe("listarFuncionarios (catálogo de supervisión)", () => {
  it("rechaza a un usuario AREA → 403", async () => {
    const repo = { listarFuncionariosPaginado: vi.fn() } as any
    const uc = listarFuncionarios({ repo })
    await expect(
      uc(hacerUsuario({ rol: "AREA", areaId: "a1" })),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.listarFuncionariosPaginado).not.toHaveBeenCalled()
  })

  it.each(SUPERVISORES)("permite a %s y delega el filtro", async (rol) => {
    const pagina = { items: [], total: 0, pagina: 1, porPagina: 20, totalPaginas: 1 }
    const repo = { listarFuncionariosPaginado: vi.fn().mockResolvedValue(pagina) } as any
    const uc = listarFuncionarios({ repo })
    const r = await uc(hacerUsuario({ rol }), { q: "ana", pagina: 2 })
    expect(r).toBe(pagina)
    expect(repo.listarFuncionariosPaginado).toHaveBeenCalledWith({ q: "ana", pagina: 2 })
  })
})

describe("obtenerDetalle (catálogo de supervisión)", () => {
  it("rechaza a un usuario AREA → 403", async () => {
    const repo = { obtenerDetalle: vi.fn() } as any
    const uc = obtenerDetalle({ repo })
    await expect(
      uc(hacerUsuario({ rol: "AREA", areaId: "a1" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("404 si no existe", async () => {
    const repo = { obtenerDetalle: vi.fn().mockResolvedValue(null) } as any
    const uc = obtenerDetalle({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "f1"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
  })

  it("devuelve el detalle a un supervisor", async () => {
    const detalle = {
      funcionario: hacerFuncionario("PENDIENTE"),
      aprobaciones: [],
      observaciones: [],
    }
    const repo = { obtenerDetalle: vi.fn().mockResolvedValue(detalle) } as any
    const uc = obtenerDetalle({ repo })
    const r = await uc(hacerUsuario({ rol: "CONTROL_INTERNO" }), "f1")
    expect(r).toBe(detalle)
  })
})

describe("obtenerMetricas (plataforma: SUPERADMIN y TALENTO_HUMANO)", () => {
  it.each(["CONTROL_INTERNO", "AREA"] as const)(
    "rechaza a %s (rol acotado) → 403",
    async (rol) => {
      const repo = { obtenerMetricas: vi.fn() } as any
      const uc = obtenerMetricas({ repo })
      await expect(
        uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null })),
      ).rejects.toBeInstanceOf(ErrorAutorizacion)
      expect(repo.obtenerMetricas).not.toHaveBeenCalled()
    },
  )

  it.each(["SUPERADMIN", "TALENTO_HUMANO"] as const)(
    "permite a %s y delega en el repo",
    async (rol) => {
      const metricas = { totalFuncionarios: 0 } as any
      const repo = { obtenerMetricas: vi.fn().mockResolvedValue(metricas) } as any
      const uc = obtenerMetricas({ repo })
      expect(await uc(hacerUsuario({ rol }))).toBe(metricas)
    },
  )
})
