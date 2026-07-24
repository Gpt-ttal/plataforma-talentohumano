import { afterEach, describe, expect, it } from "vitest"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "../src/infrastructure/db/client"
import {
  eventosAuditoria,
  funcionarios,
  vacanteDedicaciones,
  vacantes,
  vacanteAreas,
} from "../src/infrastructure/db/schema"
import { vacanteRepository as repo } from "../src/infrastructure/db/vacanteRepository"
import { ErrorValidacion } from "../src/application/errors"
import type { NuevaVacanteInput } from "../src/domain/ports/VacanteRepo"

/**
 * Integración del puente Vacante→Funcionario (ADR-0009) contra un Postgres de
 * test con las migraciones 0020/0021 aplicadas. Gated por DATABASE_URL_TEST
 * (mismo molde que `sync-personal.integration.test.ts`): se salta sin BD de test.
 *
 * Cubre lo que la capa pura no puede: creación atómica en la misma transacción,
 * idempotencia de la transición, bloqueo por cédula duplicada (con rollback) y
 * serialización de dos contrataciones concurrentes.
 */
const DB = process.env.DATABASE_URL_TEST

const vacantesCreadas = new Set<string>()
const documentosCreados = new Set<string>()

function nuevaCedula(): string {
  // 10 dígitos empezando por 9 → cumple `^[0-9]{6,10}$` y evita chocar con datos reales.
  const c = String(9_000_000_000 + Math.floor(Math.random() * 999_999_999))
  documentosCreados.add(c)
  return c
}

async function primerAreaId(): Promise<string> {
  const [a] = await db.select({ id: vacanteAreas.id }).from(vacanteAreas).limit(1)
  if (!a) throw new Error("El catálogo vacante_areas está vacío; corre el seed de 0021.")
  return a.id
}

async function dedicacionId(clave: string): Promise<string | null> {
  const [d] = await db
    .select({ id: vacanteDedicaciones.id })
    .from(vacanteDedicaciones)
    .where(eq(vacanteDedicaciones.clave, clave))
    .limit(1)
  return d?.id ?? null
}

function inputVacante(areaId: string, over: Partial<NuevaVacanteInput> = {}): NuevaVacanteInput {
  return {
    cargo: "Analista de Integración",
    posiciones: 1,
    areaId,
    modalidadId: null,
    dedicacionId: null,
    escalafonId: null,
    motivoId: null,
    fuenteId: null,
    jefe: "Jefa Prueba",
    reemplazo: null,
    nombreNuevo: null,
    salario: null,
    aprobacion: null,
    fechaAprobacion: null,
    fechaRequerimiento: "2026-07-01",
    fase: "RECLUTAMIENTO",
    estado: "PENDIENTE",
    fechaContratacion: null,
    cedula: null,
    ...over,
  }
}

describe.skipIf(!DB)("puente Vacante→Funcionario (integración, ADR-0009)", () => {
  afterEach(async () => {
    if (documentosCreados.size > 0) {
      const docs = [...documentosCreados]
      const funcs = await db
        .select({ id: funcionarios.id })
        .from(funcionarios)
        .where(inArray(funcionarios.documento, docs))
      const ids = funcs.map((f) => f.id)
      if (ids.length > 0) {
        await db.delete(eventosAuditoria).where(inArray(eventosAuditoria.entidadId, ids))
        await db.delete(funcionarios).where(inArray(funcionarios.id, ids)) // satélites: cascade
      }
      documentosCreados.clear()
    }
    if (vacantesCreadas.size > 0) {
      await db.delete(vacantes).where(inArray(vacantes.id, [...vacantesCreadas]))
      vacantesCreadas.clear()
    }
  })

  it("PATCH a CONTRATADO crea el funcionario ACTIVO (area_origen = nombre del área, area_id NULL)", async () => {
    const areaId = await primerAreaId()
    const [{ nombre: areaNombre }] = await db
      .select({ nombre: vacanteAreas.nombre })
      .from(vacanteAreas)
      .where(eq(vacanteAreas.id, areaId))
    const dedId = await dedicacionId("ADMINISTRATIVO")
    const cedula = nuevaCedula()

    const v = await repo.crearVacante(inputVacante(areaId, { dedicacionId: dedId }), "Laura TH")
    vacantesCreadas.add(v.id)

    await repo.actualizarVacante(
      v.id,
      { estado: "CONTRATADO", cedula, nombreNuevo: "Nuevo Empleado", fechaContratacion: "2026-07-20" },
      "Laura TH",
    )

    const [emp] = await db.select().from(funcionarios).where(eq(funcionarios.documento, cedula))
    expect(emp, "el funcionario debe existir").toBeTruthy()
    expect(emp?.nombreCompleto).toBe("Nuevo Empleado")
    expect(emp?.areaOrigen).toBe(areaNombre)
    expect(emp?.areaId).toBeNull()
    expect(emp?.fechaRetiro).toBeNull() // ACTIVO, invisible a Paz y Salvo
    expect(emp?.fechaIngreso).toBe("2026-07-20")
    if (dedId) expect(emp?.tipoVinculacion).toBe("ADMINISTRATIVO")
  })

  it("un segundo PATCH sobre la vacante ya CONTRATADA no crea un segundo funcionario", async () => {
    const areaId = await primerAreaId()
    const cedula = nuevaCedula()
    const v = await repo.crearVacante(inputVacante(areaId), "Laura TH")
    vacantesCreadas.add(v.id)

    await repo.actualizarVacante(
      v.id,
      { estado: "CONTRATADO", cedula, nombreNuevo: "Empleado Único", fechaContratacion: "2026-07-20" },
      "Laura TH",
    )
    // Segundo PATCH (edita otro campo) sobre la vacante ya CONTRATADA.
    await repo.actualizarVacante(v.id, { jefe: "Otra Jefa" }, "Laura TH")

    const filas = await db.select().from(funcionarios).where(eq(funcionarios.documento, cedula))
    expect(filas).toHaveLength(1)
  })

  it("cédula ya existente → ErrorValidacion y la vacante NO cambia de estado (rollback)", async () => {
    const areaId = await primerAreaId()
    const cedula = nuevaCedula()
    // Un empleado con esa cédula ya existe (creado a mano).
    await db
      .insert(funcionarios)
      .values({ documento: cedula, nombreCompleto: "Ya Existe", cargo: "X", areaOrigen: "Y" })

    const v = await repo.crearVacante(inputVacante(areaId), "Laura TH")
    vacantesCreadas.add(v.id)

    await expect(
      repo.actualizarVacante(
        v.id,
        { estado: "CONTRATADO", cedula, nombreNuevo: "Colisión", fechaContratacion: "2026-07-20" },
        "Laura TH",
      ),
    ).rejects.toBeInstanceOf(ErrorValidacion)

    const [vac] = await db.select().from(vacantes).where(eq(vacantes.id, v.id))
    expect(vac?.estado).toBe("PENDIENTE") // rollback completo: no quedó CONTRATADA
  })

  it("dos PATCH concurrentes a CONTRATADO sobre la misma vacante → un solo funcionario", async () => {
    const areaId = await primerAreaId()
    const cedula = nuevaCedula()
    const v = await repo.crearVacante(inputVacante(areaId), "Laura TH")
    vacantesCreadas.add(v.id)

    const cambios = {
      estado: "CONTRATADO" as const,
      cedula,
      nombreNuevo: "Carrera Empleado",
      fechaContratacion: "2026-07-20",
    }
    await Promise.allSettled([
      repo.actualizarVacante(v.id, cambios, "Laura TH"),
      repo.actualizarVacante(v.id, cambios, "Laura TH"),
    ])

    const filas = await db.select().from(funcionarios).where(eq(funcionarios.documento, cedula))
    expect(filas).toHaveLength(1)
  })
})
