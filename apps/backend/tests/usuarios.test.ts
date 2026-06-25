import { describe, it, expect, vi } from "vitest"
import { asignarRol } from "../src/application/usuarios/asignarRol"
import { cambiarEstadoUsuario } from "../src/application/usuarios/cambiarEstadoUsuario"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"

const SA = hacerUsuario({ rol: "SUPERADMIN", id: "sa" })

describe("asignarRol (solo SUPERADMIN + invariante)", () => {
  it("rechaza a quien no es SUPERADMIN → 403", async () => {
    const repo = { actualizarUsuario: vi.fn() } as any
    const uc = asignarRol({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), { usuarioId: "u2", rol: "AREA", areaId: "a1" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.actualizarUsuario).not.toHaveBeenCalled()
  })

  it("rechaza asignar AREA sin área (invariante) → 400", async () => {
    const repo = { actualizarUsuario: vi.fn() } as any
    const uc = asignarRol({ repo })
    await expect(
      uc(SA, { usuarioId: "u2", rol: "AREA", areaId: null }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.actualizarUsuario).not.toHaveBeenCalled()
  })

  it("asigna AREA con área y deja ACTIVO", async () => {
    const repo = {
      actualizarUsuario: vi.fn().mockResolvedValue(hacerUsuario({ rol: "AREA", areaId: "a1" })),
    } as any
    const uc = asignarRol({ repo })
    await uc(SA, { usuarioId: "u2", rol: "AREA", areaId: "a1" })
    expect(repo.actualizarUsuario).toHaveBeenCalledWith("u2", {
      rol: "AREA",
      areaId: "a1",
      estado: "ACTIVO",
    })
  })

  it("ignora el área para roles distintos de AREA (la fuerza a null)", async () => {
    const repo = {
      actualizarUsuario: vi.fn().mockResolvedValue(hacerUsuario({ rol: "TALENTO_HUMANO" })),
    } as any
    const uc = asignarRol({ repo })
    await uc(SA, { usuarioId: "u2", rol: "TALENTO_HUMANO", areaId: "a1" })
    expect(repo.actualizarUsuario).toHaveBeenCalledWith("u2", {
      rol: "TALENTO_HUMANO",
      areaId: null,
      estado: "ACTIVO",
    })
  })
})

describe("cambiarEstadoUsuario (solo SUPERADMIN + invariante)", () => {
  it("rechaza a quien no es SUPERADMIN → 403", async () => {
    const repo = { obtenerUsuarioPorId: vi.fn(), actualizarUsuario: vi.fn() } as any
    const uc = cambiarEstadoUsuario({ repo })
    await expect(
      uc(hacerUsuario({ rol: "AREA", areaId: "a1" }), { usuarioId: "u2", estado: "ACTIVO" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("404 si el usuario objetivo no existe", async () => {
    const repo = {
      obtenerUsuarioPorId: vi.fn().mockResolvedValue(null),
      actualizarUsuario: vi.fn(),
    } as any
    const uc = cambiarEstadoUsuario({ repo })
    await expect(
      uc(SA, { usuarioId: "u2", estado: "ACTIVO" }),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
  })

  it("rechaza ACTIVAR a un AREA sin área (invariante) → 400", async () => {
    const repo = {
      obtenerUsuarioPorId: vi
        .fn()
        .mockResolvedValue(hacerUsuario({ rol: "AREA", areaId: null, estado: "PENDIENTE" })),
      actualizarUsuario: vi.fn(),
    } as any
    const uc = cambiarEstadoUsuario({ repo })
    await expect(
      uc(SA, { usuarioId: "u2", estado: "ACTIVO" }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.actualizarUsuario).not.toHaveBeenCalled()
  })

  it("inactiva un usuario válido", async () => {
    const repo = {
      obtenerUsuarioPorId: vi
        .fn()
        .mockResolvedValue(hacerUsuario({ rol: "AREA", areaId: "a1", estado: "ACTIVO" })),
      actualizarUsuario: vi.fn().mockResolvedValue(hacerUsuario({ estado: "INACTIVO" })),
    } as any
    const uc = cambiarEstadoUsuario({ repo })
    await uc(SA, { usuarioId: "u2", estado: "INACTIVO" })
    expect(repo.actualizarUsuario).toHaveBeenCalledWith("u2", { estado: "INACTIVO" })
  })
})
