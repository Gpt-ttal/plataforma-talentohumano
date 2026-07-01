import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm"
import { randomBytes } from "node:crypto"
import type {
  Asistencia,
  Capacitacion,
  CapacitacionDetalle,
  CapacitacionPublica,
  FiltroCapacitaciones,
  ResultadoRegistro,
} from "@pys/shared"
import type { ResultadoPaginado } from "@pys/shared"
import type { RegistrarAsistenciaInput } from "@pys/shared"
import { ErrorNoEncontrado, ErrorValidacion } from "../../application/errors.js"
import { db } from "./client.js"
import { asistencias, capacitaciones } from "./schema.js"
import type { CapacitacionRepo } from "../../domain/ports/CapacitacionRepo.js"

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapCapacitacion(r: typeof capacitaciones.$inferSelect): Capacitacion {
  return {
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    ambito: r.ambito,
    lugar: r.lugar,
    instructor: r.instructor,
    iniciaEn: r.iniciaEn.toISOString(),
    terminaEn: r.terminaEn.toISOString(),
    horas: r.horas !== null ? Number(r.horas) : null,
    token: r.token,
    estadoRegistro: r.estadoRegistro,
    creadaPor: r.creadaPor,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

function mapAsistencia(r: typeof asistencias.$inferSelect): Asistencia {
  return {
    id: r.id,
    capacitacionId: r.capacitacionId,
    nombre: r.nombre,
    documento: r.documento,
    correo: r.correo,
    dependencia: r.dependencia,
    tipoVinculo: r.tipoVinculo,
    usuarioId: r.usuarioId,
    registradaEn: r.registradaEn.toISOString(),
  }
}

// ── Repo ──────────────────────────────────────────────────────────────────────

export const capacitacionRepository: CapacitacionRepo = {
  async listarCapacitaciones(
    filtro: FiltroCapacitaciones,
  ): Promise<ResultadoPaginado<Capacitacion>> {
    const pagina = filtro.pagina ?? 1
    const porPagina = filtro.porPagina ?? 10
    const offset = (pagina - 1) * porPagina

    const condiciones = []
    if (filtro.ambito) condiciones.push(eq(capacitaciones.ambito, filtro.ambito))
    if (filtro.estado) condiciones.push(eq(capacitaciones.estadoRegistro, filtro.estado))
    if (filtro.q) {
      const like = `%${filtro.q}%`
      condiciones.push(
        or(
          ilike(capacitaciones.titulo, like),
          ilike(capacitaciones.instructor, like),
        ),
      )
    }

    const where = condiciones.length > 0 ? and(...condiciones) : undefined

    const [totalRow] = await db
      .select({ n: count() })
      .from(capacitaciones)
      .where(where)

    const total = Number(totalRow?.n ?? 0)
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

    const rows = await db
      .select()
      .from(capacitaciones)
      .where(where)
      .orderBy(desc(capacitaciones.iniciaEn))
      .limit(porPagina)
      .offset(offset)

    return {
      items: rows.map(mapCapacitacion),
      total,
      pagina,
      porPagina,
      totalPaginas,
    }
  },

  async crearCapacitacion(
    input: Omit<Capacitacion, "id" | "token" | "estadoRegistro" | "createdAt" | "updatedAt">,
  ): Promise<Capacitacion> {
    // Token aleatorio URL-safe de 22 caracteres (~131 bits de entropía).
    const token = randomBytes(16).toString("base64url")

    const [row] = await db
      .insert(capacitaciones)
      .values({
        titulo: input.titulo,
        descripcion: input.descripcion ?? null,
        ambito: input.ambito,
        lugar: input.lugar ?? null,
        instructor: input.instructor ?? null,
        iniciaEn: new Date(input.iniciaEn),
        terminaEn: new Date(input.terminaEn),
        horas: input.horas !== null && input.horas !== undefined ? String(input.horas) : null,
        token,
        estadoRegistro: "BORRADOR",
        creadaPor: input.creadaPor ?? null,
      })
      .returning()

    if (!row) throw new Error("crearCapacitacion: la inserción no devolvió el registro.")
    return mapCapacitacion(row)
  },

  async obtenerDetalle(id: string): Promise<CapacitacionDetalle | null> {
    const [cap] = await db
      .select()
      .from(capacitaciones)
      .where(eq(capacitaciones.id, id))
      .limit(1)

    if (!cap) return null

    const asRows = await db
      .select()
      .from(asistencias)
      .where(eq(asistencias.capacitacionId, id))
      .orderBy(asc(asistencias.registradaEn))

    return {
      capacitacion: mapCapacitacion(cap),
      asistencias: asRows.map(mapAsistencia),
      totalAsistencias: asRows.length,
    }
  },

  async editarCapacitacion(
    id: string,
    input: Partial<
      Pick<Capacitacion, "titulo" | "descripcion" | "lugar" | "instructor" | "iniciaEn" | "terminaEn" | "horas">
    >,
  ): Promise<Capacitacion> {
    const set: Record<string, unknown> = { updatedAt: new Date() }
    if (input.titulo !== undefined) set.titulo = input.titulo
    if (input.descripcion !== undefined) set.descripcion = input.descripcion
    if (input.lugar !== undefined) set.lugar = input.lugar
    if (input.instructor !== undefined) set.instructor = input.instructor
    if (input.iniciaEn !== undefined) set.iniciaEn = new Date(input.iniciaEn)
    if (input.terminaEn !== undefined) set.terminaEn = new Date(input.terminaEn)
    if (input.horas !== undefined) set.horas = input.horas !== null ? String(input.horas) : null

    const [row] = await db
      .update(capacitaciones)
      .set(set)
      .where(eq(capacitaciones.id, id))
      .returning()

    if (!row) throw new ErrorNoEncontrado("La capacitación no existe.")
    return mapCapacitacion(row)
  },

  async cambiarEstadoRegistro(
    id: string,
    estado: "BORRADOR" | "ABIERTO" | "CERRADO",
  ): Promise<Capacitacion> {
    const [row] = await db
      .update(capacitaciones)
      .set({ estadoRegistro: estado, updatedAt: new Date() })
      .where(eq(capacitaciones.id, id))
      .returning()

    if (!row) throw new ErrorNoEncontrado("La capacitación no existe.")
    return mapCapacitacion(row)
  },

  async obtenerPorToken(token: string): Promise<CapacitacionPublica | null> {
    const [row] = await db
      .select()
      .from(capacitaciones)
      .where(eq(capacitaciones.token, token))
      .limit(1)

    if (!row) return null
    return {
      titulo: row.titulo,
      descripcion: row.descripcion,
      lugar: row.lugar,
      instructor: row.instructor,
      iniciaEn: row.iniciaEn.toISOString(),
      terminaEn: row.terminaEn.toISOString(),
      estadoRegistro: row.estadoRegistro,
    }
  },

  async registrarAsistencia(
    token: string,
    datos: RegistrarAsistenciaInput,
    usuarioId?: string,
  ): Promise<ResultadoRegistro> {
    return db.transaction(async (tx) => {
      // Buscar la capacitación dentro de la transacción para consistencia.
      const [cap] = await tx
        .select({ id: capacitaciones.id, estadoRegistro: capacitaciones.estadoRegistro })
        .from(capacitaciones)
        .where(eq(capacitaciones.token, token))
        .limit(1)

      if (!cap) throw new ErrorNoEncontrado("La capacitación no existe.")
      if (cap.estadoRegistro !== "ABIERTO") {
        throw new ErrorValidacion("El registro de asistencia no está abierto.")
      }

      // Insert idempotente: UNIQUE(capacitacion_id, documento) → onConflictDoNothing.
      const filas = await tx
        .insert(asistencias)
        .values({
          capacitacionId: cap.id,
          nombre: datos.nombre,
          documento: datos.documento,
          correo: datos.correo ?? null,
          dependencia: datos.dependencia ?? null,
          tipoVinculo: datos.tipoVinculo,
          usuarioId: usuarioId ?? null,
        })
        .onConflictDoNothing({ target: [asistencias.capacitacionId, asistencias.documento] })
        .returning({ id: asistencias.id })

      const registrada = filas.length > 0
      return { registrada, yaExistia: !registrada }
    })
  },

  async listarAsistencias(capacitacionId: string): Promise<Asistencia[]> {
    const rows = await db
      .select()
      .from(asistencias)
      .where(eq(asistencias.capacitacionId, capacitacionId))
      .orderBy(asc(asistencias.registradaEn))
    return rows.map(mapAsistencia)
  },
}
