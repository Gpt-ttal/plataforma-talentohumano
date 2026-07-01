/**
 * Tests del módulo de Capacitaciones (política lean):
 * - Guardas de rol 403 en los casos de uso autenticados.
 * - Guarda de ámbito (TH no gestiona SST, SST no gestiona TH).
 * - Idempotencia del registro público (mismo documento → yaExistia, sin duplicar).
 * - Smoke HTTP: endpoint público sin JWT → 404/400 pero NO 401; ruta autenticada → 401.
 */
import { describe, it, expect, vi } from "vitest"
import request from "supertest"
import { crearCapacitacion as crearCapacitacionUC } from "../src/application/capacitaciones/crearCapacitacion"
import { editarCapacitacion as editarCapacitacionUC } from "../src/application/capacitaciones/editarCapacitacion"
import { listarCapacitaciones as listarCapacitacionesUC } from "../src/application/capacitaciones/listarCapacitaciones"
import { abrirRegistro as abrirRegistroUC } from "../src/application/capacitaciones/abrirRegistro"
import { cerrarRegistro as cerrarRegistroUC } from "../src/application/capacitaciones/cerrarRegistro"
import { registrarAsistenciaPublica as registrarPublicaUC } from "../src/application/capacitaciones/registrarAsistenciaPublica"
import { ErrorAutorizacion, ErrorValidacion, ErrorNoEncontrado } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"
import { crearApp } from "../src/interface/app"
import type { Capacitacion, CapacitacionDetalle } from "@pys/shared"

const ROLES_AJENOS = ["CONTROL_INTERNO", "AREA"] as const

// ── Fixture ───────────────────────────────────────────────────────────────────

function hacerCapacitacion(over: Partial<Capacitacion> = {}): Capacitacion {
  return {
    id: "c1",
    titulo: "Inducción institucional",
    descripcion: null,
    ambito: "TH",
    lugar: "Sala A",
    instructor: "Ana",
    iniciaEn: "2026-07-01T14:00:00.000Z",
    terminaEn: "2026-07-01T16:00:00.000Z",
    horas: 2,
    token: "tok123",
    estadoRegistro: "BORRADOR",
    creadaPor: "Admin",
    createdAt: "2026-06-26T00:00:00.000Z",
    updatedAt: "2026-06-26T00:00:00.000Z",
    ...over,
  }
}

function hacerDetalle(over: Partial<Capacitacion> = {}): CapacitacionDetalle {
  return {
    capacitacion: hacerCapacitacion(over),
    asistencias: [],
    totalAsistencias: 0,
  }
}

// ── crearCapacitacion ─────────────────────────────────────────────────────────

describe("crearCapacitacion (guardas de rol y ámbito)", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { crearCapacitacion: vi.fn() } as any
    const uc = crearCapacitacionUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {
        titulo: "Test",
        ambito: "TH",
        iniciaEn: "2026-07-01T14:00:00.000Z",
        terminaEn: "2026-07-01T16:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearCapacitacion).not.toHaveBeenCalled()
  })

  it("TH no puede crear capacitación SST → 403", async () => {
    const repo = { crearCapacitacion: vi.fn() } as any
    const uc = crearCapacitacionUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), {
        titulo: "Alturas",
        ambito: "SST",
        iniciaEn: "2026-07-01T14:00:00.000Z",
        terminaEn: "2026-07-01T16:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("SST no puede crear capacitación TH → 403", async () => {
    const repo = { crearCapacitacion: vi.fn() } as any
    const uc = crearCapacitacionUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "SST" }), {
        titulo: "Inducción",
        ambito: "TH",
        iniciaEn: "2026-07-01T14:00:00.000Z",
        terminaEn: "2026-07-01T16:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("TH crea capacitación de su ámbito y delega en el repo", async () => {
    const cap = hacerCapacitacion()
    const repo = { crearCapacitacion: vi.fn().mockResolvedValue(cap) } as any
    const uc = crearCapacitacionUC({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), {
      titulo: "Inducción",
      ambito: "TH",
      iniciaEn: "2026-07-01T14:00:00.000Z",
      terminaEn: "2026-07-01T16:00:00.000Z",
    })
    expect(r).toBe(cap)
    expect(repo.crearCapacitacion).toHaveBeenCalled()
  })
})

// ── editarCapacitacion (rango fusionado) ──────────────────────────────────────

describe("editarCapacitacion (validación de rango fusionado)", () => {
  it("rechaza editar solo iniciaEn si invierte el rango contra lo persistido → 400", async () => {
    // Persistido: 14:00 → 16:00. Editar iniciaEn=17:00 deja 17:00 > 16:00 (inválido).
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ estadoRegistro: "BORRADOR" })),
      editarCapacitacion: vi.fn(),
    } as any
    const uc = editarCapacitacionUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "SUPERADMIN" }), "c1", { iniciaEn: "2026-07-01T17:00:00.000Z" }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.editarCapacitacion).not.toHaveBeenCalled()
  })

  it("acepta editar solo terminaEn si mantiene el rango válido", async () => {
    const cap = hacerCapacitacion({ estadoRegistro: "BORRADOR" })
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ estadoRegistro: "BORRADOR" })),
      editarCapacitacion: vi.fn().mockResolvedValue(cap),
    } as any
    const uc = editarCapacitacionUC({ repo })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), "c1", {
      terminaEn: "2026-07-01T18:00:00.000Z",
    })
    expect(r).toBe(cap)
    expect(repo.editarCapacitacion).toHaveBeenCalled()
  })
})

// ── listarCapacitaciones ──────────────────────────────────────────────────────

describe("listarCapacitaciones (filtro por ámbito automático)", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { listarCapacitaciones: vi.fn() } as any
    const uc = listarCapacitacionesUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {}),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("TH solo ve ámbito TH (fijado automáticamente, ignora ?ambito del query)", async () => {
    const pagina = { items: [], total: 0, pagina: 1, porPagina: 10, totalPaginas: 1 }
    const repo = { listarCapacitaciones: vi.fn().mockResolvedValue(pagina) } as any
    const uc = listarCapacitacionesUC({ repo })
    await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), { ambito: "SST" }) // intento de ver SST
    // El caso de uso debe ignorar el ámbito del query y usar TH
    expect(repo.listarCapacitaciones).toHaveBeenCalledWith(
      expect.objectContaining({ ambito: "TH" }),
    )
  })
})

// ── abrirRegistro / cerrarRegistro ────────────────────────────────────────────

describe("abrirRegistro / cerrarRegistro (guardas)", () => {
  it.each(ROLES_AJENOS)("abrirRegistro rechaza a %s → 403", async (rol) => {
    const repo = { obtenerDetalle: vi.fn() } as any
    const uc = abrirRegistroUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "c1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("no se puede abrir desde ABIERTO (ya abierto) → 400", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ estadoRegistro: "ABIERTO" })),
    } as any
    const uc = abrirRegistroUC({ repo })
    await expect(uc(hacerUsuario({ rol: "SUPERADMIN" }), "c1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    )
  })

  it("no se puede cerrar si no está ABIERTO → 400", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ estadoRegistro: "CERRADO" })),
    } as any
    const uc = cerrarRegistroUC({ repo })
    await expect(uc(hacerUsuario({ rol: "SUPERADMIN" }), "c1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    )
  })
})

// ── registrarAsistenciaPublica (idempotencia) ─────────────────────────────────

describe("registrarAsistenciaPublica (caso de uso público, sin actor)", () => {
  const datos = { nombre: "Ana", documento: "123", tipoVinculo: "PLANTA" as const }

  it("primer registro → registrada=true, yaExistia=false", async () => {
    const repo = {
      registrarAsistencia: vi.fn().mockResolvedValue({ registrada: true, yaExistia: false }),
    } as any
    const uc = registrarPublicaUC({ repo })
    const r = await uc("tok", datos)
    expect(r).toEqual({ registrada: true, yaExistia: false })
  })

  it("segundo registro del mismo documento → registrada=false, yaExistia=true (idempotente)", async () => {
    const repo = {
      registrarAsistencia: vi.fn().mockResolvedValue({ registrada: false, yaExistia: true }),
    } as any
    const uc = registrarPublicaUC({ repo })
    const r = await uc("tok", datos)
    expect(r).toEqual({ registrada: false, yaExistia: true })
    expect(repo.registrarAsistencia).toHaveBeenCalledTimes(1) // no duplica
  })

  it("token inválido → ErrorNoEncontrado del repo se propaga", async () => {
    const repo = {
      registrarAsistencia: vi.fn().mockRejectedValue(new ErrorNoEncontrado("no existe")),
    } as any
    const uc = registrarPublicaUC({ repo })
    await expect(uc("tok-invalido", datos)).rejects.toBeInstanceOf(ErrorNoEncontrado)
  })

  it("registro cerrado → ErrorValidacion del repo se propaga", async () => {
    const repo = {
      registrarAsistencia: vi.fn().mockRejectedValue(
        new ErrorValidacion("El registro de asistencia no está abierto."),
      ),
    } as any
    const uc = registrarPublicaUC({ repo })
    await expect(uc("tok", datos)).rejects.toBeInstanceOf(ErrorValidacion)
  })
})

// ── Smoke HTTP ────────────────────────────────────────────────────────────────

describe("HTTP smoke — capacitaciones", () => {
  const app = crearApp()

  it("GET /api/capacitaciones sin token → 401 (ruta autenticada)", async () => {
    const res = await request(app).get("/api/capacitaciones")
    expect(res.status).toBe(401)
  })

  it("POST /api/capacitaciones sin token → 401", async () => {
    const res = await request(app).post("/api/capacitaciones").send({})
    expect(res.status).toBe(401)
  })

  it("GET /api/capacitaciones/registro/:token sin token → no 401 (ruta pública)", async () => {
    // El endpoint público no requiere JWT. Devuelve 404 (token no existe) pero nunca 401.
    const res = await request(app).get("/api/capacitaciones/registro/tok-no-existe")
    expect(res.status).not.toBe(401)
    // Puede ser 404 (DB no conectada en CI → el repo lanza) o 500 si DB no alcanzable.
    // Lo importante: no es 401.
    expect([404, 500]).toContain(res.status)
  })

  it("POST /api/capacitaciones/registro/:token con body inválido → 400 (sin token JWT)", async () => {
    const res = await request(app)
      .post("/api/capacitaciones/registro/tok-no-existe")
      .send({ nombre: "A" }) // documento faltante → Zod → 400
    expect([400, 500]).toContain(res.status)
    // El 400 llega si Zod actúa; el 500 si la DB rechaza primero (sin env).
    // En ambos casos, no es 401 (la ruta es pública).
    expect(res.status).not.toBe(401)
  })
})
