/**
 * Tests del módulo de Cursos — gestión autenticada (política lean):
 * - Guardas de rol 403 en los casos de uso autenticados.
 * - Guarda de ámbito (TH no gestiona SST, SST no gestiona TH), incl. la regla
 *   nueva de "ambos ámbitos" al reasignar en `editarCurso`.
 * - Sanitización de `contenidoTexto` en `crearLeccionCurso`.
 * - Smoke HTTP: ruta autenticada sin JWT → 401.
 *
 * No se testea `moverModulo`/`moverLeccion`/`listarInscritos`/`obtenerDetalle`
 * a nivel de integración con base de datos real: quedan cubiertos indirectamente
 * por los tests de guardas de los casos de uso que los envuelven (mock del repo).
 */
import { describe, it, expect, vi } from "vitest"
import request from "supertest"
import { crearCurso as crearCursoUC } from "../src/application/cursos/crearCurso"
import { editarCurso as editarCursoUC } from "../src/application/cursos/editarCurso"
import { listarCursos as listarCursosUC } from "../src/application/cursos/listarCursos"
import { abrirRegistroCurso as abrirRegistroCursoUC } from "../src/application/cursos/abrirRegistroCurso"
import { cerrarRegistroCurso as cerrarRegistroCursoUC } from "../src/application/cursos/cerrarRegistroCurso"
import { crearModuloCurso as crearModuloCursoUC } from "../src/application/cursos/crearModuloCurso"
import { editarModuloCurso as editarModuloCursoUC } from "../src/application/cursos/editarModuloCurso"
import { moverModuloCurso as moverModuloCursoUC } from "../src/application/cursos/moverModuloCurso"
import { eliminarModuloCurso as eliminarModuloCursoUC } from "../src/application/cursos/eliminarModuloCurso"
import { crearLeccionCurso as crearLeccionCursoUC } from "../src/application/cursos/crearLeccionCurso"
import { editarLeccionCurso as editarLeccionCursoUC } from "../src/application/cursos/editarLeccionCurso"
import { moverLeccionCurso as moverLeccionCursoUC } from "../src/application/cursos/moverLeccionCurso"
import { eliminarLeccionCurso as eliminarLeccionCursoUC } from "../src/application/cursos/eliminarLeccionCurso"
import { ingresarCurso as ingresarCursoUC } from "../src/application/cursos/ingresarCurso"
import { marcarLeccionCompletadaCurso as marcarLeccionCompletadaCursoUC } from "../src/application/cursos/marcarLeccionCompletadaCurso"
import { ErrorAutorizacion, ErrorNoEncontrado, ErrorValidacion } from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"
import { crearApp } from "../src/interface/app"
import type { Curso, CursoDetalle } from "@pys/shared"

const ROLES_AJENOS = ["CONTROL_INTERNO", "AREA"] as const

// ── Fixture ───────────────────────────────────────────────────────────────────

function hacerCurso(over: Partial<Curso> = {}): Curso {
  return {
    id: "cu1",
    titulo: "Inducción institucional",
    descripcion: null,
    ambito: "TH",
    token: "tok123",
    estadoRegistro: "BORRADOR",
    creadaPor: "Admin",
    createdAt: "2026-06-26T00:00:00.000Z",
    updatedAt: "2026-06-26T00:00:00.000Z",
    ...over,
  }
}

function hacerDetalle(over: Partial<Curso> = {}): CursoDetalle {
  return {
    curso: hacerCurso(over),
    modulos: [],
    totalLecciones: 0,
    totalInscritos: 0,
  }
}

/**
 * Detalle con un módulo `m1` y una lección `l1`, para probar las guardas de
 * pertenencia (IDOR/BOLA): el hijo objetivo existe en el árbol o no.
 */
function hacerDetalleConContenido(over: Partial<Curso> = {}): CursoDetalle {
  return {
    curso: hacerCurso(over),
    modulos: [
      {
        id: "m1",
        cursoId: "cu1",
        titulo: "Módulo 1",
        orden: 1,
        createdAt: "2026-06-26T00:00:00.000Z",
        updatedAt: "2026-06-26T00:00:00.000Z",
        lecciones: [
          {
            id: "l1",
            moduloId: "m1",
            titulo: "Lección 1",
            tipoContenido: "TEXTO",
            contenidoTexto: null,
            urlVideo: null,
            orden: 1,
            createdAt: "2026-06-26T00:00:00.000Z",
            updatedAt: "2026-06-26T00:00:00.000Z",
          },
        ],
      },
    ],
    totalLecciones: 1,
    totalInscritos: 0,
  }
}

// ── crearCurso ────────────────────────────────────────────────────────────────

describe("crearCurso (guardas de rol y ámbito)", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { crearCurso: vi.fn() } as any
    const uc = crearCursoUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {
        titulo: "Test",
        ambito: "TH",
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearCurso).not.toHaveBeenCalled()
  })

  it("TH no puede crear curso SST → 403", async () => {
    const repo = { crearCurso: vi.fn() } as any
    const uc = crearCursoUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), { titulo: "Alturas", ambito: "SST" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("SST no puede crear curso TH → 403", async () => {
    const repo = { crearCurso: vi.fn() } as any
    const uc = crearCursoUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "SST" }), { titulo: "Inducción", ambito: "TH" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("TH crea curso de su ámbito y delega en el repo", async () => {
    const cur = hacerCurso()
    const repo = { crearCurso: vi.fn().mockResolvedValue(cur) } as any
    const uc = crearCursoUC({ repo })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), {
      titulo: "Inducción",
      ambito: "TH",
    })
    expect(r).toBe(cur)
    expect(repo.crearCurso).toHaveBeenCalled()
  })
})

// ── editarCurso (reasignación de ámbito) ──────────────────────────────────────

describe("editarCurso (guarda de ámbito, incl. reasignación)", () => {
  it("TH no puede reasignar un curso TH hacia SST → 403", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ ambito: "TH" })),
      editarCurso: vi.fn(),
    } as any
    const uc = editarCursoUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "cu1", { ambito: "SST" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.editarCurso).not.toHaveBeenCalled()
  })

  it("SA puede reasignar un curso de TH a SST", async () => {
    const cur = hacerCurso({ ambito: "SST" })
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ ambito: "TH" })),
      editarCurso: vi.fn().mockResolvedValue(cur),
    } as any
    const uc = editarCursoUC({ repo })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), "cu1", { ambito: "SST" })
    expect(r).toBe(cur)
    expect(repo.editarCurso).toHaveBeenCalledWith("cu1", { ambito: "SST" })
  })
})

// ── listarCursos ──────────────────────────────────────────────────────────────

describe("listarCursos (filtro por ámbito automático)", () => {
  it.each(ROLES_AJENOS)("rechaza a %s → 403", async (rol) => {
    const repo = { listarCursos: vi.fn() } as any
    const uc = listarCursosUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {}),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("TH solo ve ámbito TH (fijado automáticamente, ignora ?ambito del query)", async () => {
    const pagina = { items: [], total: 0, pagina: 1, porPagina: 10, totalPaginas: 1 }
    const repo = { listarCursos: vi.fn().mockResolvedValue(pagina) } as any
    const uc = listarCursosUC({ repo })
    await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), { ambito: "SST" })
    expect(repo.listarCursos).toHaveBeenCalledWith(expect.objectContaining({ ambito: "TH" }))
  })
})

// ── abrirRegistroCurso / cerrarRegistroCurso ─────────────────────────────────

describe("abrirRegistroCurso / cerrarRegistroCurso (guardas)", () => {
  it.each(ROLES_AJENOS)("abrirRegistroCurso rechaza a %s → 403", async (rol) => {
    const repo = { obtenerDetalle: vi.fn() } as any
    const uc = abrirRegistroCursoUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "cu1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
  })

  it("no se puede abrir desde ABIERTO (ya abierto) → 400", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ estadoRegistro: "ABIERTO" })),
    } as any
    const uc = abrirRegistroCursoUC({ repo })
    await expect(uc(hacerUsuario({ rol: "SUPERADMIN" }), "cu1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    )
  })

  it("no se puede cerrar si no está ABIERTO → 400", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ estadoRegistro: "CERRADO" })),
    } as any
    const uc = cerrarRegistroCursoUC({ repo })
    await expect(uc(hacerUsuario({ rol: "SUPERADMIN" }), "cu1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    )
  })
})

// ── crearModuloCurso / crearLeccionCurso (autorización vía cursoId) ──────────

describe("crearModuloCurso / crearLeccionCurso (guardas vía cursoId)", () => {
  it.each(ROLES_AJENOS)("crearModuloCurso rechaza a %s → 403", async (rol) => {
    const repo = { obtenerDetalle: vi.fn(), crearModulo: vi.fn() } as any
    const uc = crearModuloCursoUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "cu1", "Módulo 1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearModulo).not.toHaveBeenCalled()
  })

  it("TH no puede crear módulo en un curso SST → 403", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ ambito: "SST" })),
      crearModulo: vi.fn(),
    } as any
    const uc = crearModuloCursoUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "cu1", "Módulo 1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearModulo).not.toHaveBeenCalled()
  })

  it.each(ROLES_AJENOS)("crearLeccionCurso rechaza a %s → 403", async (rol) => {
    const repo = { obtenerDetalle: vi.fn(), crearLeccion: vi.fn() } as any
    const uc = crearLeccionCursoUC({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), "cu1", "m1", {
        titulo: "Lección 1",
        tipoContenido: "TEXTO",
        contenidoTexto: "<p>hola</p>",
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearLeccion).not.toHaveBeenCalled()
  })

  it("TH no puede crear lección en un curso SST → 403", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalle({ ambito: "SST" })),
      crearLeccion: vi.fn(),
    } as any
    const uc = crearLeccionCursoUC({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "cu1", "m1", {
        titulo: "Lección 1",
        tipoContenido: "TEXTO",
        contenidoTexto: "<p>hola</p>",
      }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearLeccion).not.toHaveBeenCalled()
  })

  it("crearLeccionCurso sanitiza contenidoTexto antes de delegar en el repo", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido({ ambito: "TH" })),
      crearLeccion: vi.fn().mockResolvedValue({}),
    } as any
    const uc = crearLeccionCursoUC({ repo })
    await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), "cu1", "m1", {
      titulo: "Lección 1",
      tipoContenido: "TEXTO",
      contenidoTexto: '<script>alert(1)</script><p>hola</p>',
    })
    expect(repo.crearLeccion).toHaveBeenCalledWith(
      "cu1",
      "m1",
      expect.objectContaining({ contenidoTexto: "<p>hola</p>" }),
    )
  })
})

// ── Guardas IDOR/BOLA cross-curso (pertenencia del hijo al curso) ────────────

describe("guardas IDOR: el hijo debe pertenecer al curso autorizado", () => {
  // SUPERADMIN pasa la guarda de ámbito para cualquier curso → aísla el cotejo
  // de pertenencia como la única causa del rechazo.
  const admin = hacerUsuario({ rol: "SUPERADMIN" })

  it("editarModuloCurso: módulo de otro curso → 404, no delega", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido()),
      editarModulo: vi.fn(),
    } as any
    await expect(
      editarModuloCursoUC({ repo })(admin, "cu1", "m-ajeno", "Nuevo"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.editarModulo).not.toHaveBeenCalled()
  })

  it("eliminarModuloCurso: módulo de otro curso → 404, no delega", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido()),
      eliminarModulo: vi.fn(),
    } as any
    await expect(
      eliminarModuloCursoUC({ repo })(admin, "cu1", "m-ajeno"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.eliminarModulo).not.toHaveBeenCalled()
  })

  it("moverModuloCurso: módulo de otro curso → 404, no delega", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido()),
      moverModulo: vi.fn(),
    } as any
    await expect(
      moverModuloCursoUC({ repo })(admin, "cu1", "m-ajeno", "subir"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.moverModulo).not.toHaveBeenCalled()
  })

  it("crearLeccionCurso: módulo de otro curso → 404, no delega", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido()),
      crearLeccion: vi.fn(),
    } as any
    await expect(
      crearLeccionCursoUC({ repo })(admin, "cu1", "m-ajeno", {
        titulo: "L",
        tipoContenido: "TEXTO",
        contenidoTexto: "<p>x</p>",
      }),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.crearLeccion).not.toHaveBeenCalled()
  })

  it("editarLeccionCurso: lección de otro curso → 404, no delega", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido()),
      editarLeccion: vi.fn(),
    } as any
    await expect(
      editarLeccionCursoUC({ repo })(admin, "cu1", "m1", "l-ajena", { titulo: "X" }),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.editarLeccion).not.toHaveBeenCalled()
  })

  it("moverLeccionCurso: lección de otro curso → 404, no delega", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido()),
      moverLeccion: vi.fn(),
    } as any
    await expect(
      moverLeccionCursoUC({ repo })(admin, "cu1", "m1", "l-ajena", "subir"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.moverLeccion).not.toHaveBeenCalled()
  })

  it("eliminarLeccionCurso: lección de otro curso → 404, no delega", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido()),
      eliminarLeccion: vi.fn(),
    } as any
    await expect(
      eliminarLeccionCursoUC({ repo })(admin, "cu1", "m1", "l-ajena"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.eliminarLeccion).not.toHaveBeenCalled()
  })

  // Happy path: el hijo pertenece al curso → delega reenviando el `cursoId` (prueba la firma nueva).
  it("editarModuloCurso: módulo del curso → delega con cursoId reenviado", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido()),
      editarModulo: vi.fn().mockResolvedValue({ id: "m1" }),
    } as any
    await editarModuloCursoUC({ repo })(admin, "cu1", "m1", "Nuevo título")
    expect(repo.editarModulo).toHaveBeenCalledWith("cu1", "m1", "Nuevo título")
  })

  it("eliminarLeccionCurso: lección del curso → delega con cursoId reenviado", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(hacerDetalleConContenido()),
      eliminarLeccion: vi.fn().mockResolvedValue(undefined),
    } as any
    await eliminarLeccionCursoUC({ repo })(admin, "cu1", "m1", "l1")
    expect(repo.eliminarLeccion).toHaveBeenCalledWith("cu1", "l1")
  })
})

// ── ingresarCurso / marcarLeccionCompletadaCurso (proxy delgado, sin actor) ──

describe("ingresarCurso (caso de uso público, sin actor)", () => {
  it("delega en repo.ingresarInscripcion y devuelve exactamente lo que resuelve", async () => {
    const resultado = { inscripcion: {}, curso: {}, modulos: [], progreso: {} } as any
    const repo = { ingresarInscripcion: vi.fn().mockResolvedValue(resultado) } as any
    const uc = ingresarCursoUC({ repo })
    const datos = { nombre: "Ana", documento: "123" }
    const r = await uc("tok", datos)
    expect(r).toBe(resultado)
    expect(repo.ingresarInscripcion).toHaveBeenCalledWith("tok", datos)
  })
})

describe("marcarLeccionCompletadaCurso (caso de uso público, sin actor)", () => {
  it("delega en repo.marcarLeccionCompletada y devuelve exactamente lo que resuelve", async () => {
    const resultado = { inscripcion: {}, curso: {}, modulos: [], progreso: {} } as any
    const repo = { marcarLeccionCompletada: vi.fn().mockResolvedValue(resultado) } as any
    const uc = marcarLeccionCompletadaCursoUC({ repo })
    const r = await uc("tok", "123", "l1")
    expect(r).toBe(resultado)
    expect(repo.marcarLeccionCompletada).toHaveBeenCalledWith("tok", "123", "l1")
  })
})

// ── Smoke HTTP ────────────────────────────────────────────────────────────────

describe("HTTP smoke — cursos", () => {
  const app = crearApp()

  it("GET /api/cursos sin token → 401 (ruta autenticada)", async () => {
    const res = await request(app).get("/api/cursos")
    expect(res.status).toBe(401)
  })

  it("POST /api/cursos sin token → 401", async () => {
    const res = await request(app).post("/api/cursos").send({})
    expect(res.status).toBe(401)
  })

  it("GET /api/cursos/tomar/tok-no-existe sin JWT → no 401 (ruta pública)", async () => {
    const res = await request(app).get("/api/cursos/tomar/tok-no-existe")
    expect(res.status).not.toBe(401)
    // 404 (token no existe) si la DB responde, o 500 si no está alcanzable en CI.
    expect([404, 500]).toContain(res.status)
  })

  it("POST /api/cursos/tomar/tok-no-existe/ingresar con body inválido → no 401", async () => {
    const res = await request(app)
      .post("/api/cursos/tomar/tok-no-existe/ingresar")
      .send({}) // sin nombre/documento → Zod → 400
    expect(res.status).not.toBe(401)
    expect([400, 500]).toContain(res.status)
  })

  it("leccionId no-UUID en ruta pública → 400 vía paramUuid (M4), no 500 de pg", async () => {
    const res = await request(app)
      .post("/api/cursos/tomar/tok-no-existe/lecciones/no-es-un-uuid/completar")
      .send({ documento: "123" })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty("error")
  })
})
