import { describe, it, expect, vi } from "vitest"
import { asignarRol } from "../src/application/usuarios/asignarRol"
import { cambiarEstadoUsuario } from "../src/application/usuarios/cambiarEstadoUsuario"
import { crearPreaprobado } from "../src/application/preaprobados/crearPreaprobado"
import { eliminarPreaprobado } from "../src/application/preaprobados/eliminarPreaprobado"
import { listarPreaprobados } from "../src/application/preaprobados/listarPreaprobados"
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

describe("allowlist de acceso (solo SUPERADMIN)", () => {
  it("listar/crear/eliminar rechazan a quien no es SUPERADMIN → 403", async () => {
    const repo = { listar: vi.fn(), crear: vi.fn(), eliminar: vi.fn() } as any
    const actor = hacerUsuario({ rol: "TALENTO_HUMANO" })
    await expect(listarPreaprobados({ repo })(actor)).rejects.toBeInstanceOf(
      ErrorAutorizacion,
    )
    await expect(
      crearPreaprobado({ repo })(actor, { email: "x@americana.edu.co", rol: "SST" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    await expect(
      eliminarPreaprobado({ repo })(actor, { email: "x@americana.edu.co" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crear).not.toHaveBeenCalled()
    expect(repo.eliminar).not.toHaveBeenCalled()
  })

  it("crear rechaza AREA sin área (invariante) → 400", async () => {
    const repo = { crear: vi.fn() } as any
    await expect(
      crearPreaprobado({ repo })(SA, { email: "a@americana.edu.co", rol: "AREA" }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.crear).not.toHaveBeenCalled()
  })

  it("crear rechaza un correo con formato inválido → 400 (sin tocar el repo)", async () => {
    const repo = { crear: vi.fn() } as any
    for (const email of ["no-es-correo", "sin-dominio@", "@sin-local.co", "espacio @x.co"]) {
      await expect(
        crearPreaprobado({ repo })(SA, { email, rol: "SST" }),
      ).rejects.toBeInstanceOf(ErrorValidacion)
    }
    expect(repo.crear).not.toHaveBeenCalled()
  })

  it("crear fuerza área a null para roles distintos de AREA y sella invitadoPor", async () => {
    const repo = {
      crear: vi.fn().mockImplementation(async (d: any) => ({ ...d, createdAt: "t" })),
    } as any
    await crearPreaprobado({ repo })(SA, {
      email: "th@americana.edu.co",
      rol: "TALENTO_HUMANO",
      areaId: "a1",
    })
    expect(repo.crear).toHaveBeenCalledWith({
      email: "th@americana.edu.co",
      rol: "TALENTO_HUMANO",
      areaId: null,
      estado: "ACTIVO",
      invitadoPor: "sa",
    })
  })
})
