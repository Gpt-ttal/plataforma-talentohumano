import { describe, it, expect } from "vitest"
import { asc, eq } from "drizzle-orm"
import { db } from "../src/infrastructure/db/client"
import { funcionarios, novedades } from "../src/infrastructure/db/schema"
import { funcionarioRepository } from "../src/infrastructure/db/funcionarioRepository"

/**
 * Regresión de concurrencia (mismo molde que `concurrencia-estadoArea.integration.test.ts`).
 *
 * Dos ediciones de cargo del MISMO empleado casi a la vez. Sin el row-lock
 * (`FOR UPDATE` sobre la fila del empleado en `registrarNovedad`), ambas
 * transacciones leen el mismo `cargo` "viejo" bajo READ COMMITTED y la
 * bitácora append-only queda con un `valorAnterior` factualmente incorrecto en
 * la segunda fila (se pierde el valor intermedio real). Con el lock, la 2ª
 * transacción espera y lee el cargo ya confirmado por la 1ª.
 *
 * Gated por DATABASE_URL_TEST. Varias iteraciones porque el race depende del scheduling.
 */
const DB = process.env.DATABASE_URL_TEST
const ITERACIONES = 10

async function montarEmpleado(documento: string) {
  const [f] = await db
    .insert(funcionarios)
    .values({
      documento,
      nombreCompleto: "Test Concurrencia Personal",
      areaOrigen: "Test",
      cargo: "Cargo Inicial",
      estadoGlobal: "PENDIENTE",
      fechaRetiro: null,
    })
    .returning({ id: funcionarios.id })
  return f.id
}

async function limpiar(funcionarioId: string) {
  await db.delete(novedades).where(eq(novedades.funcionarioId, funcionarioId))
  await db.delete(funcionarios).where(eq(funcionarios.id, funcionarioId))
}

describe.skipIf(!DB)("registrarNovedad — concurrencia (integración)", () => {
  it("dos cambios de cargo concurrentes sobre el mismo empleado producen una bitácora encadenada sin salto", async () => {
    for (let i = 0; i < ITERACIONES; i++) {
      const documento = `CONCURRENCIA-PERSONAL-${crypto.randomUUID()}`
      const funcionarioId = await montarEmpleado(documento)
      try {
        await Promise.all([
          funcionarioRepository.registrarNovedad(
            funcionarioId,
            { tipo: "CAMBIO_CARGO", motivo: "Ascenso A", nuevoCargo: "Cargo A" },
            "Test A",
          ),
          funcionarioRepository.registrarNovedad(
            funcionarioId,
            { tipo: "CAMBIO_CARGO", motivo: "Ascenso B", nuevoCargo: "Cargo B" },
            "Test B",
          ),
        ])

        const filas = await db
          .select({ valorAnterior: novedades.valorAnterior, valorNuevo: novedades.valorNuevo })
          .from(novedades)
          .where(eq(novedades.funcionarioId, funcionarioId))
          .orderBy(asc(novedades.createdAt))

        expect(filas, `iteración ${i}: se esperaban 2 novedades`).toHaveLength(2)
        // Encadenado: el valorAnterior de la 2ª fila debe ser el valorNuevo de la 1ª
        // (nunca el "Cargo Inicial" original — eso sería el salto que el lock evita).
        expect(
          filas[1].valorAnterior,
          `iteración ${i}: la bitácora no quedó encadenada correctamente: ${JSON.stringify(filas)}`,
        ).toBe(filas[0].valorNuevo)
      } finally {
        await limpiar(funcionarioId)
      }
    }
  })
})
