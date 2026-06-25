import { describe, it, expect, vi } from "vitest"
import { listarGestionArea } from "../src/application/miarea/listarGestionArea"
import { ErrorAutorizacion } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"

const paginaVacia = { items: [], total: 0, pagina: 1, porPagina: 20, totalPaginas: 1 }

describe("listarGestionArea (cola de trabajo de un área)", () => {
  it("rechaza a TALENTO_HUMANO (no gestiona colas de área) → 403", async () => {
    const repo = { listarGestionAreaPaginado: vi.fn() } as any
    const uc = listarGestionArea({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "a1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.listarGestionAreaPaginado).not.toHaveBeenCalled()
  })

  it("rechaza a un AREA que pide una cola que no es la suya → 403", async () => {
    const repo = { listarGestionAreaPaginado: vi.fn() } as any
    const uc = listarGestionArea({ repo })
    await expect(
      uc(hacerUsuario({ rol: "AREA", areaId: "a1" }), "OTRA"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.listarGestionAreaPaginado).not.toHaveBeenCalled()
  })

  it("permite a un AREA su propia cola y delega", async () => {
    const repo = {
      listarGestionAreaPaginado: vi.fn().mockResolvedValue(paginaVacia),
    } as any
    const uc = listarGestionArea({ repo })
    const r = await uc(hacerUsuario({ rol: "AREA", areaId: "a1" }), "a1", { pagina: 3 })
    expect(r).toBe(paginaVacia)
    expect(repo.listarGestionAreaPaginado).toHaveBeenCalledWith("a1", { pagina: 3 })
  })

  it("permite al SUPERADMIN cualquier cola", async () => {
    const repo = {
      listarGestionAreaPaginado: vi.fn().mockResolvedValue(paginaVacia),
    } as any
    const uc = listarGestionArea({ repo })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), "cualquiera")
    expect(r).toBe(paginaVacia)
  })
})
