import { describe, it, expect } from "vitest"
import { calcularProgreso, cursoAccesible } from "../src/cursos"

describe("cursoAccesible", () => {
  it("BORRADOR no es accesible (aún no publicado)", () => {
    expect(cursoAccesible("BORRADOR")).toBe(false)
  })
  it("ABIERTO es accesible (acepta gente nueva)", () => {
    expect(cursoAccesible("ABIERTO")).toBe(true)
  })
  it("CERRADO sigue siendo accesible para quien ya lo estaba tomando", () => {
    expect(cursoAccesible("CERRADO")).toBe(true)
  })
})

describe("calcularProgreso", () => {
  it("calcula el porcentaje redondeado", () => {
    expect(calcularProgreso(4, 1)).toEqual({
      totalLecciones: 4,
      completadas: 1,
      porcentaje: 25,
    })
    expect(calcularProgreso(3, 1)).toEqual({
      totalLecciones: 3,
      completadas: 1,
      porcentaje: 33,
    })
  })
  it("0 lecciones da 0% (no NaN/Infinity)", () => {
    expect(calcularProgreso(0, 0)).toEqual({
      totalLecciones: 0,
      completadas: 0,
      porcentaje: 0,
    })
  })
  it("todas completadas da 100%", () => {
    expect(calcularProgreso(5, 5)).toEqual({
      totalLecciones: 5,
      completadas: 5,
      porcentaje: 100,
    })
  })
})
