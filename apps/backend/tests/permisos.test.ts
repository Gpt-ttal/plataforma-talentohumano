import { describe, it, expect, vi } from "vitest"
import { permisosSeedPorDefecto, type NivelPermiso } from "@pys/shared"
import { cargarMatriz } from "../src/application/permisos/cargarMatriz"
import { listarMatrizPermisos } from "../src/application/permisos/listarMatrizPermisos"
import { actualizarPermisosRol } from "../src/application/permisos/actualizarPermisosRol"
import { modulosVisibles } from "../src/application/permisos/modulosVisibles"
import { crearRequirePermiso } from "../src/interface/middleware/requirePermiso"
import { ErrorAutorizacion, ErrorValidacion } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"

const SA = hacerUsuario({ rol: "SUPERADMIN", id: "sa" })

describe("cargarMatriz (loader con fallback + merge)", () => {
  it("tabla ausente → matriz semilla derivada de MODULOS", async () => {
    const repo = {
      listarMatriz: vi.fn().mockResolvedValue({ tabla: "ausente" }),
    } as any
    const { obtenerMatriz } = cargarMatriz({ repo })
    const matriz = await obtenerMatriz()
    expect(matriz).toEqual(permisosSeedPorDefecto())
  })

  it("tabla presente → celda guardada gana sobre el default", async () => {
    const repo = {
      listarMatriz: vi.fn().mockResolvedValue({
        tabla: "presente",
        celdas: [{ rol: "TALENTO_HUMANO", moduloId: "vacantes", nivel: "NINGUNO" }],
      }),
    } as any
    const { nivelDe } = cargarMatriz({ repo })
    // TH veía vacantes por defecto (ESCRITURA); la celda guardada lo baja a NINGUNO.
    expect(await nivelDe("TALENTO_HUMANO", "vacantes")).toBe("NINGUNO")
    // Un módulo sin celda guardada mantiene su default.
    expect(await nivelDe("TALENTO_HUMANO", "personal")).toBe("ESCRITURA")
  })
})

describe("listarMatrizPermisos / modulosVisibles", () => {
  it("listar exige SUPERADMIN → 403 a otros roles", async () => {
    const cargador = { obtenerMatriz: vi.fn(), nivelDe: vi.fn() } as any
    await expect(
      listarMatrizPermisos({ cargador })(hacerUsuario({ rol: "TALENTO_HUMANO" })),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("modulosVisibles devuelve los módulos con nivel ≥ LECTURA del rol efectivo", async () => {
    const cargador = cargarMatriz({
      repo: { listarMatriz: vi.fn().mockResolvedValue({ tabla: "ausente" }) } as any,
    })
    const visibles = await modulosVisibles({ cargador })(
      hacerUsuario({ rol: "SST" }),
    )
    expect(visibles).toContain("capacitaciones")
    expect(visibles).not.toContain("personal")
  })
})

describe("actualizarPermisosRol (guards + anti-lockout)", () => {
  it("rechaza a quien no es SUPERADMIN → 403", async () => {
    const repo = { reemplazarPermisosRol: vi.fn() } as any
    await expect(
      actualizarPermisosRol({ repo })(hacerUsuario({ rol: "AREA", areaId: "a1" }), "AREA", {
        celdas: [],
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.reemplazarPermisosRol).not.toHaveBeenCalled()
  })

  it("anti-lockout: el rol SUPERADMIN es inmutable → 400", async () => {
    const repo = { reemplazarPermisosRol: vi.fn() } as any
    await expect(
      actualizarPermisosRol({ repo })(SA, "SUPERADMIN", {
        celdas: [{ moduloId: "personal", nivel: "NINGUNO" }],
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.reemplazarPermisosRol).not.toHaveBeenCalled()
  })

  it("rechaza un módulo desconocido → 400", async () => {
    const repo = { reemplazarPermisosRol: vi.fn() } as any
    await expect(
      actualizarPermisosRol({ repo })(SA, "TALENTO_HUMANO", {
        celdas: [{ moduloId: "no-existe", nivel: "LECTURA" }],
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.reemplazarPermisosRol).not.toHaveBeenCalled()
  })

  it("persiste las celdas del rol con el actor como autor", async () => {
    const repo = { reemplazarPermisosRol: vi.fn().mockResolvedValue(undefined) } as any
    await actualizarPermisosRol({ repo })(SA, "TALENTO_HUMANO", {
      celdas: [{ moduloId: "vacantes", nivel: "NINGUNO" }],
    })
    expect(repo.reemplazarPermisosRol).toHaveBeenCalledWith(
      "TALENTO_HUMANO",
      [{ rol: "TALENTO_HUMANO", moduloId: "vacantes", nivel: "NINGUNO" }],
      "sa",
    )
  })
})

describe("requirePermiso (middleware)", () => {
  function correr(nivelDe: any, moduloId: string, req: any) {
    const mw = crearRequirePermiso({ nivelDe })(moduloId, "LECTURA")
    const next = vi.fn()
    return mw(req, {} as any, next).then(() => next)
  }

  it("deja pasar cuando el nivel alcanza (next sin error)", async () => {
    const next = await correr(
      vi.fn().mockResolvedValue("ESCRITURA"),
      "vacantes",
      { usuario: hacerUsuario({ rol: "TALENTO_HUMANO" }) },
    )
    expect(next).toHaveBeenCalledWith()
  })

  it("bloquea cuando el nivel es NINGUNO → 403", async () => {
    const next = await correr(
      vi.fn().mockResolvedValue("NINGUNO"),
      "vacantes",
      { usuario: hacerUsuario({ rol: "SST" }) },
    )
    expect(next).toHaveBeenCalledWith(expect.any(ErrorAutorizacion))
  })
})

describe("requirePermiso — nivel exigido por método HTTP", () => {
  function correr(nivel: NivelPermiso, method: string) {
    const mw = crearRequirePermiso({ nivelDe: vi.fn().mockResolvedValue(nivel) })("vacantes")
    const next = vi.fn()
    return mw(
      { usuario: hacerUsuario({ rol: "TALENTO_HUMANO" }), method } as any,
      {} as any,
      next,
    ).then(() => next)
  }

  it("un rol con LECTURA puede leer (GET) pero no mutar (POST/PATCH/DELETE)", async () => {
    expect(await correr("LECTURA", "GET")).toHaveBeenCalledWith()
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      expect(await correr("LECTURA", method)).toHaveBeenCalledWith(
        expect.any(ErrorAutorizacion),
      )
    }
  })

  it("un rol con ESCRITURA puede mutar", async () => {
    expect(await correr("ESCRITURA", "POST")).toHaveBeenCalledWith()
    expect(await correr("ESCRITURA", "DELETE")).toHaveBeenCalledWith()
  })
})
