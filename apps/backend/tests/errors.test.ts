import { describe, it, expect } from "vitest"
import {
  ErrorAutorizacion,
  ErrorValidacion,
  ErrorNoEncontrado,
} from "../src/application/errors"

describe("errores tipados de aplicación", () => {
  it("ErrorAutorizacion tiene status 403", () => {
    const e = new ErrorAutorizacion("sin permiso")
    expect(e).toBeInstanceOf(Error)
    expect(e.status).toBe(403)
    expect(e.message).toBe("sin permiso")
  })

  it("ErrorValidacion tiene status 400", () => {
    const e = new ErrorValidacion("dato inválido")
    expect(e).toBeInstanceOf(Error)
    expect(e.status).toBe(400)
  })

  it("ErrorNoEncontrado tiene status 404", () => {
    const e = new ErrorNoEncontrado("no existe")
    expect(e).toBeInstanceOf(Error)
    expect(e.status).toBe(404)
  })
})
