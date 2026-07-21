import { describe, it, expect, vi } from "vitest"
import { paramUuid } from "../src/interface/middleware/paramUuid"
import { ErrorValidacion } from "../src/application/errors"

/**
 * `paramUuid` se registra vía `router.param(nombre, ...)`, cuya firma de
 * callback es `(req, res, next, valor, nombre)`. Aquí se prueba directo, sin
 * levantar Express, mismo patrón que `requireAuth.test.ts`.
 */
describe("paramUuid", () => {
  it("UUID válido → next() sin error", () => {
    const next = vi.fn()
    paramUuid("id")({} as any, {} as any, next, "550e8400-e29b-41d4-a716-446655440000")
    expect(next).toHaveBeenCalledWith()
  })

  it("UUID en mayúsculas → next() sin error (case-insensitive)", () => {
    const next = vi.fn()
    paramUuid("id")({} as any, {} as any, next, "550E8400-E29B-41D4-A716-446655440000")
    expect(next).toHaveBeenCalledWith()
  })

  it("valor no-UUID → next(ErrorValidacion 400), no next() vacío", () => {
    const next = vi.fn()
    paramUuid("id")({} as any, {} as any, next, "abc")
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(ErrorValidacion)
    expect(err.status).toBe(400)
  })
})
