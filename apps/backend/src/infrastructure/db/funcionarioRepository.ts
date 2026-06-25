import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm"
import type {
  AprobacionConArea,
  EstadoArea,
  FilaGestionArea,
  FiltroArchivo,
  FiltroFuncionarios,
  Funcionario,
  FuncionarioDetalle,
  MetricasDashboard,
  Observacion,
  Pagina,
  ResultadoPaginado,
} from "@pys/shared"
import { calcularEstadoGlobal, normalizarPagina, paginar, ESTADOS_GLOBAL } from "@pys/shared"
import type {
  CambiarEstadoAreaArgs,
  FuncionarioRepo,
  ResultadoMutacion,
} from "../../domain/ports/FuncionarioRepo.js"
import { db } from "./client.js"
import { aprobaciones, areas, funcionarios, observaciones } from "./schema.js"
import { ErrorValidacion } from "../../application/errors.js"

/**
 * Ejecutor de consultas: o el `db` normal o una transacción (`tx`). Permite que
 * `recomputar` corra dentro de la misma transacción que la mutación que lo
 * dispara, garantizando atomicidad (la escritura del hito y el recálculo del
 * estado global se confirman juntos o no se confirman).
 */
type Ejecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

// ── Row types ───────────────────────────────────────────────────────────────

type FuncionarioRow = typeof funcionarios.$inferSelect
type AprobacionRow = typeof aprobaciones.$inferSelect
type ObservacionRow = typeof observaciones.$inferSelect

// ── Mappers (snake_case DB → camelCase domain) ──────────────────────────────

/**
 * `fechaRetiro` is a `date` column — Drizzle returns it as a string ("yyyy-mm-dd").
 * Timestamps are returned as Date objects and must be converted to ISO strings.
 */
function mapFuncionario(r: FuncionarioRow): Funcionario {
  return {
    id: r.id,
    documento: r.documento,
    nombreCompleto: r.nombreCompleto,
    // date column: Drizzle returns as string for pg-core date type
    fechaRetiro: typeof r.fechaRetiro === "string" ? r.fechaRetiro : String(r.fechaRetiro),
    areaOrigen: r.areaOrigen,
    cargo: r.cargo,
    estadoGlobal: r.estadoGlobal,
    fechaLiquidacionGenerada:
      r.fechaLiquidacionGenerada ? r.fechaLiquidacionGenerada.toISOString() : null,
    liquidacionGeneradaPor: r.liquidacionGeneradaPor ?? null,
    fechaLiquidacion:
      r.fechaLiquidacion ? r.fechaLiquidacion.toISOString() : null,
    liquidadoPor: r.liquidadoPor ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

// ── Estado-area ordering (mirrors supabase.ts RANGO_ESTADO_AREA) ─────────────

const RANGO_ESTADO_AREA: Record<EstadoArea, number> = {
  PENDIENTE: 0,
  NO_APROBADO: 1,
  APROBADO: 2,
  NO_APLICA: 3,
}

// ── Private helper: recomputar estado global ─────────────────────────────────

async function recomputar(
  funcionarioId: string,
  ex: Ejecutor = db,
): Promise<ResultadoMutacion> {
  // Load all aprobacion estados for this funcionario
  const apRows = await ex
    .select({ estado: aprobaciones.estado })
    .from(aprobaciones)
    .where(eq(aprobaciones.funcionarioId, funcionarioId))

  const estadosAreas = apRows.map((r) => r.estado as EstadoArea)

  // Load current milestone columns
  const fRows = await ex
    .select({
      fechaLiquidacionGenerada: funcionarios.fechaLiquidacionGenerada,
      fechaLiquidacion: funcionarios.fechaLiquidacion,
    })
    .from(funcionarios)
    .where(eq(funcionarios.id, funcionarioId))
    .limit(1)

  const fRow = fRows[0]
  if (!fRow) throw new Error(`recomputar: funcionario ${funcionarioId} no encontrado`)

  const esOk = (e: EstadoArea) => e === "APROBADO" || e === "NO_APLICA"
  const todasOk = estadosAreas.length > 0 && estadosAreas.every(esOk)

  let fechaLiquidacionGenerada = fRow.fechaLiquidacionGenerada
  let fechaLiquidacion = fRow.fechaLiquidacion

  // Build update payload
  const update: Partial<FuncionarioRow> & { updatedAt: Date } = {
    updatedAt: new Date(),
  }

  if (!todasOk) {
    // Clear milestones when areas are no longer all OK, so TH→CI relay restarts
    fechaLiquidacionGenerada = null
    fechaLiquidacion = null
    update.fechaLiquidacionGenerada = null
    update.liquidacionGeneradaPor = null
    update.fechaLiquidacion = null
    update.liquidadoPor = null
  }

  const { estadoGlobal, hayRechazo } = calcularEstadoGlobal({
    estadosAreas,
    liquidacionGenerada: fechaLiquidacionGenerada !== null,
    liquidado: fechaLiquidacion !== null,
  })
  update.estadoGlobal = estadoGlobal

  await ex
    .update(funcionarios)
    .set(update)
    .where(eq(funcionarios.id, funcionarioId))

  return { estadoGlobal, hayRechazo }
}

// ── Repository implementation ────────────────────────────────────────────────

export const funcionarioRepository: FuncionarioRepo = {
  async listarFuncionarios(): Promise<Funcionario[]> {
    const rows = await db
      .select()
      .from(funcionarios)
      .orderBy(asc(funcionarios.fechaRetiro))
    return rows.map(mapFuncionario)
  },

  async listarGestionArea(areaId: string): Promise<FilaGestionArea[]> {
    const rows = await db
      .select({
        estado: aprobaciones.estado,
        funcionario: funcionarios,
      })
      .from(aprobaciones)
      .innerJoin(funcionarios, eq(aprobaciones.funcionarioId, funcionarios.id))
      .where(eq(aprobaciones.areaId, areaId))

    const filas: FilaGestionArea[] = rows.map((r) => ({
      funcionario: mapFuncionario(r.funcionario),
      estado: r.estado as EstadoArea,
    }))

    return filas.sort((a, b) => {
      const r = RANGO_ESTADO_AREA[a.estado] - RANGO_ESTADO_AREA[b.estado]
      if (r !== 0) return r
      return a.funcionario.fechaRetiro.localeCompare(b.funcionario.fechaRetiro)
    })
  },

  async obtenerDetalle(
    funcionarioId: string,
  ): Promise<FuncionarioDetalle | null> {
    // Load funcionario
    const fRows = await db
      .select()
      .from(funcionarios)
      .where(eq(funcionarios.id, funcionarioId))
      .limit(1)
    const fRow = fRows[0]
    if (!fRow) return null

    // Load aprobaciones joined with areas (for nombre and orden)
    const apRows = await db
      .select({
        id: aprobaciones.id,
        funcionarioId: aprobaciones.funcionarioId,
        areaId: aprobaciones.areaId,
        estado: aprobaciones.estado,
        updatedAt: aprobaciones.updatedAt,
        areaNombre: areas.nombre,
        orden: areas.orden,
      })
      .from(aprobaciones)
      .leftJoin(areas, eq(aprobaciones.areaId, areas.id))
      .where(eq(aprobaciones.funcionarioId, funcionarioId))

    const aprobacionesMapeadas: AprobacionConArea[] = apRows
      .map((r) => ({
        id: r.id,
        funcionarioId: r.funcionarioId,
        areaId: r.areaId,
        estado: r.estado as EstadoArea,
        updatedAt: r.updatedAt.toISOString(),
        areaNombre: r.areaNombre ?? "—",
        orden: r.orden ?? 999,
      }))
      .sort((a, b) => a.orden - b.orden)

    // Load observaciones ordered by created_at desc (newest first)
    const obsRows = await db
      .select()
      .from(observaciones)
      .where(eq(observaciones.funcionarioId, funcionarioId))
      .orderBy(desc(observaciones.createdAt))

    const observacionesMapeadas: Observacion[] = obsRows.map(
      (r: ObservacionRow) => ({
        id: r.id,
        funcionarioId: r.funcionarioId,
        areaId: r.areaId,
        estado: r.estado as EstadoArea,
        texto: r.texto,
        autor: r.autor,
        createdAt: r.createdAt.toISOString(),
      }),
    )

    return {
      funcionario: mapFuncionario(fRow),
      aprobaciones: aprobacionesMapeadas,
      observaciones: observacionesMapeadas,
    }
  },

  async cambiarEstadoArea(
    args: CambiarEstadoAreaArgs,
  ): Promise<ResultadoMutacion> {
    const { funcionarioId, areaId, estado, observacion, autor } = args
    const ahora = new Date()

    // La actualización del visto bueno, la observación y el recálculo del estado
    // global se confirman como una sola unidad atómica.
    return db.transaction(async (tx) => {
      // Lock pesimista sobre la fila del funcionario: serializa dos cambios de área
      // concurrentes del MISMO funcionario. Sin esto, bajo READ COMMITTED cada `recomputar`
      // no ve la escritura no confirmada de la otra transacción y ambas concluirían
      // "no todas OK", dejando el estado global desincronizado (nunca sube a
      // LISTO_PARA_LIQUIDAR). La 2ª tx espera aquí y luego recomputa contra lo ya confirmado.
      await tx
        .select({ id: funcionarios.id })
        .from(funcionarios)
        .where(eq(funcionarios.id, funcionarioId))
        .for("update")

      await tx
        .update(aprobaciones)
        .set({ estado, updatedAt: ahora })
        .where(
          and(
            eq(aprobaciones.funcionarioId, funcionarioId),
            eq(aprobaciones.areaId, areaId),
          ),
        )

      // Insert observacion if text is provided (mirrors supabase.ts behavior)
      if (observacion && observacion.trim()) {
        await tx.insert(observaciones).values({
          funcionarioId,
          areaId,
          estado,
          texto: observacion.trim(),
          autor: autor?.trim() || "Administrador",
          createdAt: ahora,
        })
      }

      return recomputar(funcionarioId, tx)
    })
  },

  async generarLiquidacion(
    funcionarioId: string,
    autor?: string,
  ): Promise<ResultadoMutacion> {
    const ahora = new Date()
    return db.transaction(async (tx) => {
      // El UPDATE condicionado al estado esperado cierra el TOCTOU: si otra
      // transacción ya avanzó el trámite, afecta 0 filas y abortamos en vez de
      // pisar un hito ya registrado (idempotencia).
      const filas = await tx
        .update(funcionarios)
        .set({
          fechaLiquidacionGenerada: ahora,
          liquidacionGeneradaPor: autor?.trim() || "Talento Humano",
        })
        .where(
          and(
            eq(funcionarios.id, funcionarioId),
            eq(funcionarios.estadoGlobal, "LISTO_PARA_LIQUIDAR"),
          ),
        )
        .returning({ id: funcionarios.id })
      if (filas.length === 0) {
        throw new ErrorValidacion(
          "El trámite cambió de estado; recargue e intente de nuevo.",
        )
      }
      return recomputar(funcionarioId, tx)
    })
  },

  async registrarLiquidacion(
    funcionarioId: string,
    autor?: string,
  ): Promise<ResultadoMutacion> {
    const ahora = new Date()
    return db.transaction(async (tx) => {
      const filas = await tx
        .update(funcionarios)
        .set({
          fechaLiquidacion: ahora,
          liquidadoPor: autor?.trim() || "Control Interno",
        })
        .where(
          and(
            eq(funcionarios.id, funcionarioId),
            eq(funcionarios.estadoGlobal, "LIQUIDACION_GENERADA"),
          ),
        )
        .returning({ id: funcionarios.id })
      if (filas.length === 0) {
        throw new ErrorValidacion(
          "El trámite cambió de estado; recargue e intente de nuevo.",
        )
      }
      return recomputar(funcionarioId, tx)
    })
  },

  async obtenerMetricas(): Promise<MetricasDashboard> {
    const [fRows, aRows, apRows] = await Promise.all([
      db
        .select({
          id: funcionarios.id,
          estadoGlobal: funcionarios.estadoGlobal,
          fechaRetiro: funcionarios.fechaRetiro,
        })
        .from(funcionarios),
      db.select({ id: areas.id, nombre: areas.nombre }).from(areas),
      db
        .select({
          funcionarioId: aprobaciones.funcionarioId,
          areaId: aprobaciones.areaId,
          estado: aprobaciones.estado,
        })
        .from(aprobaciones),
    ])

    // Count by estado global
    const porEstado = ESTADOS_GLOBAL.reduce(
      (acc, e) => ({ ...acc, [e]: 0 }),
      {} as Record<string, number>,
    ) as Record<import("@pys/shared").EstadoGlobal, number>

    for (const f of fRows) porEstado[f.estadoGlobal] += 1

    // Pending count per area
    const pendientesPorArea = aRows
      .map((area) => ({
        areaId: area.id,
        areaNombre: area.nombre,
        pendientes: apRows.filter(
          (ap) =>
            ap.areaId === area.id &&
            (ap.estado === "PENDIENTE" || ap.estado === "NO_APROBADO"),
        ).length,
      }))
      .sort((a, b) => b.pendientes - a.pendientes)

    // Aging: same date-math as supabase.ts
    const hoy = new Date()
    const inicioHoy = Date.UTC(
      hoy.getUTCFullYear(),
      hoy.getUTCMonth(),
      hoy.getUTCDate(),
    )
    const DIA = 24 * 60 * 60 * 1000
    const aging = { atrasados: 0, proximos: 0, masAdelante: 0, sinFecha: 0 }

    for (const f of fRows) {
      // Exclude already-resolved funcionarios (liquidación generada or paz y salvo)
      if (
        f.estadoGlobal === "LIQUIDACION_GENERADA" ||
        f.estadoGlobal === "PAZ_Y_SALVO"
      )
        continue

      if (!f.fechaRetiro) {
        aging.sinFecha += 1
        continue
      }
      // fechaRetiro is a date column — Drizzle returns it as a string "yyyy-mm-dd"
      const fechaStr =
        typeof f.fechaRetiro === "string" ? f.fechaRetiro : String(f.fechaRetiro)
      const t = Date.parse(`${fechaStr}T00:00:00.000Z`)
      if (Number.isNaN(t)) aging.sinFecha += 1
      else if (t < inicioHoy) aging.atrasados += 1
      else if (t <= inicioHoy + 7 * DIA) aging.proximos += 1
      else aging.masAdelante += 1
    }

    return {
      totalFuncionarios: fRows.length,
      porEstado,
      pendientesPorArea,
      aging,
    }
  },

  async listarFuncionariosPaginado(
    filtro?: FiltroFuncionarios,
  ): Promise<ResultadoPaginado<Funcionario>> {
    const { pagina, porPagina } = normalizarPagina({
      pagina: filtro?.pagina,
      porPagina: filtro?.porPagina,
    })
    const desde = (pagina - 1) * porPagina

    const q = filtro?.q?.trim()

    // Build where conditions
    const conditions = []
    if (q) {
      const patron = `%${q}%`
      conditions.push(
        or(
          ilike(funcionarios.nombreCompleto, patron),
          ilike(funcionarios.documento, patron),
        ),
      )
    }
    if (filtro?.estado) {
      conditions.push(eq(funcionarios.estadoGlobal, filtro.estado))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Fetch page + total in parallel
    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(funcionarios)
        .where(whereClause)
        // The estado_global enum is declared in priority order
        // (PENDIENTE < LISTO_PARA_LIQUIDAR < LIQUIDACION_GENERADA < PAZ_Y_SALVO),
        // so ordering by the column puts pending ones first — same as memoryRepo.
        .orderBy(asc(funcionarios.estadoGlobal), asc(funcionarios.fechaRetiro))
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
      items: rows.map(mapFuncionario),
      total,
      pagina,
      porPagina,
      totalPaginas,
    }
  },

  async listarGestionAreaPaginado(
    areaId: string,
    pagina?: Pagina,
  ): Promise<ResultadoPaginado<FilaGestionArea>> {
    // Mirror supabase.ts: paginate in-memory over the already-sorted list
    // (volume is bounded per area)
    const filas = await this.listarGestionArea(areaId)
    return paginar(filas, pagina)
  },

  async listarArchivo(
    filtro?: FiltroArchivo,
  ): Promise<ResultadoPaginado<Funcionario>> {
    const { pagina, porPagina } = normalizarPagina({
      pagina: filtro?.pagina,
      porPagina: filtro?.porPagina,
    })
    const desde = (pagina - 1) * porPagina

    const q = filtro?.q?.trim()

    // El Archivo es, por definición, el conjunto de trámites cerrados.
    const conditions = [eq(funcionarios.estadoGlobal, "PAZ_Y_SALVO")]
    if (q) {
      const patron = `%${q}%`
      conditions.push(
        // `or` no devuelve undefined cuando recibe argumentos → seguro en el array
        or(
          ilike(funcionarios.nombreCompleto, patron),
          ilike(funcionarios.documento, patron),
        )!,
      )
    }
    if (filtro?.retiroDesde) {
      conditions.push(gte(funcionarios.fechaRetiro, filtro.retiroDesde))
    }
    if (filtro?.retiroHasta) {
      conditions.push(lte(funcionarios.fechaRetiro, filtro.retiroHasta))
    }

    const whereClause = and(...conditions)

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(funcionarios)
        .where(whereClause)
        // Cierre más reciente primero: el archivo se lee de lo último finalizado
        // hacia atrás. Desempate estable por documento.
        .orderBy(desc(funcionarios.fechaLiquidacion), asc(funcionarios.documento))
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
      items: rows.map(mapFuncionario),
      total,
      pagina,
      porPagina,
      totalPaginas,
    }
  },
}
