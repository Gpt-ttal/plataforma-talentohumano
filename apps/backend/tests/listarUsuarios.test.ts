import { describe, it, expect, vi } from "vitest"
import { listarUsuarios } from "../src/application/usuarios/listarUsuarios"
import { ErrorAutorizacion } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"

const paginaVacia = { items: [], total: 0, pagina: 1, porPagina: 20, totalPaginas: 1 }

describe("listarUsuarios (solo SUPERADMIN)", () => {
  it.each(["AREA", "TALENTO_HUMANO", "CONTROL_INTERNO"] as const)(
    "rechaza a %s → 403",
    async (rol) => {
      const repo = { listarUsuarios: vi.fn() } as any
      const uc = listarUsuarios({ repo })
      await expect(
        uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null })),
      ).rejects.toBeInstanceOf(ErrorAutorizacion)
      expect(repo.listarUsuarios).not.toHaveBeenCalled()
    },
  )

  it("permite al SUPERADMIN y delega la paginación", async () => {
    const repo = { listarUsuarios: vi.fn().mockResolvedValue(paginaVacia) } as any
    const uc = listarUsuarios({ repo })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), { pagina: 2 })
    expect(r).toBe(paginaVacia)
    expect(repo.listarUsuarios).toHaveBeenCalledWith({ pagina: 2 })
  })
})
