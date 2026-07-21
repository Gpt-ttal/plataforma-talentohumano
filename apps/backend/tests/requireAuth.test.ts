import { describe, it, expect, vi } from "vitest"
import { crearRequireAuth } from "../src/interface/middleware/requireAuth"
import { requireRol } from "../src/interface/middleware/requireRol"
import { requireActivo } from "../src/interface/middleware/requireActivo"
import { errorHandler } from "../src/interface/middleware/errorHandler"
import { logger } from "../src/infrastructure/logging/logger"
import {
  ErrorAutenticacion,
  ErrorAutorizacion,
} from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"

// Stubs mínimos de req/res/next ----------------------------------------------
const hacerRes = () => {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe("crearRequireAuth", () => {
  it("sin header Authorization → next(ErrorAutenticacion 401)", async () => {
    const mw = crearRequireAuth({
      verificar: vi.fn(),
      asegurar: vi.fn(),
    })
    const req: any = { headers: {} }
    const next = vi.fn()
    await mw(req, hacerRes(), next)
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(ErrorAutenticacion)
    expect(err.status).toBe(401)
  })

  it("token inválido (verificar lanza) → next(ErrorAutenticacion 401)", async () => {
    const mw = crearRequireAuth({
      verificar: vi.fn().mockRejectedValue(new Error("firma inválida")),
      asegurar: vi.fn(),
    })
    const req: any = { headers: { authorization: "Bearer xxx" } }
    const next = vi.fn()
    await mw(req, hacerRes(), next)
    expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorAutenticacion)
  })

  it("token inválido → loguea la causa real, sin filtrar el detalle al cliente", async () => {
    const errorReal = new Error("JWKS inalcanzable")
    const errSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined as never)
    const mw = crearRequireAuth({
      verificar: vi.fn().mockRejectedValue(errorReal),
      asegurar: vi.fn(),
    })
    const req: any = { headers: { authorization: "Bearer xxx" } }
    const next = vi.fn()
    await mw(req, hacerRes(), next)

    expect(errSpy).toHaveBeenCalledWith(
      expect.objectContaining({ err: errorReal }),
      expect.any(String),
    )
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(ErrorAutenticacion)
    expect(err.message).toBe("Token inválido o expirado.")
    errSpy.mockRestore()
  })

  it("token válido → carga req.usuario y llama next() sin error", async () => {
    const usuario = hacerUsuario({ rol: "TALENTO_HUMANO" })
    const asegurar = vi.fn().mockResolvedValue({ ok: true, usuario })
    const mw = crearRequireAuth({
      verificar: vi
        .fn()
        .mockResolvedValue({ sub: "u1", email: "a@americana.edu.co", nombre: "Ana" }),
      asegurar,
    })
    const req: any = { headers: { authorization: "Bearer tok" } }
    const next = vi.fn()
    await mw(req, hacerRes(), next)
    expect(req.usuario).toBe(usuario)
    expect(next).toHaveBeenCalledWith()
    expect(asegurar).toHaveBeenCalledWith("u1", "a@americana.edu.co", "Ana")
  })

  it("autoregistro rechazado (fuera de dominio) → next(ErrorAutorizacion 403)", async () => {
    const mw = crearRequireAuth({
      verificar: vi
        .fn()
        .mockResolvedValue({ sub: "u1", email: "x@gmail.com", nombre: "X" }),
      asegurar: vi.fn().mockResolvedValue({ ok: false, motivo: "Dominio no permitido." }),
    })
    const req: any = { headers: { authorization: "Bearer tok" } }
    const next = vi.fn()
    await mw(req, hacerRes(), next)
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(ErrorAutorizacion)
    expect(err.status).toBe(403)
  })
})

describe("requireRol", () => {
  it("rol no autorizado → next(ErrorAutorizacion 403)", () => {
    const req: any = { usuario: hacerUsuario({ rol: "AREA", areaId: "a1" }) }
    const next = vi.fn()
    requireRol("SUPERADMIN")(req, hacerRes(), next)
    expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorAutorizacion)
  })

  it("rol autorizado → next() sin error", () => {
    const req: any = { usuario: hacerUsuario({ rol: "SUPERADMIN" }) }
    const next = vi.fn()
    requireRol("SUPERADMIN", "TALENTO_HUMANO")(req, hacerRes(), next)
    expect(next).toHaveBeenCalledWith()
  })

  it("sin usuario en req → next(ErrorAutenticacion 401)", () => {
    const req: any = {}
    const next = vi.fn()
    requireRol("SUPERADMIN")(req, hacerRes(), next)
    expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorAutenticacion)
  })
})

describe("requireActivo", () => {
  it("usuario ACTIVO → next() sin error", () => {
    const req: any = { usuario: hacerUsuario({ estado: "ACTIVO" }) }
    const next = vi.fn()
    requireActivo(req, hacerRes(), next)
    expect(next).toHaveBeenCalledWith()
  })

  it("usuario INACTIVO → next(ErrorAutorizacion 403)", () => {
    const req: any = { usuario: hacerUsuario({ estado: "INACTIVO" }) }
    const next = vi.fn()
    requireActivo(req, hacerRes(), next)
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(ErrorAutorizacion)
    expect(err.status).toBe(403)
  })

  it("usuario PENDIENTE → next(ErrorAutorizacion 403)", () => {
    const req: any = { usuario: hacerUsuario({ rol: "AREA", areaId: null, estado: "PENDIENTE" }) }
    const next = vi.fn()
    requireActivo(req, hacerRes(), next)
    expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorAutorizacion)
  })

  it("sin usuario en req → next(ErrorAutenticacion 401)", () => {
    const req: any = {}
    const next = vi.fn()
    requireActivo(req, hacerRes(), next)
    expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorAutenticacion)
  })
})

describe("errorHandler", () => {
  it("mapea .status → JSON { error }", () => {
    const res = hacerRes()
    errorHandler(new ErrorAutorizacion("nop"), {} as any, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: "nop" })
  })

  it("error sin status → 500 genérico", () => {
    const errSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined as never)
    const res = hacerRes()
    errorHandler(new Error("boom"), { method: "GET", originalUrl: "/x" } as any, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(500)
    errSpy.mockRestore()
  })
})
