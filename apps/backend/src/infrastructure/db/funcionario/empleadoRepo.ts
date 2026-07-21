import { and, asc, desc, eq, ilike, isNotNull, isNull, ne, or, sql } from "drizzle-orm"
import type {
  CrearEmpleadoInput,
  EditarEmpleadoInput,
  Empleado,
  EmpleadoDetalle,
  FiltroEmpleados,
  RegistrarNovedadInput,
  ResultadoPaginado,
} from "@pys/shared"
import { normalizarPagina } from "@pys/shared"
import type { FuncionarioRepo, ResultadoMutacion } from "../../../domain/ports/FuncionarioRepo.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../../../application/errors.js"
import { db } from "../client.js"
import { funcionarios, novedades } from "../schema.js"
import { iniciarTramiteDesvinculacion } from "../iniciarTramiteDesvinculacion.js"
import { mapEmpleado, mapNovedad } from "./mappers.compartidos.js"

// ── Maestro de empleados (Administración de Personal) ──────────────────────

export const empleadoRepo: Pick<
  FuncionarioRepo,
  | "crearEmpleado"
  | "editarEmpleado"
  | "finalizarContrato"
  | "registrarNovedad"
  | "listarEmpleadosPaginado"
  | "obtenerEmpleado"
> = {
  async crearEmpleado(datos: CrearEmpleadoInput): Promise<Empleado> {
    // Documento = identidad. Pre-chequeo para un mensaje claro; el UNIQUE de la
    // columna es el guardián real ante una carrera.
    const yaExiste = await db
      .select({ id: funcionarios.id })
      .from(funcionarios)
      .where(eq(funcionarios.documento, datos.documento))
      .limit(1)
    if (yaExiste.length > 0) {
      throw new ErrorValidacion("Ya existe un empleado con ese documento.")
    }

    let row: typeof funcionarios.$inferSelect | undefined
    try {
      ;[row] = await db
        .insert(funcionarios)
        .values({
          documento: datos.documento,
          nombreCompleto: datos.nombreCompleto,
          tipoVinculacion: datos.tipoVinculacion,
          cargo: datos.cargo,
          areaOrigen: datos.areaOrigen,
          fechaIngreso: datos.fechaIngreso ?? null,
          fechaFinContrato: datos.fechaFinContrato ?? null,
          correoInstitucional: datos.correoInstitucional ?? null,
          telefono: datos.telefono ?? null,
          // ACTIVO: sin fecha de retiro ni aprobaciones. Invisible para Paz y Salvo.
          fechaRetiro: null,
        })
        .returning()
    } catch (e) {
      // Carrera ganada por otra transacción entre el pre-chequeo y el insert:
      // el UNIQUE(documento) es el guardián real; se traduce al mismo error
      // legible de la ruta feliz en vez de dejar salir el 500 crudo de Postgres.
      if ((e as { code?: string })?.code === "23505") {
        throw new ErrorValidacion("Ya existe un empleado con ese documento.")
      }
      throw e
    }
    if (!row) throw new Error("crearEmpleado: la inserción no devolvió el empleado.")
    return mapEmpleado(row)
  },

  async editarEmpleado(
    id: string,
    datos: EditarEmpleadoInput,
  ): Promise<Empleado> {
    // Solo se actualizan las claves presentes; `null` en un opcional lo borra.
    const patch: Partial<typeof funcionarios.$inferInsert> = { updatedAt: new Date() }
    if (datos.nombreCompleto !== undefined) patch.nombreCompleto = datos.nombreCompleto
    if (datos.tipoVinculacion !== undefined) patch.tipoVinculacion = datos.tipoVinculacion
    if (datos.cargo !== undefined) patch.cargo = datos.cargo
    if (datos.areaOrigen !== undefined) patch.areaOrigen = datos.areaOrigen
    if (datos.fechaIngreso !== undefined) patch.fechaIngreso = datos.fechaIngreso
    if (datos.fechaFinContrato !== undefined) patch.fechaFinContrato = datos.fechaFinContrato
    if (datos.correoInstitucional !== undefined)
      patch.correoInstitucional = datos.correoInstitucional
    if (datos.telefono !== undefined) patch.telefono = datos.telefono

    const [row] = await db
      .update(funcionarios)
      .set(patch)
      .where(eq(funcionarios.id, id))
      .returning()
    if (!row) throw new ErrorNoEncontrado("El empleado no existe.")
    return mapEmpleado(row)
  },

  async finalizarContrato(
    id: string,
    fechaRetiro: string,
    autor: string,
  ): Promise<ResultadoMutacion> {
    // El puente en sí (flip + backfill + auditoría + recompute) vive en
    // `iniciarTramiteDesvinculacion`, compartido con la confirmación de un
    // lote de importación masiva — aquí solo se abre la transacción del caso
    // individual.
    return db.transaction((tx) =>
      iniciarTramiteDesvinculacion({ id, fechaRetiro, autor }, tx),
    )
  },

  async registrarNovedad(
    id: string,
    novedad: RegistrarNovedadInput,
    autor: string,
  ): Promise<EmpleadoDetalle> {
    return db.transaction(async (tx) => {
      // Lock pesimista: serializa dos `registrarNovedad` concurrentes sobre el
      // MISMO empleado. Aquí no hay un "estado esperado" (cualquier cargo/fecha
      // previos son válidos, es un cambio de valor libre) así que el UPDATE
      // condicional no aplica — el lock evita que la bitácora append-only quede
      // con un `valorAnterior` desactualizado si dos ediciones se pisan.
      const [emp] = await tx
        .select()
        .from(funcionarios)
        .where(eq(funcionarios.id, id))
        .for("update")
        .limit(1)
      if (!emp) throw new ErrorNoEncontrado("El empleado no existe.")

      // La novedad es append-only Y aplica el cambio al empleado en la misma tx.
      let valorAnterior: string | null
      let valorNuevo: string | null
      if (novedad.tipo === "CAMBIO_CARGO") {
        valorAnterior = emp.cargo
        valorNuevo = novedad.nuevoCargo
        await tx
          .update(funcionarios)
          .set({ cargo: novedad.nuevoCargo, updatedAt: new Date() })
          .where(eq(funcionarios.id, id))
      } else {
        valorAnterior = emp.fechaFinContrato ?? null
        valorNuevo = novedad.nuevaFechaFin
        await tx
          .update(funcionarios)
          .set({ fechaFinContrato: novedad.nuevaFechaFin, updatedAt: new Date() })
          .where(eq(funcionarios.id, id))
      }

      await tx.insert(novedades).values({
        funcionarioId: id,
        tipo: novedad.tipo,
        motivo: novedad.motivo,
        valorAnterior,
        valorNuevo,
        autor,
      })

      const [row] = await tx
        .select()
        .from(funcionarios)
        .where(eq(funcionarios.id, id))
        .limit(1)
      const novRows = await tx
        .select()
        .from(novedades)
        .where(eq(novedades.funcionarioId, id))
        .orderBy(desc(novedades.createdAt))
      return { empleado: mapEmpleado(row!), novedades: novRows.map(mapNovedad) }
    })
  },

  async listarEmpleadosPaginado(
    filtro?: FiltroEmpleados,
  ): Promise<ResultadoPaginado<Empleado>> {
    const { pagina, porPagina } = normalizarPagina({
      pagina: filtro?.pagina,
      porPagina: filtro?.porPagina,
    })
    const desde = (pagina - 1) * porPagina

    const q = filtro?.q?.trim()
    const conditions = []
    if (q) {
      const patron = `%${q}%`
      conditions.push(
        or(
          ilike(funcionarios.nombreCompleto, patron),
          ilike(funcionarios.documento, patron),
        )!,
      )
    }
    if (filtro?.tipoVinculacion) {
      conditions.push(eq(funcionarios.tipoVinculacion, filtro.tipoVinculacion))
    }
    // El estado de vinculación es DERIVADO → se traduce a un predicado sobre
    // fecha_retiro / estado_global (misma regla que `estadoVinculacion`).
    if (filtro?.vinculoEstado === "ACTIVO") {
      conditions.push(isNull(funcionarios.fechaRetiro))
    } else if (filtro?.vinculoEstado === "EN_RETIRO") {
      conditions.push(
        and(
          isNotNull(funcionarios.fechaRetiro),
          ne(funcionarios.estadoGlobal, "PAZ_Y_SALVO"),
        )!,
      )
    } else if (filtro?.vinculoEstado === "RETIRADO") {
      conditions.push(eq(funcionarios.estadoGlobal, "PAZ_Y_SALVO"))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(funcionarios)
        .where(whereClause)
        .orderBy(asc(funcionarios.nombreCompleto))
        .limit(porPagina)
        .offset(desde),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(funcionarios)
        .where(whereClause),
    ])

    const total = countResult[0]?.count ?? 0
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

    return {
      items: rows.map(mapEmpleado),
      total,
      pagina,
      porPagina,
      totalPaginas,
    }
  },

  async obtenerEmpleado(id: string): Promise<EmpleadoDetalle | null> {
    const [row] = await db
      .select()
      .from(funcionarios)
      .where(eq(funcionarios.id, id))
      .limit(1)
    if (!row) return null
    const novRows = await db
      .select()
      .from(novedades)
      .where(eq(novedades.funcionarioId, id))
      .orderBy(desc(novedades.createdAt))
    return { empleado: mapEmpleado(row), novedades: novRows.map(mapNovedad) }
  },
}
