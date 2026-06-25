import { describe, it, expect, vi } from "vitest"
import { asegurarUsuario } from "../src/application/auth/asegurarUsuario"
import { hacerUsuario } from "./_fixtures"

const deps = (repo: any) =>
  asegurarUsuario({
    repo,
    superadminEmail: "leonardoreales@americana.edu.co",
    dominioPermitido: "americana.edu.co",
  })

describe("asegurarUsuario (autoregistro)", () => {
  it("devuelve el usuario existente sin crear nada", async () => {
    const existente = hacerUsuario({ id: "uid-1" })
    const repo = {
      obtenerUsuarioPorId: vi.fn().mockResolvedValue(existente),
      crearUsuario: vi.fn(),
    } as any
    const r = await deps(repo)("uid-1", "x@americana.edu.co", "X")
    expect(r).toEqual({ ok: true, usuario: existente })
    expect(repo.crearUsuario).not.toHaveBeenCalled()
  })

  it("rechaza un correo fuera del dominio institucional", async () => {
    const repo = {
      obtenerUsuarioPorId: vi.fn().mockResolvedValue(null),
      crearUsuario: vi.fn(),
    } as any
    const r = await deps(repo)("uid-2", "ajeno@gmail.com", "Ajeno")
    expect(r.ok).toBe(false)
    expect(repo.crearUsuario).not.toHaveBeenCalled()
  })

  it("autoregistra un correo del dominio como AREA/PENDIENTE (sin área)", async () => {
    const repo = {
      obtenerUsuarioPorId: vi.fn().mockResolvedValue(null),
      crearUsuario: vi.fn().mockImplementation(async (datos: any) => hacerUsuario(datos)),
    } as any
    const r = await deps(repo)("uid-3", "Nuevo@Americana.edu.co", "  Nuevo  ")
    expect(r.ok).toBe(true)
    expect(repo.crearUsuario).toHaveBeenCalledWith({
      id: "uid-3",
      email: "nuevo@americana.edu.co",
      nombre: "Nuevo",
      rol: "AREA",
      areaId: null,
      estado: "PENDIENTE",
    })
  })

  it("autoregistra al superadmin como SUPERADMIN/ACTIVO", async () => {
    const repo = {
      obtenerUsuarioPorId: vi.fn().mockResolvedValue(null),
      crearUsuario: vi.fn().mockImplementation(async (datos: any) => hacerUsuario(datos)),
    } as any
    const r = await deps(repo)("uid-sa", "leonardoreales@americana.edu.co", "Leo")
    expect(r.ok).toBe(true)
    expect(repo.crearUsuario).toHaveBeenCalledWith(
      expect.objectContaining({ rol: "SUPERADMIN", estado: "ACTIVO", areaId: null }),
    )
  })

  it("usa el email normalizado como nombre cuando el nombre viene vacío", async () => {
    const repo = {
      obtenerUsuarioPorId: vi.fn().mockResolvedValue(null),
      crearUsuario: vi.fn().mockImplementation(async (datos: any) => hacerUsuario(datos)),
    } as any
    await deps(repo)("uid-4", "Persona@americana.edu.co", "   ")
    expect(repo.crearUsuario).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "persona@americana.edu.co" }),
    )
  })
})
