import { describe, expect, it } from "vitest"
import { mapFuncionario } from "../src/infrastructure/db/funcionarioRepository"

// Regresión de I2 (auditoría Sesión 39): `mapFuncionario` fabricaba el string
// literal "null" vía `String(r.fechaRetiro)` cuando la fila traía `fecha_retiro`
// NULL (un empleado ACTIVO del maestro de Personal). Ese "null" viajaba a la API
// en `GET /api/funcionarios/:id` y `/api/archivo/:id`. El scope de las lecturas de
// trámite ya no deja pasar filas ACTIVAS, pero el mapper es la última línea de
// defensa: nunca debe producir "null".
function fila(over: Record<string, unknown> = {}): any {
  const ahora = new Date("2026-07-04T10:00:00.000Z")
  return {
    id: "f1",
    documento: "123",
    nombreCompleto: "Ada Lovelace",
    fechaRetiro: "2026-05-01",
    areaOrigen: "Sistemas",
    cargo: "Analista",
    estadoGlobal: "PENDIENTE",
    fechaLiquidacionGenerada: null,
    liquidacionGeneradaPor: null,
    fechaLiquidacion: null,
    liquidadoPor: null,
    createdAt: ahora,
    updatedAt: ahora,
    ...over,
  }
}

describe("mapFuncionario · proyección de trámite (I2)", () => {
  it("nunca fabrica el string 'null' cuando fecha_retiro es NULL", () => {
    const f = mapFuncionario(fila({ fechaRetiro: null }))
    expect(f.fechaRetiro).toBe("")
    expect(f.fechaRetiro).not.toBe("null")
  })

  it("propaga la fecha de retiro real sin transformarla", () => {
    const f = mapFuncionario(fila({ fechaRetiro: "2026-05-01" }))
    expect(f.fechaRetiro).toBe("2026-05-01")
  })
})
