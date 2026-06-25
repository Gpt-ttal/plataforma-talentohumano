import { describe, it, expect } from "vitest"
import { usuarioRepository } from "../src/infrastructure/db/usuarioRepository"

const DB = process.env.DATABASE_URL_TEST
describe.skipIf(!DB)("usuarioRepository (integración)", () => {
  it("crea y recupera por email (normalizado)", async () => {
    const id = crypto.randomUUID()
    await usuarioRepository.crearUsuario({
      id,
      email: "  Test@Americana.edu.co ",
      nombre: "T",
      rol: "AREA",
      estado: "PENDIENTE",
    })
    const u = await usuarioRepository.obtenerUsuarioPorEmail(
      "test@americana.edu.co",
    )
    expect(u?.id).toBe(id)
  })
})
