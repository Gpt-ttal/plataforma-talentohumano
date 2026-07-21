/**
 * Tests del Planificador — CRUD simple (política lean):
 * - Guardas de rol 403 en los 4 casos de uso.
 * - Guarda cruzada de ámbito (TH no gestiona SST, SST no gestiona TH).
 * - Un happy-path: TH crea una planeación de su ámbito, delega en el repo.
 * - Patrón "cargar → guardar": 404 si `obtenerDetalle` resuelve `null`; 403 si
 *   el ámbito de la fila cargada no es gestionable por el actor.
 * - Smoke HTTP: ruta autenticada sin JWT → 401.
 *
 * No se testean tests de integración con DB real (política lean, gated por
 * `DATABASE_URL_TEST` en otros archivos; este no lo necesita).
 */
import { describe, it, expect, vi } from "vitest"
import request from "supertest"
import { crearCapacitacionPlaneada as crearCapacitacionPlaneadaUC } from "../src/application/planificador/crearCapacitacionPlaneada"
import { listarCapacitacionesPlaneadas as listarCapacitacionesPlaneadasUC } from "../src/application/planificador/listarCapacitacionesPlaneadas"
import { editarCapacitacionPlaneada as editarCapacitacionPlaneadaUC } from "../src/application/planificador/editarCapacitacionPlaneada"
import { eliminarCapacitacionPlaneada as eliminarCapacitacionPlaneadaUC } from "../src/application/planificador/eliminarCapacitacionPlaneada"
import { ErrorAutorizacion, ErrorNoEncontrado } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"
import { crearApp } from "../src/interface/app"
import type { CapacitacionPlaneada } from "@pys/shared"

const ROLES_AJENOS = ["CONTROL_INTERNO", "AREA"] as const

// ── Fixture ───────────────────────────────────────────────────────────────────

function hacerCapacitacionPlaneada(over: Partial<CapacitacionPlaneada> = {}): CapacitacionPlaneada {
  return {
    id: "cp1",
    titulo: "Inducción anual",
    areaObjetivo: null,
    ambito: "TH",
    anio: 2026,
    mes: 3,
    estado: "PLANEADA",
    notas: null,
    creadaPor: "Admin",
    createdAt: "2026-06-26T00:00:00.000Z",
    updatedAt: "2026-06-26T00:00:00.000Z",
    ...over,
  }
}

// ── crearCapacitacionPlaneada ────────────────────────────────────────────────

describe("crearCapacitacionPlaneada (guardas de rol y ámbito)", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { crear: vi.fn() } as any
    const uc = crearCapacitacionPlaneadaUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {
        titulo: "Test",
        ambito: "TH",
        anio: 2026,
        mes: 1,
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crear).not.toHaveBeenCalled()
  })

  it("TH no puede planear una capacitación SST → 403", async () => {
    const repo = { crear: vi.fn() } as any
    const uc = crearCapacitacionPlaneadaUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), {
        titulo: "Alturas",
        ambito: "SST",
        anio: 2026,
        mes: 4,
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crear).not.toHaveBeenCalled()
  })

  it("SST no puede planear una capacitación TH → 403", async () => {
    const repo = { crear: vi.fn() } as any
    const uc = crearCapacitacionPlaneadaUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "SST" }), {
        titulo: "Inducción",
        ambito: "TH",
        anio: 2026,
        mes: 4,
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crear).not.toHaveBeenCalled()
  })

  it("TH crea una planeación de su ámbito y delega en el repo con los datos correctos", async () => {
    const cp = hacerCapacitacionPlaneada()
    const repo = { crear: vi.fn().mockResolvedValue(cp) } as any
    const uc = crearCapacitacionPlaneadaUC({ repo })
    const actor = hacerUsuario({ rol: "TALENTO_HUMANO", nombre: "Laura Armenta" })
    const r = await uc(actor, {
      titulo: "Inducción anual",
      ambito: "TH",
      anio: 2026,
      mes: 3,
    })
    expect(r).toBe(cp)
    expect(repo.crear).toHaveBeenCalledWith({
      titulo: "Inducción anual",
      areaObjetivo: null,
      ambito: "TH",
      anio: 2026,
      mes: 3,
      notas: null,
      creadaPor: "Laura Armenta",
    })
  })
})

// ── listarCapacitacionesPlaneadas ────────────────────────────────────────────

describe("listarCapacitacionesPlaneadas (guarda de rol)", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { listar: vi.fn() } as any
    const uc = listarCapacitacionesPlaneadasUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {}),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.listar).not.toHaveBeenCalled()
  })
})

// ── editarCapacitacionPlaneada ────────────────────────────────────────────────

describe("editarCapacitacionPlaneada (patrón cargar → guardar)", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerDetalle: vi.fn(), editar: vi.fn() } as any
    const uc = editarCapacitacionPlaneadaUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "cp1", { titulo: "X" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerDetalle).not.toHaveBeenCalled()
    expect(repo.editar).not.toHaveBeenCalled()
  })

  it("404 si la capacitación planeada no existe", async () => {
    const repo = { obtenerDetalle: vi.fn().mockResolvedValue(null), editar: vi.fn() } as any
    const uc = editarCapacitacionPlaneadaUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "no-existe", { titulo: "X" }),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.editar).not.toHaveBeenCalled()
  })

  it("TH no puede editar una fila de ámbito SST → 403", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerCapacitacionPlaneada({ ambito: "SST" })),
      editar: vi.fn(),
    } as any
    const uc = editarCapacitacionPlaneadaUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "cp1", { titulo: "X" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.editar).not.toHaveBeenCalled()
  })

  it("TH edita una fila de su propio ámbito y delega en el repo", async () => {
    const cp = hacerCapacitacionPlaneada({ titulo: "Actualizado" })
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerCapacitacionPlaneada()),
      editar: vi.fn().mockResolvedValue(cp),
    } as any
    const uc = editarCapacitacionPlaneadaUC({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "cp1", { titulo: "Actualizado" })
    expect(r).toBe(cp)
    expect(repo.editar).toHaveBeenCalledWith("cp1", { titulo: "Actualizado" })
  })
})

// ── eliminarCapacitacionPlaneada ─────────────────────────────────────────────

describe("eliminarCapacitacionPlaneada (patrón cargar → guardar)", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerDetalle: vi.fn(), eliminar: vi.fn() } as any
    const uc = eliminarCapacitacionPlaneadaUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "cp1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerDetalle).not.toHaveBeenCalled()
    expect(repo.eliminar).not.toHaveBeenCalled()
  })

  it("404 si la capacitación planeada no existe", async () => {
    const repo = { obtenerDetalle: vi.fn().mockResolvedValue(null), eliminar: vi.fn() } as any
    const uc = eliminarCapacitacionPlaneadaUC({ repo })
    await expect(uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "no-existe")).rejects.toBeInstanceOf(
      ErrorNoEncontrado,
    )
    expect(repo.eliminar).not.toHaveBeenCalled()
  })

  it("SST no puede eliminar una fila de ámbito TH → 403", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerCapacitacionPlaneada({ ambito: "TH" })),
      eliminar: vi.fn(),
    } as any
    const uc = eliminarCapacitacionPlaneadaUC({ repo })
    await expect(uc(hacerUsuario({ rol: "SST" }), "cp1")).rejects.toBeInstanceOf(
      ErrorAutorizacion,
    )
    expect(repo.eliminar).not.toHaveBeenCalled()
  })

  it("TH elimina una fila de su propio ámbito y delega en el repo", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerCapacitacionPlaneada()),
      eliminar: vi.fn().mockResolvedValue(undefined),
    } as any
    const uc = eliminarCapacitacionPlaneadaUC({ repo })
    await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "cp1")
    expect(repo.eliminar).toHaveBeenCalledWith("cp1")
  })
})

// ── Smoke HTTP ────────────────────────────────────────────────────────────────

describe("HTTP smoke — planificador", () => {
  const app = crearApp()

  it("GET /api/planificador sin token → 401 (ruta autenticada)", async () => {
    const res = await request(app).get("/api/planificador")
    expect(res.status).toBe(401)
  })

  it("POST /api/planificador sin token → 401", async () => {
    const res = await request(app).post("/api/planificador").send({})
    expect(res.status).toBe(401)
  })
})
