import { describe, it, expect } from "vitest"
import { asc, eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { db } from "../src/infrastructure/db/client"
import { cursoLecciones, cursoModulos, cursos } from "../src/infrastructure/db/schema"
import { cursoRepository } from "../src/infrastructure/db/cursoRepository"

/**
 * Regresión de concurrencia (mismo molde que `concurrencia-estadoArea.integration.test.ts`).
 *
 * Dos gestores reordenando el MISMO curso/módulo casi a la vez. Sin el
 * row-lock (`FOR UPDATE` sobre la fila raíz del scope en `moverModulo`/
 * `moverLeccion`), las dos transacciones leen valores de `orden` no obsoletos
 * pero calculan swaps sobre lecturas concurrentes → lost-update / choque con
 * `unique(curso_id, orden)` / `unique(modulo_id, orden)`. Con el lock, la 2ª
 * transacción espera y recalcula contra lo ya confirmado.
 *
 * Gated por DATABASE_URL_TEST. Varias iteraciones porque el race depende del scheduling.
 */
const DB = process.env.DATABASE_URL_TEST
const ITERACIONES = 10

async function montarCursoConTresModulos() {
  const [c] = await db
    .insert(cursos)
    .values({
      titulo: "Curso Concurrencia",
      ambito: "SST",
      token: `tok-${randomUUID()}`,
      estadoRegistro: "BORRADOR",
    })
    .returning({ id: cursos.id })

  const modulos = await db
    .insert(cursoModulos)
    .values([
      { cursoId: c.id, titulo: "Módulo 1", orden: 1 },
      { cursoId: c.id, titulo: "Módulo 2", orden: 2 },
      { cursoId: c.id, titulo: "Módulo 3", orden: 3 },
    ])
    .returning({ id: cursoModulos.id })

  return { cursoId: c.id, moduloIds: modulos.map((m) => m.id) }
}

async function montarModuloConTresLecciones() {
  const { cursoId, moduloIds } = await montarCursoConTresModulos()
  const moduloId = moduloIds[0]

  const lecciones = await db
    .insert(cursoLecciones)
    .values([
      { moduloId, titulo: "Lección 1", tipoContenido: "TEXTO", orden: 1 },
      { moduloId, titulo: "Lección 2", tipoContenido: "TEXTO", orden: 2 },
      { moduloId, titulo: "Lección 3", tipoContenido: "TEXTO", orden: 3 },
    ])
    .returning({ id: cursoLecciones.id })

  return { cursoId, moduloId, leccionIds: lecciones.map((l) => l.id) }
}

async function limpiarCurso(cursoId: string) {
  await db.delete(cursos).where(eq(cursos.id, cursoId))
}

function ordenesUnicos(valores: number[]): boolean {
  return new Set(valores).size === valores.length
}

describe.skipIf(!DB)("moverModulo / moverLeccion — concurrencia (integración)", () => {
  it("dos moverModulo concurrentes sobre el mismo curso no duplican ni pierden un orden", async () => {
    for (let i = 0; i < ITERACIONES; i++) {
      const { cursoId, moduloIds } = await montarCursoConTresModulos()
      try {
        // Dos gestores mueven módulos distintos del MISMO curso a la vez: aquí está el race.
        await Promise.all([
          cursoRepository.moverModulo(cursoId, moduloIds[1], "subir"),
          cursoRepository.moverModulo(cursoId, moduloIds[2], "subir"),
        ])

        const filas = await db
          .select({ orden: cursoModulos.orden })
          .from(cursoModulos)
          .where(eq(cursoModulos.cursoId, cursoId))
          .orderBy(asc(cursoModulos.orden))

        const ordenes = filas.map((f) => f.orden)
        expect(
          ordenesUnicos(ordenes),
          `iteración ${i}: órdenes duplicados/perdidos tras reordenar en paralelo: ${JSON.stringify(ordenes)}`,
        ).toBe(true)
        expect(ordenes).toEqual([1, 2, 3])
      } finally {
        await limpiarCurso(cursoId)
      }
    }
  })

  it("dos moverLeccion concurrentes sobre el mismo módulo no duplican ni pierden un orden", async () => {
    for (let i = 0; i < ITERACIONES; i++) {
      const { cursoId, moduloId, leccionIds } = await montarModuloConTresLecciones()
      try {
        await Promise.all([
          cursoRepository.moverLeccion(moduloId, leccionIds[1], "subir"),
          cursoRepository.moverLeccion(moduloId, leccionIds[2], "subir"),
        ])

        const filas = await db
          .select({ orden: cursoLecciones.orden })
          .from(cursoLecciones)
          .where(eq(cursoLecciones.moduloId, moduloId))
          .orderBy(asc(cursoLecciones.orden))

        const ordenes = filas.map((f) => f.orden)
        expect(
          ordenesUnicos(ordenes),
          `iteración ${i}: órdenes duplicados/perdidos tras reordenar en paralelo: ${JSON.stringify(ordenes)}`,
        ).toBe(true)
        expect(ordenes).toEqual([1, 2, 3])
      } finally {
        await limpiarCurso(cursoId)
      }
    }
  })
})
