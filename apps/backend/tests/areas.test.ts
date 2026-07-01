import { describe, it, expect, vi } from "vitest"
import { listarAreas } from "../src/application/areas/listarAreas"
import { crearArea } from "../src/application/areas/crearArea"
import { renombrarArea } from "../src/application/areas/renombrarArea"
import { moverArea } from "../src/application/areas/moverArea"
import { cambiarActivaArea } from "../src/application/areas/cambiarActivaArea"
import { ErrorAutorizacion } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"

const NO_SA = ["TALENTO_HUMANO", "CONTROL_INTERNO", "AREA"] as const
const UUID = "11111111-1111-4111-8111-111111111111"

describe("listarAreas (lectura de referencia + guarda admin)", () => {
  it("cualquier usuario activo lee las áreas activas (sin incluirInactivas)", async () => {
    const repo = { listarAreas: vi.fn().mockResolvedValue([]) } as any
    const uc = listarAreas({ repo })
    await uc(hacerUsuario({ rol: "AREA", areaId: "a1" }))
    expect(repo.listarAreas).toHaveBeenCalledWith(false)
  })

  it.each(NO_SA)("rechaza incluirInactivas a %s → 403", async (rol) => {
    const repo = { listarAreas: vi.fn() } as any
    const uc = listarAreas({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), { incluirInactivas: true }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.listarAreas).not.toHaveBeenCalled()
  })

  it("SUPERADMIN sí lista las inactivas", async () => {
    const repo = { listarAreas: vi.fn().mockResolvedValue([]) } as any
    const uc = listarAreas({ repo })
    await uc(hacerUsuario({ rol: "SUPERADMIN" }), { incluirInactivas: true })
    expect(repo.listarAreas).toHaveBeenCalledWith(true)
  })
})

describe("mutaciones del catálogo de áreas (solo SUPERADMIN)", () => {
  it.each(NO_SA)("crearArea rechaza a %s → 403", async (rol) => {
    const repo = { crearArea: vi.fn() } as any
    const uc = crearArea({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), { nombre: "Bienestar" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearArea).not.toHaveBeenCalled()
  })

  it.each(NO_SA)("renombrarArea rechaza a %s → 403", async (rol) => {
    const repo = { renombrarArea: vi.fn() } as any
    const uc = renombrarArea({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), { areaId: UUID, nombre: "X" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.renombrarArea).not.toHaveBeenCalled()
  })

  it.each(NO_SA)("moverArea rechaza a %s → 403", async (rol) => {
    const repo = { moverArea: vi.fn() } as any
    const uc = moverArea({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), { areaId: UUID, direccion: "subir" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.moverArea).not.toHaveBeenCalled()
  })

  it.each(NO_SA)("cambiarActivaArea rechaza a %s → 403", async (rol) => {
    const repo = { cambiarActivaArea: vi.fn() } as any
    const uc = cambiarActivaArea({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), { areaId: UUID, activa: false }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.cambiarActivaArea).not.toHaveBeenCalled()
  })

  it("SUPERADMIN puede crear y delega el nombre al repo", async () => {
    const lista = [{ id: UUID, nombre: "Bienestar", orden: 1, activa: true }]
    const repo = { crearArea: vi.fn().mockResolvedValue(lista) } as any
    const uc = crearArea({ repo })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), { nombre: "Bienestar" })
    expect(r).toBe(lista)
    expect(repo.crearArea).toHaveBeenCalledWith("Bienestar")
  })
})
