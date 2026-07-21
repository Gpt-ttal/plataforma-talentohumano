import { and, asc, count, eq, ilike, sql } from "drizzle-orm"
import type { CapacitacionPlaneada, FiltroCapacitacionesPlaneadas } from "@pys/shared"
import type { ResultadoPaginado } from "@pys/shared"
import { ErrorNoEncontrado, ErrorValidacion } from "../../application/errors.js"
import { db } from "./client.js"
import { capacitacionesPlaneadas } from "./schema.js"
import type { PlanificadorRepo } from "../../domain/ports/PlanificadorRepo.js"

function mapCapacitacionPlaneada(
  r: typeof capacitacionesPlaneadas.$inferSelect,
): CapacitacionPlaneada {
  return {
    id: r.id,
    titulo: r.titulo,
    areaObjetivo: r.areaObjetivo,
    ambito: r.ambito,
    anio: r.anio,
    mes: r.mes,
    estado: r.estado,
    notas: r.notas,
    creadaPor: r.creadaPor,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export const planificadorRepository: PlanificadorRepo = {
  async listar(
    filtro: FiltroCapacitacionesPlaneadas,
  ): Promise<ResultadoPaginado<CapacitacionPlaneada>> {
    const pagina = filtro.pagina ?? 1
    const porPagina = filtro.porPagina ?? 10
    const offset = (pagina - 1) * porPagina

    const condiciones = []
    if (filtro.ambito) condiciones.push(eq(capacitacionesPlaneadas.ambito, filtro.ambito))
    if (filtro.estado) condiciones.push(eq(capacitacionesPlaneadas.estado, filtro.estado))
    if (filtro.anio !== undefined) condiciones.push(eq(capacitacionesPlaneadas.anio, filtro.anio))
    if (filtro.mes !== undefined) condiciones.push(eq(capacitacionesPlaneadas.mes, filtro.mes))
    if (filtro.q) condiciones.push(ilike(capacitacionesPlaneadas.titulo, `%${filtro.q}%`))

    const where = condiciones.length > 0 ? and(...condiciones) : undefined

    const [totalRow] = await db.select({ n: count() }).from(capacitacionesPlaneadas).where(where)
    const total = Number(totalRow?.n ?? 0)
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

    const rows = await db
      .select()
      .from(capacitacionesPlaneadas)
      .where(where)
      .orderBy(asc(capacitacionesPlaneadas.anio), asc(capacitacionesPlaneadas.mes))
      .limit(porPagina)
      .offset(offset)

    return {
      items: rows.map(mapCapacitacionPlaneada),
      total,
      pagina,
      porPagina,
      totalPaginas,
    }
  },

  async crear(
    input: Omit<CapacitacionPlaneada, "id" | "estado" | "createdAt" | "updatedAt">,
  ): Promise<CapacitacionPlaneada> {
    return db.transaction(async (tx) => {
      // Idempotencia a nivel de aplicación: doble clic/reintento con el mismo
      // título+año+mes+ámbito (título normalizado) no crea 2 planeaciones.
      const yaExiste = await tx
        .select({ id: capacitacionesPlaneadas.id })
        .from(capacitacionesPlaneadas)
        .where(
          and(
            sql`lower(trim(${capacitacionesPlaneadas.titulo})) = lower(trim(${input.titulo}))`,
            eq(capacitacionesPlaneadas.anio, input.anio),
            eq(capacitacionesPlaneadas.mes, input.mes),
            eq(capacitacionesPlaneadas.ambito, input.ambito),
          ),
        )
        .limit(1)
      if (yaExiste.length > 0) {
        throw new ErrorValidacion("Ya existe una planeación con ese título, año y mes en este ámbito.")
      }

      const [row] = await tx
        .insert(capacitacionesPlaneadas)
        .values({
          titulo: input.titulo,
          areaObjetivo: input.areaObjetivo ?? null,
          ambito: input.ambito,
          anio: input.anio,
          mes: input.mes,
          notas: input.notas ?? null,
          creadaPor: input.creadaPor ?? null,
          // `estado` no se pasa: la columna tiene default 'PLANEADA' en el schema.
        })
        .returning()

      if (!row) throw new Error("crear: la inserción no devolvió el registro.")
      return mapCapacitacionPlaneada(row)
    })
  },

  async obtenerDetalle(id: string): Promise<CapacitacionPlaneada | null> {
    const [row] = await db
      .select()
      .from(capacitacionesPlaneadas)
      .where(eq(capacitacionesPlaneadas.id, id))
      .limit(1)
    return row ? mapCapacitacionPlaneada(row) : null
  },

  async editar(
    id: string,
    input: Partial<
      Pick<CapacitacionPlaneada, "titulo" | "areaObjetivo" | "ambito" | "anio" | "mes" | "estado" | "notas">
    >,
  ): Promise<CapacitacionPlaneada> {
    const set: Record<string, unknown> = { updatedAt: new Date() }
    if (input.titulo !== undefined) set.titulo = input.titulo
    if (input.areaObjetivo !== undefined) set.areaObjetivo = input.areaObjetivo
    if (input.ambito !== undefined) set.ambito = input.ambito
    if (input.anio !== undefined) set.anio = input.anio
    if (input.mes !== undefined) set.mes = input.mes
    if (input.estado !== undefined) set.estado = input.estado
    if (input.notas !== undefined) set.notas = input.notas

    const [row] = await db
      .update(capacitacionesPlaneadas)
      .set(set)
      .where(eq(capacitacionesPlaneadas.id, id))
      .returning()

    if (!row) throw new ErrorNoEncontrado("La capacitación planeada no existe.")
    return mapCapacitacionPlaneada(row)
  },

  async eliminar(id: string): Promise<void> {
    await db.delete(capacitacionesPlaneadas).where(eq(capacitacionesPlaneadas.id, id))
  },
}
