import { describe, it, expect } from "vitest"
import { and, eq, sql } from "drizzle-orm"
import { db } from "../src/infrastructure/db/client"
import {
  aprobaciones,
  areas,
  funcionarios,
  observaciones,
} from "../src/infrastructure/db/schema"
import { funcionarioRepository } from "../src/infrastructure/db/funcionarioRepository"
import { areaRepository } from "../src/infrastructure/db/areaRepository"
import { iniciarTramiteDesvinculacion } from "../src/infrastructure/db/iniciarTramiteDesvinculacion"

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

/**
 * Regresión F1 (bug de correctitud): reactivar un área debe re-sembrar su
 * aprobación PENDIENTE en los trámites en curso nacidos mientras estaba inactiva.
 *
 * `iniciarTramiteDesvinculacion` solo siembra áreas ACTIVAS, así que un trámite
 * iniciado con el área desactivada no tiene fila para ella; `recomputarEstado`
 * hace innerJoin `activa=true`, por lo que al reactivarla el área "reaparece"
 * en el cálculo pero sin fila del trámite → el trámite podría estar (o quedarse)
 * LISTO_PARA_LIQUIDAR sin su visto bueno. La corrección siembra la fila faltante
 * dentro de `cambiarActivaArea` y recalcula.
 *
 * Gated por DATABASE_URL_TEST (igual que el resto de integración).
 */
async function crearAreaAisladaActiva(nombre: string): Promise<string> {
  // Inserción directa (no `crearArea`) para NO backfillear a todos los
  // funcionarios del DB de test: el escenario solo necesita un funcionario.
  const [agg] = await db
    .select({ max: sql<number | null>`max(${areas.orden})` })
    .from(areas)
  const orden = (agg?.max ?? 0) + 1
  const [a] = await db
    .insert(areas)
    .values({ nombre, orden, activa: true })
    .returning({ id: areas.id })
  return a.id
}

async function crearEmpleadoActivo(documento: string): Promise<string> {
  // Sin `fechaRetiro` ⇒ empleado ACTIVO (proyección maestro), requisito de
  // `iniciarTramiteDesvinculacion` (guarda TOCTOU: solo dispara si está activo).
  const [f] = await db
    .insert(funcionarios)
    .values({
      documento,
      nombreCompleto: "Test Reactivación F1",
      areaOrigen: "Test",
      cargo: "Test",
      estadoGlobal: "PENDIENTE",
    })
    .returning({ id: funcionarios.id })
  return f.id
}

async function limpiarArea(areaId: string) {
  await db.delete(aprobaciones).where(eq(aprobaciones.areaId, areaId))
  await db.delete(areas).where(eq(areas.id, areaId))
}

describe.skipIf(!DB)("cambiarActivaArea — reactivación re-siembra aprobaciones (integración)", () => {
  it("reactivar un área siembra su aprobación PENDIENTE en trámites en curso y baja el estado global", async () => {
    const documento = `REACTIVACION-${crypto.randomUUID()}`
    const nombreArea = `Bloqueante F1 ${crypto.randomUUID()}`

    // Área creada activa y desactivada por el camino real antes de que exista el trámite.
    const idBloqueante = await crearAreaAisladaActiva(nombreArea)
    await areaRepository.cambiarActivaArea(idBloqueante, false)

    const funcionarioId = await crearEmpleadoActivo(documento)
    try {
      // Inicia trámite con el área inactiva ⇒ NO recibe fila para "Bloqueante F1".
      await db.transaction((tx) =>
        iniciarTramiteDesvinculacion(
          { id: funcionarioId, fechaRetiro: "2026-07-25", autor: "test" },
          tx,
        ),
      )

      // Aprobar todas las áreas sí sembradas (activas ≠ Bloqueante) para que suba.
      const sembradas = await db
        .select({ areaId: aprobaciones.areaId })
        .from(aprobaciones)
        .where(eq(aprobaciones.funcionarioId, funcionarioId))
      for (const { areaId } of sembradas) {
        await funcionarioRepository.cambiarEstadoArea({
          funcionarioId,
          areaId,
          estado: "APROBADO",
          autor: "test",
        })
      }
      const [antes] = await db
        .select({ estadoGlobal: funcionarios.estadoGlobal })
        .from(funcionarios)
        .where(eq(funcionarios.id, funcionarioId))
      expect(
        antes.estadoGlobal,
        "precondición: sin Bloqueante activa el trámite sube a LISTO_PARA_LIQUIDAR",
      ).toBe("LISTO_PARA_LIQUIDAR")

      // Acción bajo prueba.
      await areaRepository.cambiarActivaArea(idBloqueante, true)

      // (a) Se sembró la aprobación PENDIENTE faltante para el trámite en curso.
      const [fila] = await db
        .select({ estado: aprobaciones.estado })
        .from(aprobaciones)
        .where(
          and(
            eq(aprobaciones.funcionarioId, funcionarioId),
            eq(aprobaciones.areaId, idBloqueante),
          ),
        )
      expect(
        fila?.estado,
        "reactivar debe sembrar la aprobación faltante en PENDIENTE",
      ).toBe("PENDIENTE")

      // (b) El estado global vuelve a PENDIENTE (no se queda 'listo' saltándose el visto bueno).
      const [despues] = await db
        .select({ estadoGlobal: funcionarios.estadoGlobal })
        .from(funcionarios)
        .where(eq(funcionarios.id, funcionarioId))
      expect(despues.estadoGlobal).toBe("PENDIENTE")
    } finally {
      await limpiar(funcionarioId)
      await limpiarArea(idBloqueante)
    }
  })
})
