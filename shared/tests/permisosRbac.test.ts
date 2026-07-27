import { describe, it, expect } from "vitest"
import { MODULOS, ROLES_USUARIO } from "../src/index"
import {
  modulosVisiblesDesdeMatriz,
  nivelPorDefecto,
  nivelSuficiente,
  permisosSeedPorDefecto,
  type CeldaPermiso,
} from "../src/permisosRbac"

describe("nivelSuficiente", () => {
  it("respeta el orden NINGUNO < LECTURA < ESCRITURA < ADMIN", () => {
    expect(nivelSuficiente("ADMIN", "LECTURA")).toBe(true)
    expect(nivelSuficiente("ESCRITURA", "ESCRITURA")).toBe(true)
    expect(nivelSuficiente("LECTURA", "ESCRITURA")).toBe(false)
    expect(nivelSuficiente("NINGUNO", "LECTURA")).toBe(false)
  })
})

describe("nivelPorDefecto (derivado de MODULOS.rolesQueVen)", () => {
  it("da ADMIN al SUPERADMIN en un módulo que ve", () => {
    expect(nivelPorDefecto("SUPERADMIN", "paz-y-salvo")).toBe("ADMIN")
  })

  it("da ESCRITURA a otros roles en un módulo que ven", () => {
    expect(nivelPorDefecto("CONTROL_INTERNO", "paz-y-salvo")).toBe("ESCRITURA")
  })

  it("da NINGUNO cuando el módulo no es visible para el rol", () => {
    // CONTROL_INTERNO no está en rolesQueVen de personal.
    expect(nivelPorDefecto("CONTROL_INTERNO", "personal")).toBe("NINGUNO")
  })

  it("da NINGUNO para un módulo inexistente", () => {
    expect(nivelPorDefecto("SUPERADMIN", "no-existe")).toBe("NINGUNO")
  })
})

describe("permisosSeedPorDefecto", () => {
  it("cubre todas las combinaciones rol × módulo (matriz completa)", () => {
    const seed = permisosSeedPorDefecto()
    expect(seed).toHaveLength(ROLES_USUARIO.length * MODULOS.length)
    // Cada celda es consistente con nivelPorDefecto.
    for (const c of seed) {
      expect(c.nivel).toBe(nivelPorDefecto(c.rol, c.moduloId))
    }
  })

  it("equivale a la visibilidad declarada en MODULOS (nadie pierde acceso)", () => {
    const seed = permisosSeedPorDefecto()
    for (const rol of ROLES_USUARIO) {
      const visibles = modulosVisiblesDesdeMatriz(seed, rol).sort()
      const esperados = MODULOS.filter((m) => m.rolesQueVen.includes(rol))
        .map((m) => m.id)
        .sort()
      expect(visibles).toEqual(esperados)
    }
  })
})

describe("modulosVisiblesDesdeMatriz", () => {
  it("una celda en NINGUNO oculta el módulo aunque el rol lo viera por defecto", () => {
    const celdas: CeldaPermiso[] = [
      { rol: "TALENTO_HUMANO", moduloId: "vacantes", nivel: "NINGUNO" },
    ]
    expect(modulosVisiblesDesdeMatriz(celdas, "TALENTO_HUMANO")).not.toContain("vacantes")
  })

  it("cae al default para módulos sin celda explícita", () => {
    // Sin celdas, TH ve sus módulos por defecto (incluye personal).
    expect(modulosVisiblesDesdeMatriz([], "TALENTO_HUMANO")).toContain("personal")
  })
})
