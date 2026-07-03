import { describe, it, expect, vi } from "vitest"
import { crearEmpleado } from "../src/application/personal/crearEmpleado"
import { editarEmpleado } from "../src/application/personal/editarEmpleado"
import { finalizarContrato } from "../src/application/personal/finalizarContrato"
import { registrarNovedad } from "../src/application/personal/registrarNovedad"
import { listarEmpleados } from "../src/application/personal/listarEmpleados"
import { obtenerEmpleado } from "../src/application/personal/obtenerEmpleado"
import {
  obtenerExpedientePersonal,
  veSalarial,
} from "../src/application/personal/obtenerExpedientePersonal"
import { guardarPersonales } from "../src/application/personal/guardarPersonales"
import { crearFamiliar } from "../src/application/personal/crearFamiliar"
import { eliminarFamiliar } from "../src/application/personal/eliminarFamiliar"
import { crearFormacion } from "../src/application/personal/crearFormacion"
import { eliminarFormacion } from "../src/application/personal/eliminarFormacion"
import { crearExperiencia } from "../src/application/personal/crearExperiencia"
import { eliminarExperiencia } from "../src/application/personal/eliminarExperiencia"
import { guardarSalarial } from "../src/application/personal/guardarSalarial"
import { editarContractual } from "../src/application/personal/editarContractual"
import { crearUrlSubidaFoto } from "../src/application/personal/crearUrlSubidaFoto"
import { guardarFoto } from "../src/application/personal/guardarFoto"
import { obtenerUrlFoto } from "../src/application/personal/obtenerUrlFoto"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../src/application/errors"
import { hacerUsuario } from "./_fixtures"

const NO_GESTOR = ["CONTROL_INTERNO", "AREA", "SST"] as const
const UUID = "11111111-1111-4111-8111-111111111111"

const empleadoActivo = {
  id: UUID,
  documento: "1000",
  nombreCompleto: "Empleado Prueba",
  tipoVinculacion: "ADMINISTRATIVO" as const,
  cargo: "Analista",
  areaOrigen: "Sistemas",
  fechaIngreso: "2026-01-01",
  fechaFinContrato: null,
  fechaRetiro: null,
  correoInstitucional: null,
  telefono: null,
  estadoGlobal: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("crearEmpleado (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { crearEmpleado: vi.fn() } as any
    const uc = crearEmpleado({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), {
        documento: "1000",
        nombreCompleto: "X",
        tipoVinculacion: "ADMINISTRATIVO",
        cargo: "Analista",
        areaOrigen: "Sistemas",
      } as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearEmpleado).not.toHaveBeenCalled()
  })

  it("SUPERADMIN puede crear y delega al repo", async () => {
    const repo = { crearEmpleado: vi.fn().mockResolvedValue(empleadoActivo) } as any
    const uc = crearEmpleado({ repo })
    const input = {
      documento: "1000",
      nombreCompleto: "X",
      tipoVinculacion: "ADMINISTRATIVO",
      cargo: "Analista",
      areaOrigen: "Sistemas",
    } as any
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), input)
    expect(r).toBe(empleadoActivo)
    expect(repo.crearEmpleado).toHaveBeenCalledWith(input)
  })

  it("TALENTO_HUMANO puede crear", async () => {
    const repo = { crearEmpleado: vi.fn().mockResolvedValue(empleadoActivo) } as any
    const uc = crearEmpleado({ repo })
    await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), {} as any)
    expect(repo.crearEmpleado).toHaveBeenCalled()
  })
})

describe("editarEmpleado (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { editarEmpleado: vi.fn() } as any
    const uc = editarEmpleado({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, {
        cargo: "Nuevo",
      } as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.editarEmpleado).not.toHaveBeenCalled()
  })

  it("SUPERADMIN puede editar y delega id+datos", async () => {
    const repo = { editarEmpleado: vi.fn().mockResolvedValue(empleadoActivo) } as any
    const uc = editarEmpleado({ repo })
    await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, { cargo: "Nuevo" } as any)
    expect(repo.editarEmpleado).toHaveBeenCalledWith(UUID, { cargo: "Nuevo" })
  })
})

describe("finalizarContrato (puente a Paz y Salvo, solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { finalizarContrato: vi.fn() } as any
    const uc = finalizarContrato({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, "2026-06-01"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.finalizarContrato).not.toHaveBeenCalled()
  })

  it("transición feliz: ACTIVO → backfill + estadoGlobal PENDIENTE", async () => {
    const repo = {
      finalizarContrato: vi.fn().mockResolvedValue({ estadoGlobal: "PENDIENTE", hayRechazo: false }),
    } as any
    const uc = finalizarContrato({ repo })
    const actor = hacerUsuario({ rol: "TALENTO_HUMANO", nombre: "Laura TH" })
    const r = await uc(actor, UUID, "2026-06-01")
    expect(r).toEqual({ estadoGlobal: "PENDIENTE", hayRechazo: false })
    expect(repo.finalizarContrato).toHaveBeenCalledWith(UUID, "2026-06-01", "Laura TH")
  })

  it("TOCTOU: el repo rechaza un segundo intento (empleado ya en trámite) → 400 propagado", async () => {
    const repo = {
      finalizarContrato: vi
        .fn()
        .mockRejectedValue(new ErrorValidacion("El empleado ya está en trámite.")),
    } as any
    const uc = finalizarContrato({ repo })
    await expect(
      uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, "2026-06-01"),
    ).rejects.toBeInstanceOf(ErrorValidacion)
  })
})

describe("registrarNovedad (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { registrarNovedad: vi.fn() } as any
    const uc = registrarNovedad({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, {
        tipo: "CAMBIO_CARGO",
        motivo: "Ascenso",
        nuevoCargo: "Coordinador",
      } as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.registrarNovedad).not.toHaveBeenCalled()
  })

  it("SUPERADMIN registra y delega id+novedad+autor", async () => {
    const detalle = { empleado: empleadoActivo, novedades: [] }
    const repo = { registrarNovedad: vi.fn().mockResolvedValue(detalle) } as any
    const uc = registrarNovedad({ repo })
    const novedad = { tipo: "CAMBIO_CARGO", motivo: "Ascenso", nuevoCargo: "Coordinador" } as any
    const actor = hacerUsuario({ rol: "SUPERADMIN", nombre: "Admin" })
    const r = await uc(actor, UUID, novedad)
    expect(r).toBe(detalle)
    expect(repo.registrarNovedad).toHaveBeenCalledWith(UUID, novedad, "Admin")
  })
})

describe("listarEmpleados (solo SA/TH) — scoping del maestro", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { listarEmpleadosPaginado: vi.fn() } as any
    const uc = listarEmpleados({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null })),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.listarEmpleadosPaginado).not.toHaveBeenCalled()
  })

  it("delega el filtro al repo (el maestro incluye ACTIVO, a diferencia del catálogo de trámite)", async () => {
    const pagina = { items: [empleadoActivo], total: 1, pagina: 1, porPagina: 20 }
    const repo = { listarEmpleadosPaginado: vi.fn().mockResolvedValue(pagina) } as any
    const uc = listarEmpleados({ repo })
    const filtro = { q: "1000" }
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), filtro)
    expect(r).toBe(pagina)
    expect(repo.listarEmpleadosPaginado).toHaveBeenCalledWith(filtro)
  })
})

describe("obtenerEmpleado (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerEmpleado: vi.fn() } as any
    const uc = obtenerEmpleado({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerEmpleado).not.toHaveBeenCalled()
  })

  it("404 si el repo devuelve null", async () => {
    const repo = { obtenerEmpleado: vi.fn().mockResolvedValue(null) } as any
    const uc = obtenerEmpleado({ repo })
    await expect(uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID)).rejects.toBeInstanceOf(
      ErrorNoEncontrado,
    )
  })

  it("devuelve el detalle si existe", async () => {
    const detalle = { empleado: empleadoActivo, novedades: [] }
    const repo = { obtenerEmpleado: vi.fn().mockResolvedValue(detalle) } as any
    const uc = obtenerEmpleado({ repo })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID)
    expect(r).toBe(detalle)
  })
})

describe("veSalarial (visibilidad del bloque sensible)", () => {
  it("solo SUPERADMIN y TALENTO_HUMANO ven el salario", () => {
    expect(veSalarial("SUPERADMIN")).toBe(true)
    expect(veSalarial("TALENTO_HUMANO")).toBe(true)
    expect(veSalarial("CONTROL_INTERNO")).toBe(false)
    expect(veSalarial("AREA")).toBe(false)
    expect(veSalarial("SST")).toBe(false)
  })
})

describe("obtenerExpedientePersonal (expediente 360°, solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerExpediente: vi.fn() } as any
    const uc = obtenerExpedientePersonal({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerExpediente).not.toHaveBeenCalled()
  })

  it("404 si el repo devuelve null", async () => {
    const repo = { obtenerExpediente: vi.fn().mockResolvedValue(null) } as any
    const uc = obtenerExpedientePersonal({ repo })
    await expect(
      uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), UUID),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
  })

  it("SA/TH: pide el expediente CON el bloque salarial", async () => {
    const expediente = { empleado: empleadoActivo, salarialVisible: true }
    const repo = { obtenerExpediente: vi.fn().mockResolvedValue(expediente) } as any
    const uc = obtenerExpedientePersonal({ repo })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID)
    expect(r).toBe(expediente)
    expect(repo.obtenerExpediente).toHaveBeenCalledWith(UUID, true)
  })
})

// ── Hoja de vida 360°: captura por bloque satélite (Sprint 2) ────────────────

describe("guardarPersonales (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { guardarPersonales: vi.fn() } as any
    const uc = guardarPersonales({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, {} as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.guardarPersonales).not.toHaveBeenCalled()
  })

  it("SUPERADMIN puede guardar y delega id+datos", async () => {
    const datos = { genero: "FEMENINO" } as any
    const repo = { guardarPersonales: vi.fn().mockResolvedValue(datos) } as any
    const uc = guardarPersonales({ repo })
    await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, datos)
    expect(repo.guardarPersonales).toHaveBeenCalledWith(UUID, datos)
  })
})

describe("crearFamiliar / eliminarFamiliar (solo SA/TH)", () => {
  it.each(NO_GESTOR)("crearFamiliar rechaza a %s → 403", async (rol) => {
    const repo = { crearFamiliar: vi.fn() } as any
    const uc = crearFamiliar({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, {} as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearFamiliar).not.toHaveBeenCalled()
  })

  it.each(NO_GESTOR)("eliminarFamiliar rechaza a %s → 403", async (rol) => {
    const repo = { eliminarFamiliar: vi.fn() } as any
    const uc = eliminarFamiliar({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, "fam-1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.eliminarFamiliar).not.toHaveBeenCalled()
  })

  it("TALENTO_HUMANO crea y delega id+datos", async () => {
    const familiar = { id: "fam-1" } as any
    const repo = { crearFamiliar: vi.fn().mockResolvedValue(familiar) } as any
    const uc = crearFamiliar({ repo })
    const datos = { parentesco: "HIJO", nombre: "Juan" } as any
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), UUID, datos)
    expect(r).toBe(familiar)
    expect(repo.crearFamiliar).toHaveBeenCalledWith(UUID, datos)
  })

  it("eliminarFamiliar propaga 404 si el repo no encuentra la fila (ownership)", async () => {
    const repo = {
      eliminarFamiliar: vi.fn().mockRejectedValue(new ErrorNoEncontrado("El familiar no existe.")),
    } as any
    const uc = eliminarFamiliar({ repo })
    await expect(
      uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, "fam-ajeno"),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
  })
})

describe("crearFormacion / eliminarFormacion (solo SA/TH)", () => {
  it.each(NO_GESTOR)("crearFormacion rechaza a %s → 403", async (rol) => {
    const repo = { crearFormacion: vi.fn() } as any
    const uc = crearFormacion({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, {} as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearFormacion).not.toHaveBeenCalled()
  })

  it.each(NO_GESTOR)("eliminarFormacion rechaza a %s → 403", async (rol) => {
    const repo = { eliminarFormacion: vi.fn() } as any
    const uc = eliminarFormacion({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, "for-1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.eliminarFormacion).not.toHaveBeenCalled()
  })

  it("SUPERADMIN crea y delega id+datos", async () => {
    const formacion = { id: "for-1" } as any
    const repo = { crearFormacion: vi.fn().mockResolvedValue(formacion) } as any
    const uc = crearFormacion({ repo })
    const datos = { nivel: "PROFESIONAL", titulo: "Ingeniería" } as any
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, datos)
    expect(r).toBe(formacion)
    expect(repo.crearFormacion).toHaveBeenCalledWith(UUID, datos)
  })
})

describe("crearExperiencia / eliminarExperiencia (solo SA/TH)", () => {
  it.each(NO_GESTOR)("crearExperiencia rechaza a %s → 403", async (rol) => {
    const repo = { crearExperiencia: vi.fn() } as any
    const uc = crearExperiencia({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, {} as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.crearExperiencia).not.toHaveBeenCalled()
  })

  it.each(NO_GESTOR)("eliminarExperiencia rechaza a %s → 403", async (rol) => {
    const repo = { eliminarExperiencia: vi.fn() } as any
    const uc = eliminarExperiencia({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, "exp-1"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.eliminarExperiencia).not.toHaveBeenCalled()
  })

  it("TALENTO_HUMANO crea y delega id+datos", async () => {
    const experiencia = { id: "exp-1" } as any
    const repo = { crearExperiencia: vi.fn().mockResolvedValue(experiencia) } as any
    const uc = crearExperiencia({ repo })
    const datos = { empresa: "Acme", cargo: "Analista" } as any
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), UUID, datos)
    expect(r).toBe(experiencia)
    expect(repo.crearExperiencia).toHaveBeenCalledWith(UUID, datos)
  })
})

describe("guardarSalarial (SENSIBLE, doble guarda SA/TH + veSalarial)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { guardarSalarial: vi.fn() } as any
    const uc = guardarSalarial({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, {} as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.guardarSalarial).not.toHaveBeenCalled()
  })

  it("SUPERADMIN puede guardar y delega id+datos", async () => {
    const datos = { salarioBasico: 2_000_000 } as any
    const repo = { guardarSalarial: vi.fn().mockResolvedValue(datos) } as any
    const uc = guardarSalarial({ repo })
    await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, datos)
    expect(repo.guardarSalarial).toHaveBeenCalledWith(UUID, datos)
  })
})

describe("editarContractual (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { editarContractual: vi.fn() } as any
    const uc = editarContractual({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, {
        tipoContrato: "TERMINO_FIJO",
      } as any),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.editarContractual).not.toHaveBeenCalled()
  })

  it("SUPERADMIN edita y delega id+datos", async () => {
    const contractual = { tipoContrato: "TERMINO_FIJO" } as any
    const repo = { editarContractual: vi.fn().mockResolvedValue(contractual) } as any
    const uc = editarContractual({ repo })
    const datos = { tipoContrato: "TERMINO_FIJO" } as any
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, datos)
    expect(r).toBe(contractual)
    expect(repo.editarContractual).toHaveBeenCalledWith(UUID, datos)
  })
})

describe("crearUrlSubidaFoto (solo SA/TH, valida extensión)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const storage = { crearUrlSubidaFoto: vi.fn() } as any
    const uc = crearUrlSubidaFoto({ storage })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, "jpg"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(storage.crearUrlSubidaFoto).not.toHaveBeenCalled()
  })

  it("rechaza una extensión no soportada → 400", async () => {
    const storage = { crearUrlSubidaFoto: vi.fn() } as any
    const uc = crearUrlSubidaFoto({ storage })
    await expect(
      uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, "exe"),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(storage.crearUrlSubidaFoto).not.toHaveBeenCalled()
  })

  it("SUPERADMIN pide la URL y delega id+extensión", async () => {
    const url = { path: `${UUID}/foto.jpg`, signedUrl: "https://…", token: "t" }
    const storage = { crearUrlSubidaFoto: vi.fn().mockResolvedValue(url) } as any
    const uc = crearUrlSubidaFoto({ storage })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, "JPG")
    expect(r).toBe(url)
    expect(storage.crearUrlSubidaFoto).toHaveBeenCalledWith(UUID, "jpg")
  })
})

describe("guardarFoto (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { guardarFotoPath: vi.fn() } as any
    const uc = guardarFoto({ repo })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID, "path.jpg"),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.guardarFotoPath).not.toHaveBeenCalled()
  })

  it("SUPERADMIN persiste la ruta (o null para borrar)", async () => {
    const contractual = { fotoPath: null } as any
    const repo = { guardarFotoPath: vi.fn().mockResolvedValue(contractual) } as any
    const uc = guardarFoto({ repo })
    await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID, null)
    expect(repo.guardarFotoPath).toHaveBeenCalledWith(UUID, null)
  })
})

describe("obtenerUrlFoto (solo SA/TH)", () => {
  it.each(NO_GESTOR)("rechaza a %s → 403", async (rol) => {
    const repo = { obtenerFotoPath: vi.fn() } as any
    const storage = { crearUrlLecturaFoto: vi.fn() } as any
    const uc = obtenerUrlFoto({ repo, storage })
    await expect(
      uc(hacerUsuario({ rol, areaId: rol === "AREA" ? "a1" : null }), UUID),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.obtenerFotoPath).not.toHaveBeenCalled()
  })

  it("null si el empleado no tiene foto (no llama a Storage)", async () => {
    const repo = { obtenerFotoPath: vi.fn().mockResolvedValue(null) } as any
    const storage = { crearUrlLecturaFoto: vi.fn() } as any
    const uc = obtenerUrlFoto({ repo, storage })
    const r = await uc(hacerUsuario({ rol: "SUPERADMIN" }), UUID)
    expect(r).toBeNull()
    expect(storage.crearUrlLecturaFoto).not.toHaveBeenCalled()
  })

  it("pide la URL firmada de la ruta guardada", async () => {
    const repo = { obtenerFotoPath: vi.fn().mockResolvedValue(`${UUID}/foto.jpg`) } as any
    const storage = { crearUrlLecturaFoto: vi.fn().mockResolvedValue({ url: "https://…" }) } as any
    const uc = obtenerUrlFoto({ repo, storage })
    const r = await uc(hacerUsuario({ rol: "TALENTO_HUMANO" }), UUID)
    expect(r).toEqual({ url: "https://…" })
    expect(storage.crearUrlLecturaFoto).toHaveBeenCalledWith(`${UUID}/foto.jpg`)
  })
})
