import { describe, it, expect } from "vitest"
import { eq } from "drizzle-orm"
import { db } from "../src/infrastructure/db/client"
import { funcionarios } from "../src/infrastructure/db/schema"
import { funcionarioRepository } from "../src/infrastructure/db/funcionarioRepository"
import { ErrorValidacion } from "../src/application/errors"

/**
 * `crearEmpleado` ya tiene un pre-chequeo amigable (SELECT antes del insert),
 * pero si la carrera ocurre igual (dos requests casi simultáneos con el mismo
 * documento pasan el pre-chequeo antes de que cualquiera confirme), el INSERT
 * viola `UNIQUE(documento)` (código Postgres 23505) — debe traducirse al mismo
 * `ErrorValidacion` de la ruta feliz, no salir como 500 crudo.
 *
 * Gated por DATABASE_URL_TEST (la traducción del código de error solo se
 * ejerce contra Postgres real).
 */
const DB = process.env.DATABASE_URL_TEST

async function limpiar(documento: string) {
  await db.delete(funcionarios).where(eq(funcionarios.documento, documento))
}

describe.skipIf(!DB)("crearEmpleado — violación de UNIQUE(documento) (integración)", () => {
  it("dos creaciones concurrentes con el mismo documento: una gana, la otra recibe ErrorValidacion (no 500)", async () => {
    const documento = `RACE-${crypto.randomUUID()}`
    const datos = {
      documento,
      nombreCompleto: "Test Race",
      tipoVinculacion: "ADMINISTRATIVO" as const,
      cargo: "Analista",
      areaOrigen: "Sistemas",
    }
    try {
      const resultados = await Promise.allSettled([
        funcionarioRepository.crearEmpleado(datos),
        funcionarioRepository.crearEmpleado(datos),
      ])

      const exitosos = resultados.filter((r) => r.status === "fulfilled")
      const fallidos = resultados.filter((r) => r.status === "rejected")

      expect(exitosos).toHaveLength(1)
      expect(fallidos).toHaveLength(1)
      const razon = (fallidos[0] as PromiseRejectedResult).reason
      expect(razon).toBeInstanceOf(ErrorValidacion)
    } finally {
      await limpiar(documento)
    }
  })
})
