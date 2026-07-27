import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm"
import type {
  AprobacionConArea,
  ColaGestionArea,
  EstadoArea,
  FilaGestionArea,
  FilaMatriz,
  FiltroArchivo,
  FiltroFuncionarios,
  FiltroGestionArea,
  Funcionario,
  FuncionarioDetalle,
  MatrizGestion,
  MetricasDashboard,
  Observacion,
  ResultadoPaginado,
} from "@pys/shared"
import { normalizarPagina, particionarCola, ESTADOS_GLOBAL } from "@pys/shared"
import type {
  ArchivarCasoResultado,
  CambiarEstadoAreaArgs,
  DevolverCasoAAreaArgs,
  FuncionarioRepo,
  ResultadoMutacion,
} from "../../../domain/ports/FuncionarioRepo.js"
import { db } from "../client.js"
import { aprobaciones, areas, funcionarios, observaciones } from "../schema.js"
import { recomputarEstado } from "../recomputarEstado.js"
import { registrarEvento } from "../eventoAuditoriaRepository.js"
import { ErrorValidacion } from "../../../application/errors.js"

// ── Row types ───────────────────────────────────────────────────────────────

type FuncionarioRow = typeof funcionarios.$inferSelect
type ObservacionRow = typeof observaciones.$inferSelect

// ── Mappers (snake_case DB → camelCase domain) ──────────────────────────────

/**
 * `fechaRetiro` is a `date` column — Drizzle returns it as a string ("yyyy-mm-dd").
 * Timestamps are returned as Date objects and must be converted to ISO strings.
 */
export function mapFuncionario(r: FuncionarioRow): Funcionario {
  return {
    id: r.id,
    documento: r.documento,
    nombreCompleto: r.nombreCompleto,
    // `fecha_retiro` es `date` → Drizzle la devuelve como string ("yyyy-mm-dd").
    // `Funcionario` es la proyección de TRÁMITE: por contrato (domain.ts) su
    // `fechaRetiro` es `string` no-null. Las lecturas de trámite ya excluyen filas
    // con `fecha_retiro IS NULL` (scope en `listarFuncionariosPaginado`/`obtenerDetalle`),
    // así que un null aquí sería invariante rota; `?? ""` evita fabricar el string
    // literal "null" que antes filtraba `String(null)` a la API.
    fechaRetiro: r.fechaRetiro ?? "",
    areaOrigen: r.areaOrigen,
    cargo: r.cargo,
    estadoGlobal: r.estadoGlobal,
    fechaLiquidacionGenerada:
      r.fechaLiquidacionGenerada ? r.fechaLiquidacionGenerada.toISOString() : null,
    liquidacionGeneradaPor: r.liquidacionGeneradaPor ?? null,
    fechaLiquidacion:
      r.fechaLiquidacion ? r.fechaLiquidacion.toISOString() : null,
    liquidadoPor: r.liquidadoPor ?? null,
    archivadoEn: r.archivadoEn ? r.archivadoEn.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

// ── Estado-area ordering (ranking local; único consumidor) ───────────────────

const RANGO_ESTADO_AREA: Record<EstadoArea, number> = {
  PENDIENTE: 0,
  NO_APROBADO: 1,
  DEVUELTO_POR_CI: 1,
  APROBADO: 2,
  NO_APLICA: 3,
}

// ── Trámite de Paz y Salvo ───────────────────────────────────────────────────

async function listarGestionArea(areaId: string): Promise<FilaGestionArea[]> {
  // D2: una dependencia inactiva no tiene cola (el join con `areas` filtrando
  // `activa = true` deja la lista vacía si el área dejó de exigirse).
  const rows = await db
    .select({
      estado: aprobaciones.estado,
      funcionario: funcionarios,
    })
    .from(aprobaciones)
    .innerJoin(funcionarios, eq(aprobaciones.funcionarioId, funcionarios.id))
    .innerJoin(areas, eq(aprobaciones.areaId, areas.id))
    .where(and(eq(aprobaciones.areaId, areaId), eq(areas.activa, true)))

  const filas: FilaGestionArea[] = rows.map((r) => ({
    funcionario: mapFuncionario(r.funcionario),
    estado: r.estado as EstadoArea,
  }))

  return filas.sort((a, b) => {
    const r = RANGO_ESTADO_AREA[a.estado] - RANGO_ESTADO_AREA[b.estado]
    if (r !== 0) return r
    return a.funcionario.fechaRetiro.localeCompare(b.funcionario.fechaRetiro)
  })
}

async function obtenerDetalle(
  funcionarioId: string,
): Promise<FuncionarioDetalle | null> {
  // Load funcionario. SCOPING: el detalle de trámite es SOLO para retirados en
  // proceso (fila con `fecha_retiro` puesta). Un empleado ACTIVO del maestro de
  // Personal (fecha_retiro NULL) devuelve null aquí → 404, como debe ser: tiene
  // su propia lectura en `GET /api/personal/:id`. Sin este recorte, `mapFuncionario`
  // proyectaba un `Funcionario` con datos de trámite vacíos sobre un ACTIVO.
  const fRows = await db
    .select()
    .from(funcionarios)
    .where(and(eq(funcionarios.id, funcionarioId), isNotNull(funcionarios.fechaRetiro)))
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
}

async function cambiarEstadoArea(
  args: CambiarEstadoAreaArgs,
): Promise<ResultadoMutacion> {
  const { funcionarioId, areaId, estado, observacion, autor } = args
  const ahora = new Date()

  // La actualización del visto bueno, la observación y el recálculo del estado
  // global se confirman como una sola unidad atómica.
  return db.transaction(async (tx) => {
    // Lock pesimista sobre la fila del funcionario: serializa dos cambios de área
    // concurrentes del MISMO funcionario. Sin esto, bajo READ COMMITTED cada `recomputarEstado`
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

    return recomputarEstado(funcionarioId, tx)
  })
}

async function devolverCasoAArea(
  args: DevolverCasoAAreaArgs,
): Promise<ResultadoMutacion> {
  const { funcionarioId, areaId, observacion, autor } = args
  const ahora = new Date()

  // Mismo patrón de `cambiarEstadoArea` (lock pesimista + update aprobaciones +
  // observación + recompute, todo atómico) + evento de auditoría, porque esta
  // transición SIEMPRE es un hito auditable (a diferencia del visto bueno normal).
  return db.transaction(async (tx) => {
    await tx
      .select({ id: funcionarios.id })
      .from(funcionarios)
      .where(eq(funcionarios.id, funcionarioId))
      .for("update")

    await tx
      .update(aprobaciones)
      .set({ estado: "DEVUELTO_POR_CI", updatedAt: ahora })
      .where(
        and(
          eq(aprobaciones.funcionarioId, funcionarioId),
          eq(aprobaciones.areaId, areaId),
        ),
      )

    await tx.insert(observaciones).values({
      funcionarioId,
      areaId,
      estado: "DEVUELTO_POR_CI",
      texto: observacion.trim(),
      autor: autor?.trim() || "Control Interno",
      createdAt: ahora,
    })

    await registrarEvento(
      {
        entidadTipo: "funcionario",
        entidadId: funcionarioId,
        accion: "DEVOLVER_CASO_A_AREA",
        actorNombre: autor?.trim() || "Control Interno",
        estadoNuevo: { areaId, estado: "DEVUELTO_POR_CI" },
        observacion: observacion.trim(),
      },
      tx,
    )

    return recomputarEstado(funcionarioId, tx)
  })
}

async function generarLiquidacion(
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
        liquidacionGeneradaPor: autor?.trim() || "Control Interno",
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
    await registrarEvento(
      {
        entidadTipo: "funcionario",
        entidadId: funcionarioId,
        accion: "GENERAR_LIQUIDACION",
        actorNombre: autor?.trim() || "Control Interno",
        estadoAnterior: { estadoGlobal: "LISTO_PARA_LIQUIDAR" },
        estadoNuevo: { estadoGlobal: "LIQUIDACION_GENERADA" },
      },
      tx,
    )
    return recomputarEstado(funcionarioId, tx)
  })
}

async function registrarLiquidacion(
  funcionarioId: string,
  autor?: string,
): Promise<ResultadoMutacion> {
  const ahora = new Date()
  return db.transaction(async (tx) => {
    const filas = await tx
      .update(funcionarios)
      .set({
        fechaLiquidacion: ahora,
        liquidadoPor: autor?.trim() || "Talento Humano",
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
    await registrarEvento(
      {
        entidadTipo: "funcionario",
        entidadId: funcionarioId,
        accion: "REGISTRAR_LIQUIDACION",
        actorNombre: autor?.trim() || "Talento Humano",
        estadoAnterior: { estadoGlobal: "LIQUIDACION_GENERADA" },
        estadoNuevo: { estadoGlobal: "PAZ_Y_SALVO" },
      },
      tx,
    )
    return recomputarEstado(funcionarioId, tx)
  })
}

async function archivarCaso(
  funcionarioId: string,
  autor?: string,
): Promise<ArchivarCasoResultado> {
  const ahora = new Date()
  return db.transaction(async (tx) => {
    // UPDATE condicionado: cierra el TOCTOU (idempotencia) igual que los
    // hitos de liquidación — 0 filas si ya estaba archivado o si el trámite
    // ya no está en PAZ_Y_SALVO (el trigger de BD es la última línea de
    // defensa, esta guarda evita depender de que reviente por excepción SQL).
    const filas = await tx
      .update(funcionarios)
      .set({ archivadoEn: ahora })
      .where(
        and(
          eq(funcionarios.id, funcionarioId),
          eq(funcionarios.estadoGlobal, "PAZ_Y_SALVO"),
          isNull(funcionarios.archivadoEn),
        ),
      )
      .returning({ archivadoEn: funcionarios.archivadoEn })
    if (filas.length === 0) {
      throw new ErrorValidacion(
        "El trámite ya fue archivado o no está en estado paz y salvo.",
      )
    }
    await registrarEvento(
      {
        entidadTipo: "funcionario",
        entidadId: funcionarioId,
        accion: "ARCHIVAR_CASO",
        actorNombre: autor?.trim() || "Talento Humano",
        estadoNuevo: { archivadoEn: ahora.toISOString() },
      },
      tx,
    )
    return { archivadoEn: filas[0]!.archivadoEn!.toISOString() }
  })
}

async function obtenerMetricas(): Promise<MetricasDashboard> {
  const [fRows, aRows, apRows] = await Promise.all([
    db
      .select({
        id: funcionarios.id,
        estadoGlobal: funcionarios.estadoGlobal,
        fechaRetiro: funcionarios.fechaRetiro,
      })
      .from(funcionarios)
      // SCOPING: las métricas del panel de Paz y Salvo cuentan solo trámites
      // (fecha_retiro puesta). Un empleado ACTIVO no infla los totales.
      .where(isNotNull(funcionarios.fechaRetiro)),
    // D2: el conteo de pendientes por área solo cubre dependencias activas.
    db.select({ id: areas.id, nombre: areas.nombre }).from(areas).where(eq(areas.activa, true)),
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
}

async function listarFuncionariosPaginado(
  filtro?: FiltroFuncionarios,
): Promise<ResultadoPaginado<Funcionario>> {
  const { pagina, porPagina } = normalizarPagina({
    pagina: filtro?.pagina,
    porPagina: filtro?.porPagina,
  })
  const desde = (pagina - 1) * porPagina

  const q = filtro?.q?.trim()

  // Build where conditions.
  // SCOPING: el catálogo de supervisión de Paz y Salvo es SOLO trámites, es
  // decir filas con `fecha_retiro` puesta. Un empleado ACTIVO (fecha_retiro
  // NULL, del maestro de Personal) nunca aparece aquí. La matriz reusa este
  // método, así que hereda el mismo recorte.
  const conditions = [isNotNull(funcionarios.fechaRetiro)]
  if (q) {
    const patron = `%${q}%`
    conditions.push(
      or(
        ilike(funcionarios.nombreCompleto, patron),
        ilike(funcionarios.documento, patron),
      )!,
    )
  }
  if (filtro?.estado) {
    conditions.push(eq(funcionarios.estadoGlobal, filtro.estado))
  }
  if (filtro?.areaBloqueante) {
    conditions.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(aprobaciones)
          .where(
            and(
              eq(aprobaciones.funcionarioId, funcionarios.id),
              eq(aprobaciones.areaId, filtro.areaBloqueante),
              notInArray(aprobaciones.estado, ["APROBADO", "NO_APLICA"]),
            ),
          ),
      ),
    )
  }

  const whereClause = and(...conditions)

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
}

async function listarMatrizPaginado(
  filtro?: FiltroFuncionarios,
): Promise<MatrizGestion> {
  // (1) La página de funcionarios reusa la lógica de filtro/orden/paginación
  // del catálogo: misma fuente de verdad, sin duplicar el SQL.
  const pagina = await listarFuncionariosPaginado(filtro)

  // Columnas = áreas activas en orden (D2: las inactivas no participan).
  const areasActivas = await db
    .select()
    .from(areas)
    .where(eq(areas.activa, true))
    .orderBy(asc(areas.orden))

  // (2) Estados de las áreas activas, solo para los funcionarios de la página.
  const ids = pagina.items.map((f) => f.id)
  const apRows = ids.length
    ? await db
        .select({
          funcionarioId: aprobaciones.funcionarioId,
          areaId: aprobaciones.areaId,
          estado: aprobaciones.estado,
        })
        .from(aprobaciones)
        .innerJoin(areas, eq(aprobaciones.areaId, areas.id))
        .where(and(inArray(aprobaciones.funcionarioId, ids), eq(areas.activa, true)))
    : []

  const estadosPorFunc = new Map<string, Record<string, EstadoArea>>(
    ids.map((id) => [id, {}]),
  )
  for (const r of apRows) {
    estadosPorFunc.get(r.funcionarioId)![r.areaId] = r.estado as EstadoArea
  }

  const items: FilaMatriz[] = pagina.items.map((funcionario) => ({
    funcionario,
    estados: estadosPorFunc.get(funcionario.id) ?? {},
  }))

  return {
    items,
    total: pagina.total,
    pagina: pagina.pagina,
    porPagina: pagina.porPagina,
    totalPaginas: pagina.totalPaginas,
    areas: areasActivas.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      orden: a.orden,
      activa: a.activa,
    })),
  }
}

async function listarGestionAreaPaginado(
  areaId: string,
  filtro?: FiltroGestionArea,
): Promise<ColaGestionArea> {
  // La cola del área (ya filtrada por área activa + ordenada) se parte por
  // bucket y se pagina en memoria; el volumen por área está acotado.
  const filas = await listarGestionArea(areaId)
  return particionarCola(filas, filtro)
}

async function listarArchivo(
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
}

export const tramiteRepo: Pick<
  FuncionarioRepo,
  | "listarGestionArea"
  | "obtenerDetalle"
  | "cambiarEstadoArea"
  | "devolverCasoAArea"
  | "generarLiquidacion"
  | "registrarLiquidacion"
  | "archivarCaso"
  | "obtenerMetricas"
  | "listarFuncionariosPaginado"
  | "listarMatrizPaginado"
  | "listarGestionAreaPaginado"
  | "listarArchivo"
> = {
  listarGestionArea,
  obtenerDetalle,
  cambiarEstadoArea,
  devolverCasoAArea,
  generarLiquidacion,
  registrarLiquidacion,
  archivarCaso,
  obtenerMetricas,
  listarFuncionariosPaginado,
  listarMatrizPaginado,
  listarGestionAreaPaginado,
  listarArchivo,
}
