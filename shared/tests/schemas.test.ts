import { describe, it, expect } from "vitest"
import {
  asignarRolSchema,
  cambiarEstadoAreaSchema,
  cambiarEstadoUsuarioSchema,
  filtroFuncionariosSchema,
} from "../src/schemas"

const UUID_A = "11111111-1111-4111-8111-111111111111"
const UUID_B = "22222222-2222-4222-8222-222222222222"

describe("cambiarEstadoAreaSchema", () => {
  it("rechaza estado inválido", () => {
    const r = cambiarEstadoAreaSchema.safeParse({ funcionarioId: UUID_A, areaId: UUID_B, estado: "XXX" })
    expect(r.success).toBe(false)
  })
  it("acepta payload válido con observación opcional", () => {
    const r = cambiarEstadoAreaSchema.safeParse({ funcionarioId: UUID_A, areaId: UUID_B, estado: "APROBADO" })
    expect(r.success).toBe(true)
  })
  it("rechaza IDs que no son UUID", () => {
    const r = cambiarEstadoAreaSchema.safeParse({ funcionarioId: "f1", areaId: "a1", estado: "APROBADO" })
    expect(r.success).toBe(false)
  })
  it("rechaza una observación que queda vacía tras recortar", () => {
    const r = cambiarEstadoAreaSchema.safeParse({
      funcionarioId: UUID_A,
      areaId: UUID_B,
      estado: "NO_APROBADO",
      observacion: "   ",
    })
    expect(r.success).toBe(false)
  })
  it("rechaza claves extra (.strict)", () => {
    const r = cambiarEstadoAreaSchema.safeParse({
      funcionarioId: UUID_A,
      areaId: UUID_B,
      estado: "APROBADO",
      malicioso: true,
    })
    expect(r.success).toBe(false)
  })
})

describe("asignarRolSchema", () => {
  it("acepta rol válido con areaId UUID o null", () => {
    expect(asignarRolSchema.safeParse({ usuarioId: UUID_A, rol: "AREA", areaId: UUID_B }).success).toBe(true)
    expect(asignarRolSchema.safeParse({ usuarioId: UUID_A, rol: "TALENTO_HUMANO", areaId: null }).success).toBe(true)
  })
  it("rechaza rol inválido", () => {
    expect(asignarRolSchema.safeParse({ usuarioId: UUID_A, rol: "ROOT" }).success).toBe(false)
  })
  it("rechaza claves extra (.strict)", () => {
    expect(
      asignarRolSchema.safeParse({ usuarioId: UUID_A, rol: "AREA", areaId: UUID_B, x: 1 }).success,
    ).toBe(false)
  })
})

describe("cambiarEstadoUsuarioSchema", () => {
  it("acepta un estado de usuario válido", () => {
    expect(cambiarEstadoUsuarioSchema.safeParse({ usuarioId: UUID_A, estado: "INACTIVO" }).success).toBe(true)
  })
  it("rechaza estado inválido", () => {
    expect(cambiarEstadoUsuarioSchema.safeParse({ usuarioId: UUID_A, estado: "BORRADO" }).success).toBe(false)
  })
})

describe("filtroFuncionariosSchema (coerción y topes)", () => {
  it("coacciona strings numéricos de pagina/porPagina", () => {
    const r = filtroFuncionariosSchema.safeParse({ pagina: "2", porPagina: "10" })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.pagina).toBe(2)
      expect(r.data.porPagina).toBe(10)
    }
  })
  it("rechaza pagina < 1", () => {
    expect(filtroFuncionariosSchema.safeParse({ pagina: "0" }).success).toBe(false)
  })
  it("rechaza porPagina por encima del tope (max 100, anti-DoS)", () => {
    expect(filtroFuncionariosSchema.safeParse({ porPagina: "999" }).success).toBe(false)
  })
})
