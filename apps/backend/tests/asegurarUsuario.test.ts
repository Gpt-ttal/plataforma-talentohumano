import { describe, it, expect, vi } from "vitest"
import { asegurarUsuario } from "../src/application/auth/asegurarUsuario"
import { hacerUsuario } from "./_fixtures"

/** Repo de usuarios mock: no existe nadie salvo lo que se configure. */
function repoVacio() {
  return {
    obtenerUsuarioPorId: vi.fn().mockResolvedValue(null),
    crearUsuario: vi.fn().mockImplementation(async (datos: any) => hacerUsuario(datos)),
  } as any
}

/** preRepo mock cuya consulta devuelve un resultado fijo. */
function prePresente(preaprobacion: any = null) {
  return {
    buscarPorEmail: vi.fn().mockResolvedValue({ tabla: "presente", preaprobacion }),
    listar: vi.fn(),
    crear: vi.fn(),
    eliminar: vi.fn(),
  } as any
}

function preAusente() {
  return {
    buscarPorEmail: vi.fn().mockResolvedValue({ tabla: "ausente" }),
    listar: vi.fn(),
    crear: vi.fn(),
    eliminar: vi.fn(),
  } as any
}

const construir = (repo: any, preRepo: any) =>
  asegurarUsuario({
    repo,
    preRepo,
    superadminEmail: "leonardoreales@americana.edu.co",
    dominioPermitido: "americana.edu.co",
  })

describe("asegurarUsuario — allowlist (pre-aprobación por correo)", () => {
  it("devuelve el usuario existente sin mirar la allowlist", async () => {
    const existente = hacerUsuario({ id: "uid-1" })
    const repo = {
      obtenerUsuarioPorId: vi.fn().mockResolvedValue(existente),
      crearUsuario: vi.fn(),
    } as any
    const preRepo = prePresente()
    const r = await construir(repo, preRepo)("uid-1", "x@americana.edu.co", "X")
    expect(r).toEqual({ ok: true, usuario: existente })
    expect(repo.crearUsuario).not.toHaveBeenCalled()
    expect(preRepo.buscarPorEmail).not.toHaveBeenCalled()
  })

  it("el superadmin de bootstrap entra aunque no esté en la allowlist", async () => {
    const repo = repoVacio()
    const preRepo = prePresente(null)
    const r = await construir(repo, preRepo)(
      "uid-sa",
      "leonardoreales@americana.edu.co",
      "Leo",
    )
    expect(r.ok).toBe(true)
    expect(repo.crearUsuario).toHaveBeenCalledWith(
      expect.objectContaining({ rol: "SUPERADMIN", estado: "ACTIVO", areaId: null }),
    )
  })

  it("rechaza un correo del dominio que NO está pre-aprobado (gate activo)", async () => {
    const repo = repoVacio()
    const preRepo = prePresente(null)
    const r = await construir(repo, preRepo)("uid-2", "nuevo@americana.edu.co", "Nuevo")
    expect(r.ok).toBe(false)
    expect(repo.crearUsuario).not.toHaveBeenCalled()
  })

  it("crea el usuario con el rol/área/estado de su pre-aprobación", async () => {
    const repo = repoVacio()
    const preRepo = prePresente({
      email: "coord@americana.edu.co",
      rol: "AREA",
      areaId: "area-9",
      estado: "ACTIVO",
      invitadoPor: null,
      createdAt: "2026-07-01T00:00:00.000Z",
    })
    const r = await construir(repo, preRepo)("uid-3", "Coord@Americana.edu.co", "Coord")
    expect(r.ok).toBe(true)
    expect(repo.crearUsuario).toHaveBeenCalledWith({
      id: "uid-3",
      email: "coord@americana.edu.co",
      nombre: "Coord",
      rol: "AREA",
      areaId: "area-9",
      estado: "ACTIVO",
    })
  })

  it("rechaza si la pre-aprobación viola el invariante rol↔área (AREA activo sin área)", async () => {
    const repo = repoVacio()
    const preRepo = prePresente({
      email: "malo@americana.edu.co",
      rol: "AREA",
      areaId: null,
      estado: "ACTIVO",
      invitadoPor: null,
      createdAt: "2026-07-01T00:00:00.000Z",
    })
    const r = await construir(repo, preRepo)("uid-4", "malo@americana.edu.co", "Malo")
    expect(r.ok).toBe(false)
    expect(repo.crearUsuario).not.toHaveBeenCalled()
  })

  describe("fallback merge-safe (tabla 0022 sin aplicar)", () => {
    it("preserva el autoregistro histórico AREA/PENDIENTE", async () => {
      const repo = repoVacio()
      const preRepo = preAusente()
      const r = await construir(repo, preRepo)("uid-5", "Nuevo@Americana.edu.co", "  Nuevo  ")
      expect(r.ok).toBe(true)
      expect(repo.crearUsuario).toHaveBeenCalledWith({
        id: "uid-5",
        email: "nuevo@americana.edu.co",
        nombre: "Nuevo",
        rol: "AREA",
        areaId: null,
        estado: "PENDIENTE",
      })
    })

    it("sigue rechazando fuera del dominio institucional", async () => {
      const repo = repoVacio()
      const preRepo = preAusente()
      const r = await construir(repo, preRepo)("uid-6", "ajeno@gmail.com", "Ajeno")
      expect(r.ok).toBe(false)
      expect(repo.crearUsuario).not.toHaveBeenCalled()
    })
  })
})
