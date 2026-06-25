import { describe, it, expect } from "vitest"
import { eq } from "drizzle-orm"
import { db } from "../src/infrastructure/db/client"
import {
  aprobaciones,
  areas,
  funcionarios,
  observaciones,
} from "../src/infrastructure/db/schema"
import { funcionarioRepository } from "../src/infrastructure/db/funcionarioRepository"

/**
 * Regresión de concurrencia (prueba "sin desincronización", §5.1 del plan).
 *
 * Dos áreas aprueban el MISMO funcionario casi a la vez. Sin el row-lock
 * (`FOR UPDATE` sobre la fila del funcionario en `cambiarEstadoArea`), cada
 * transacción recomputa sin ver la escritura no confirmada de la otra y ambas
 * concluyen "no todas OK" → el estado global se queda en PENDIENTE aunque ambas
 * áreas terminen APROBADAS. Con el lock, la 2ª transacción espera y recomputa
 * contra la escritura ya confirmada → sube a LISTO_PARA_LIQUIDAR.
 *
 * Gated por DATABASE_URL_TEST (mismo patrón que el resto de tests de integración).
 * Se corren varias iteraciones porque el race es dependiente del scheduling.
 */
const DB = process.env.DATABASE_URL_TEST
const ITERACIONES = 10

async function montarFuncionarioConDosAreasPendientes(documento: string) {
  const dosAreas = await db.select({ id: areas.id }).from(areas).limit(2)
  if (dosAreas.length < 2) throw new Error("El test necesita ≥2 áreas sembradas.")

  const [f] = await db
    .insert(funcionarios)
    .values({
      documento,
      nombreCompleto: "Test Concurrencia",
      fechaRetiro: "2026-01-01",
      areaOrigen: "Test",
      cargo: "Test",
      estadoGlobal: "PENDIENTE",
    })
    .returning({ id: funcionarios.id })

  await db.insert(aprobaciones).values(
    dosAreas.map((a) => ({
      funcionarioId: f.id,
      areaId: a.id,
      estado: "PENDIENTE" as const,
    })),
  )

  return { funcionarioId: f.id, areaIds: dosAreas.map((a) => a.id) }
}

async function limpiar(funcionarioId: string) {
  await db.delete(observaciones).where(eq(observaciones.funcionarioId, funcionarioId))
  await db.delete(aprobaciones).where(eq(aprobaciones.funcionarioId, funcionarioId))
  await db.delete(funcionarios).where(eq(funcionarios.id, funcionarioId))
}

describe.skipIf(!DB)("cambiarEstadoArea — concurrencia (integración)", () => {
  it("dos áreas aprobando el mismo funcionario en paralelo dejan el estado en LISTO_PARA_LIQUIDAR", async () => {
    for (let i = 0; i < ITERACIONES; i++) {
      const documento = `CONCURRENCIA-${crypto.randomUUID()}`
      const { funcionarioId, areaIds } =
        await montarFuncionarioConDosAreasPendientes(documento)
      try {
        // Las dos aprobaciones salen a la vez: aquí está el race.
        await Promise.all(
          areaIds.map((areaId) =>
            funcionarioRepository.cambiarEstadoArea({
              funcionarioId,
              areaId,
              estado: "APROBADO",
              autor: "Test",
            }),
          ),
        )

        const [f] = await db
          .select({ estadoGlobal: funcionarios.estadoGlobal })
          .from(funcionarios)
          .where(eq(funcionarios.id, funcionarioId))

        expect(
          f.estadoGlobal,
          `iteración ${i}: ambas áreas APROBADO pero estado quedó en ${f.estadoGlobal}`,
        ).toBe("LISTO_PARA_LIQUIDAR")
      } finally {
        await limpiar(funcionarioId)
      }
    }
  })
})
