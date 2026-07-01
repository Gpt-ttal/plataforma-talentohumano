import { describe, it, expect } from "vitest"
import { estadoInicialAreaNueva, soloActivas } from "../src/areas"
import type { AreaVistoBueno } from "../src/domain"

describe("estadoInicialAreaNueva (D1 — backfill al crear área)", () => {
  it("un trámite cerrado (PAZ_Y_SALVO) recibe la nueva área como NO_APLICA (no se reabre)", () => {
    expect(estadoInicialAreaNueva("PAZ_Y_SALVO")).toBe("NO_APLICA")
  })
  it.each(["PENDIENTE", "LISTO_PARA_LIQUIDAR", "LIQUIDACION_GENERADA"] as const)(
    "un trámite en proceso (%s) recibe la nueva área como PENDIENTE",
    (estado) => {
      expect(estadoInicialAreaNueva(estado)).toBe("PENDIENTE")
    },
  )
})

describe("soloActivas (D2 — solo las activas participan)", () => {
  const area = (orden: number, activa: boolean): AreaVistoBueno => ({
    id: `a${orden}`,
    nombre: `Área ${orden}`,
    orden,
    activa,
  })

  it("filtra las áreas inactivas y conserva el orden", () => {
    const areas = [area(1, true), area(2, false), area(3, true)]
    expect(soloActivas(areas)).toEqual([area(1, true), area(3, true)])
  })
  it("sin áreas activas devuelve lista vacía", () => {
    expect(soloActivas([area(1, false)])).toEqual([])
  })
})
