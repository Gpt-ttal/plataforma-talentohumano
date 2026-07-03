import { describe, it, expect } from "vitest"
import { trimestreDe } from "../src/planificador"

describe("trimestreDe", () => {
  it("enero–marzo caen en el trimestre 1", () => {
    expect(trimestreDe(1)).toBe(1)
    expect(trimestreDe(2)).toBe(1)
    expect(trimestreDe(3)).toBe(1)
  })
  it("abril–junio caen en el trimestre 2", () => {
    expect(trimestreDe(4)).toBe(2)
    expect(trimestreDe(5)).toBe(2)
    expect(trimestreDe(6)).toBe(2)
  })
  it("julio–septiembre caen en el trimestre 3", () => {
    expect(trimestreDe(7)).toBe(3)
    expect(trimestreDe(8)).toBe(3)
    expect(trimestreDe(9)).toBe(3)
  })
  it("octubre–diciembre caen en el trimestre 4", () => {
    expect(trimestreDe(10)).toBe(4)
    expect(trimestreDe(11)).toBe(4)
    expect(trimestreDe(12)).toBe(4)
  })
})
