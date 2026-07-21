import { describe, it, expect } from "vitest"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "../src/infrastructure/db/client"
import { areas, capacitacionesPlaneadas, cursos } from "../src/infrastructure/db/schema"
import { areaRepository } from "../src/infrastructure/db/areaRepository"
import { cursoRepository } from "../src/infrastructure/db/cursoRepository"
import { planificadorRepository } from "../src/infrastructure/db/planificadorRepository"
import { ErrorValidacion } from "../src/application/errors"

/**
 * Idempotencia a nivel de aplicación (SELECT normalizado previo al insert,
 * dentro de la misma tx) para "crear con nombre duplicado" — mismo patrón en
 * Áreas, Cursos (módulo/lección) y Planificador. Gated por DATABASE_URL_TEST
 * (la lógica vive en el repo, no en el caso de uso, así que no es unit-testeable
 * con un repo mockeado).
 */
const DB = process.env.DATABASE_URL_TEST

describe.skipIf(!DB)("idempotencia de creación con nombre duplicado (integración)", () => {
  it("areaRepository.crearArea rechaza un nombre duplicado (variando mayúsculas/espacios)", async () => {
    const nombre = `Área Test ${randomUUID()}`
    await areaRepository.crearArea(nombre)
    try {
      await expect(areaRepository.crearArea(`  ${nombre.toUpperCase()}  `)).rejects.toBeInstanceOf(
        ErrorValidacion,
      )
    } finally {
      await db.delete(areas).where(eq(areas.nombre, nombre))
    }
  })

  it("cursoRepository.crearModulo rechaza un título duplicado dentro del mismo curso", async () => {
    const [c] = await db
      .insert(cursos)
      .values({
        titulo: "Curso Idempotencia",
        ambito: "SST",
        token: `tok-${randomUUID()}`,
        estadoRegistro: "BORRADOR",
      })
      .returning({ id: cursos.id })
    try {
      await cursoRepository.crearModulo(c.id, "Módulo Uno")
      await expect(cursoRepository.crearModulo(c.id, "  módulo uno  ")).rejects.toBeInstanceOf(
        ErrorValidacion,
      )
    } finally {
      await db.delete(cursos).where(eq(cursos.id, c.id))
    }
  })

  it("cursoRepository.crearLeccion rechaza un título duplicado dentro del mismo módulo", async () => {
    const [c] = await db
      .insert(cursos)
      .values({
        titulo: "Curso Idempotencia Lección",
        ambito: "SST",
        token: `tok-${randomUUID()}`,
        estadoRegistro: "BORRADOR",
      })
      .returning({ id: cursos.id })
    try {
      const modulo = await cursoRepository.crearModulo(c.id, "Módulo")
      await cursoRepository.crearLeccion(c.id, modulo.id, {
        titulo: "Lección Uno",
        tipoContenido: "TEXTO",
        contenidoTexto: "x",
        urlVideo: null,
      })
      await expect(
        cursoRepository.crearLeccion(c.id, modulo.id, {
          titulo: "  lección uno  ",
          tipoContenido: "TEXTO",
          contenidoTexto: "y",
          urlVideo: null,
        }),
      ).rejects.toBeInstanceOf(ErrorValidacion)
    } finally {
      await db.delete(cursos).where(eq(cursos.id, c.id))
    }
  })

  it("cursoRepository.cambiarEstadoRegistro rechaza un estadoEsperado equivocado (400, no lectura desactualizada)", async () => {
    const [c] = await db
      .insert(cursos)
      .values({
        titulo: "Curso Transición Atómica",
        ambito: "SST",
        token: `tok-${randomUUID()}`,
        estadoRegistro: "BORRADOR",
      })
      .returning({ id: cursos.id })
    try {
      // El curso está en BORRADOR; pedir el cambio esperando ABIERTO debe fallar.
      await expect(
        cursoRepository.cambiarEstadoRegistro(c.id, "CERRADO", "ABIERTO"),
      ).rejects.toBeInstanceOf(ErrorValidacion)

      // La transición correcta (BORRADOR → ABIERTO) sí aplica.
      const actualizado = await cursoRepository.cambiarEstadoRegistro(c.id, "ABIERTO", "BORRADOR")
      expect(actualizado.estadoRegistro).toBe("ABIERTO")
    } finally {
      await db.delete(cursos).where(eq(cursos.id, c.id))
    }
  })

  it("planificadorRepository.crear rechaza mismo título+año+mes+ámbito", async () => {
    const titulo = `Planeación Test ${randomUUID()}`
    const base = { titulo, ambito: "SST" as const, anio: 2026, mes: 3, areaObjetivo: null, notas: null }
    const creada = await planificadorRepository.crear(base)
    try {
      await expect(
        planificadorRepository.crear({ ...base, titulo: `  ${titulo.toUpperCase()}  ` }),
      ).rejects.toBeInstanceOf(ErrorValidacion)
    } finally {
      await db.delete(capacitacionesPlaneadas).where(eq(capacitacionesPlaneadas.id, creada.id))
    }
  })
})
