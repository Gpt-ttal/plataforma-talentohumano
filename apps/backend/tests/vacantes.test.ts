/**
 * Tests del módulo de Vacantes (política lean):
 * - Guardas de rol 403 en los casos de uso autenticados (solo SA/TH).
 * - `crearVacante` rechaza con BLOQUEO (ErrorValidacion) y NO llega a escribir.
 * - `crearVacante`/`actualizarVacante` delegan en el repo cuando la validación pasa.
 * - `actualizarVacante` fusiona el PATCH con lo persistido antes de validar.
 * - Smoke HTTP: ruta autenticada sin token → 401.
 */
import { describe, it, expect, vi } from "vitest"
import request from "supertest"
import { listarVacantes as listarVacantesUC } from "../src/application/vacantes/listarVacantes"
import { crearVacante as crearVacanteUC } from "../src/application/vacantes/crearVacante"
import { actualizarVacante as actualizarVacanteUC } from "../src/application/vacantes/actualizarVacante"
import { obtenerSugerenciasVacante as obtenerSugerenciasUC } from "../src/application/vacantes/obtenerSugerenciasVacante"
import { obtenerCatalogosVacantes as obtenerCatalogosUC } from "../src/application/vacantes/obtenerCatalogosVacantes"
import { ErrorAutorizacion, ErrorNoEncontrado, ErrorValidacion } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"
import { crearApp } from "../src/interface/app"
import type { CatalogosVacantes } from "../src/domain/ports/VacanteRepo"
import type { Vacante } from "@pys/shared"

const ROLES_AJENOS = ["CONTROL_INTERNO", "AREA", "SST"] as const

// ── Fixtures ──────────────────────────────────────────────────────────────────

function hacerVacante(over: Partial<Vacante> = {}): Vacante {
  return {
    id: "v1",
    requerimiento: "REQ-000001",
    cargo: "Analista de Nómina",
    posiciones: 1,
    areaId: "a1",
    modalidad: "PRESENCIAL",
    dedicacion: "TIEMPO_COMPLETO",
    escalafon: null,
    motivo: "NUEVO_CARGO",
    fuente: null,
    jefe: "María Gómez",
    reemplazo: null,
    nombreNuevo: null,
    salario: 3_000_000,
    aprobacion: "APROBADO",
    fechaAprobacion: null,
    fechaRequerimiento: "2026-07-01",
    fase: "RECLUTAMIENTO",
    estado: "PENDIENTE",
    fechaContratacion: null,
    cedula: null,
    createdAt: "2026-06-26T00:00:00.000Z",
    updatedAt: "2026-06-26T00:00:00.000Z",
    ...over,
  }
}

const CATALOGOS_VACIOS: CatalogosVacantes = {
  areas: [],
  modalidades: [],
  dedicaciones: [],
  escalafones: [],
  motivos: [],
  fuentes: [],
}

const INPUT_MINIMO = { cargo: "Analista de Nómina", posiciones: 1, fechaRequerimiento: "2026-07-01" }

// ── listarVacantes (guarda de rol) ───────────────────────────────────────────

describe("listarVacantes (guarda de rol)", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { listarVacantes: vi.fn() } as any
    const uc = listarVacantesUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {}),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.listarVacantes).not.toHaveBeenCalled()
  })

  it("TALENTO_HUMANO puede listar y recibe las vacantes ya derivadas (con status)", async () => {
    const pagina = { items: [hacerVacante()], total: 1, pagina: 1, porPagina: 10, totalPaginas: 1 }
    const repo = { listarVacantes: vi.fn().mockResolvedValue(pagina) } as any
    const uc = listarVacantesUC({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), {})
    expect(r.items[0]).toHaveProperty("status")
    expect(r.items[0]).toHaveProperty("avisos")
  })
})

// ── crearVacante (validación de dos niveles) ─────────────────────────────────

describe("crearVacante", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerCatalogos: vi.fn(), crearVacante: vi.fn() } as any
    const uc = crearVacanteUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), INPUT_MINIMO as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearVacante).not.toHaveBeenCalled()
  })

  it("estado CONTRATADO sin cédula/nombre/fecha → BLOQUEO (422), no escribe", async () => {
    const repo = {
      obtenerCatalogos: vi.fn().mockResolvedValue(CATALOGOS_VACIOS),
      crearVacante: vi.fn(),
    } as any
    const uc = crearVacanteUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), { ...INPUT_MINIMO, estado: "CONTRATADO" } as any),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.crearVacante).not.toHaveBeenCalled()
  })

  it("posiciones inválidas (0) → BLOQUEO, no escribe", async () => {
    const repo = {
      obtenerCatalogos: vi.fn().mockResolvedValue(CATALOGOS_VACIOS),
      crearVacante: vi.fn(),
    } as any
    const uc = crearVacanteUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "SUPERADMIN" }), { ...INPUT_MINIMO, posiciones: 0 } as any),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.crearVacante).not.toHaveBeenCalled()
  })

  it("una vacante bien formada delega en el repo y devuelve avisos (aunque sea [])", async () => {
    const creada = hacerVacante()
    const repo = {
      obtenerCatalogos: vi.fn().mockResolvedValue(CATALOGOS_VACIOS),
      crearVacante: vi.fn().mockResolvedValue(creada),
    } as any
    const uc = crearVacanteUC({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), {
      ...INPUT_MINIMO,
      jefe: "María Gómez",
      areaId: "a1",
    } as any)
    expect(repo.crearVacante).toHaveBeenCalled()
    expect(r).toMatchObject({ id: "v1", avisos: [] })
  })

  it("sin área ni jefe genera AVISOs mas NO bloquea la escritura", async () => {
    const creada = hacerVacante({ areaId: null, jefe: null })
    const repo = {
      obtenerCatalogos: vi.fn().mockResolvedValue(CATALOGOS_VACIOS),
      crearVacante: vi.fn().mockResolvedValue(creada),
    } as any
    const uc = crearVacanteUC({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), INPUT_MINIMO as any)
    expect(repo.crearVacante).toHaveBeenCalled()
    expect(r.avisos.length).toBeGreaterThan(0)
  })
})

// ── actualizarVacante (rango fusionado con lo persistido) ────────────────────

describe("actualizarVacante", () => {
  it("la vacante no existe → ErrorNoEncontrado, no llama obtenerCatalogos", async () => {
    const repo = { obtenerVacante: vi.fn().mockResolvedValue(null), obtenerCatalogos: vi.fn() } as any
    const uc = actualizarVacanteUC({ repo })
    await expect(uc(hacerUsuario({ rol: "SUPERADMIN" }), "v1", { cargo: "X" })).rejects.toBeInstanceOf(
      ErrorNoEncontrado,
    )
    expect(repo.obtenerCatalogos).not.toHaveBeenCalled()
  })

  it("marcar CONTRATADO sin fecha de contratación (persistida ni en el patch) → BLOQUEO", async () => {
    const repo = {
      obtenerVacante: vi.fn().mockResolvedValue(hacerVacante({ fechaContratacion: null, cedula: null })),
      obtenerCatalogos: vi.fn().mockResolvedValue(CATALOGOS_VACIOS),
      actualizarVacante: vi.fn(),
    } as any
    const uc = actualizarVacanteUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "SUPERADMIN" }), "v1", { estado: "CONTRATADO" }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.actualizarVacante).not.toHaveBeenCalled()
  })

  it("editar solo el cargo conserva el resto de lo persistido y delega en el repo", async () => {
    const actualizada = hacerVacante({ cargo: "Analista Senior" })
    const repo = {
      obtenerVacante: vi.fn().mockResolvedValue(hacerVacante()),
      obtenerCatalogos: vi.fn().mockResolvedValue(CATALOGOS_VACIOS),
      actualizarVacante: vi.fn().mockResolvedValue(actualizada),
    } as any
    const uc = actualizarVacanteUC({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "v1", { cargo: "Analista Senior" })
    expect(repo.actualizarVacante).toHaveBeenCalledWith(
      "v1",
      expect.objectContaining({ cargo: "Analista Senior" }),
      expect.any(String),
    )
    expect(r).toMatchObject({ cargo: "Analista Senior" })
  })
})

// ── obtenerCatalogosVacantes (catálogo de área dedicado, no `AreaRepo`) ──────

describe("obtenerCatalogosVacantes", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerCatalogos: vi.fn() } as any
    const uc = obtenerCatalogosUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null })),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerCatalogos).not.toHaveBeenCalled()
  })

  it("delega en repo.obtenerCatalogos() e incluye el catálogo `areas` de Vacantes", async () => {
    const conArea: CatalogosVacantes = {
      ...CATALOGOS_VACIOS,
      areas: [{ id: "a1", clave: "CIE", nombre: "CIE", activo: true, orden: 1 }],
    }
    const repo = { obtenerCatalogos: vi.fn().mockResolvedValue(conArea) } as any
    const uc = obtenerCatalogosUC({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }))
    expect(r).toEqual(conArea)
  })
})

// ── obtenerSugerenciasVacante ─────────────────────────────────────────────────

describe("obtenerSugerenciasVacante", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerSugerencias: vi.fn() } as any
    const uc = obtenerSugerenciasUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {}),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("delega en el repo con el filtro recibido", async () => {
    const repo = { obtenerSugerencias: vi.fn().mockResolvedValue({ jefe: "María Gómez" }) } as any
    const uc = obtenerSugerenciasUC({ repo })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), { areaId: "a1", cargo: "Analista" })
    expect(repo.obtenerSugerencias).toHaveBeenCalledWith({ areaId: "a1", cargo: "Analista" })
    expect(r).toEqual({ jefe: "María Gómez" })
  })
})

// ── Smoke HTTP ────────────────────────────────────────────────────────────────

describe("HTTP smoke — vacantes", () => {
  const app = crearApp()

  it("GET /api/vacantes sin token → 401", async () => {
    const res = await request(app).get("/api/vacantes")
    expect(res.status).toBe(401)
  })

  it("POST /api/vacantes sin token → 401", async () => {
    const res = await request(app).post("/api/vacantes").send({})
    expect(res.status).toBe(401)
  })

  it("GET /api/vacantes/dashboard sin token → 401", async () => {
    const res = await request(app).get("/api/vacantes/dashboard")
    expect(res.status).toBe(401)
  })

  it("GET /api/vacantes/catalogos sin token → 401", async () => {
    const res = await request(app).get("/api/vacantes/catalogos")
    expect(res.status).toBe(401)
  })
})
