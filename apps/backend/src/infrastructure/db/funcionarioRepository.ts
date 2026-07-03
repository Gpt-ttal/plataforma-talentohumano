import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm"
import type {
  AprobacionConArea,
  ColaGestionArea,
  CrearEmpleadoInput,
  CrearExperienciaInput,
  CrearFamiliarInput,
  CrearFormacionInput,
  EditarContractualInput,
  EditarEmpleadoInput,
  DatosPersonales,
  DatosSalariales,
  EmpleadoContractual,
  Empleado,
  EmpleadoDetalle,
  EstadoArea,
  ExpedienteCompleto,
  Experiencia,
  Familiar,
  FilaGestionArea,
  Formacion,
  FilaMatriz,
  FiltroArchivo,
  FiltroEmpleados,
  FiltroFuncionarios,
  FiltroGestionArea,
  Funcionario,
  FuncionarioDetalle,
  GuardarPersonalesInput,
  GuardarSalarialInput,
  MatrizGestion,
  MetricasDashboard,
  Novedad,
  Observacion,
  RegistrarNovedadInput,
  ResultadoPaginado,
} from "@pys/shared"
import { normalizarPagina, particionarCola, ESTADOS_GLOBAL } from "@pys/shared"
import type {
  CambiarEstadoAreaArgs,
  FuncionarioRepo,
  ResultadoMutacion,
} from "../../domain/ports/FuncionarioRepo.js"
import { db } from "./client.js"
import {
  aprobaciones,
  areas,
  empleadoExperiencia,
  empleadoFamiliares,
  empleadoFormacion,
  empleadoPersonales,
  empleadoSalarial,
  funcionarios,
  novedades,
  observaciones,
} from "./schema.js"
import { recomputarEstado } from "./recomputarEstado.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../../application/errors.js"

// ── Row types ───────────────────────────────────────────────────────────────

type FuncionarioRow = typeof funcionarios.$inferSelect
type ObservacionRow = typeof observaciones.$inferSelect
type NovedadRow = typeof novedades.$inferSelect

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

/**
 * Proyección MAESTRA de la misma fila: `Empleado`. A diferencia de `Funcionario`,
 * tolera `fechaRetiro === null` (empleado ACTIVO) y expone los campos de núcleo.
 */
function mapEmpleado(r: FuncionarioRow): Empleado {
  return {
    id: r.id,
    documento: r.documento,
    nombreCompleto: r.nombreCompleto,
    tipoVinculacion: r.tipoVinculacion ?? null,
    cargo: r.cargo,
    areaOrigen: r.areaOrigen,
    fechaIngreso: r.fechaIngreso ?? null,
    fechaFinContrato: r.fechaFinContrato ?? null,
    correoInstitucional: r.correoInstitucional ?? null,
    telefono: r.telefono ?? null,
    fechaRetiro: r.fechaRetiro ?? null,
    estadoGlobal: r.estadoGlobal,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

function mapNovedad(r: NovedadRow): Novedad {
  return {
    id: r.id,
    funcionarioId: r.funcionarioId,
    tipo: r.tipo,
    motivo: r.motivo,
    valorAnterior: r.valorAnterior ?? null,
    valorNuevo: r.valorNuevo ?? null,
    autor: r.autor,
    createdAt: r.createdAt.toISOString(),
  }
}

// ── Mappers de la hoja de vida 360° ─────────────────────────────────────────

/** Bloque contractual extendido (columnas nuevas de `funcionarios`, no sensible). */
function mapContractual(r: FuncionarioRow): EmpleadoContractual {
  return {
    areaId: r.areaId ?? null,
    tipoContrato: r.tipoContrato ?? null,
    modalidad: r.modalidad ?? null,
    programa: r.programa ?? null,
    escalafon: r.escalafon ?? null,
    jefeInmediato: r.jefeInmediato ?? null,
    fechaPrimerIngreso: r.fechaPrimerIngreso ?? null,
    observacion: r.observacion ?? null,
    fotoPath: r.fotoPath ?? null,
  }
}

type PersonalesRow = typeof empleadoPersonales.$inferSelect
type FamiliarRow = typeof empleadoFamiliares.$inferSelect
type FormacionRow = typeof empleadoFormacion.$inferSelect
type ExperienciaRow = typeof empleadoExperiencia.$inferSelect
type SalarialRow = typeof empleadoSalarial.$inferSelect

/** `numeric` de pg vuelve como string; lo convertimos a número (o null). */
function numOrNull(v: string | null): number | null {
  return v === null || v === undefined ? null : Number(v)
}

/** Dirección inversa: `numeric` de pg se escribe como string. */
function numAString(v: number | null): string | null {
  return v === null ? null : String(v)
}

function mapPersonales(r: PersonalesRow): DatosPersonales {
  return {
    fechaExpedicion: r.fechaExpedicion ?? null,
    lugarExpedicion: r.lugarExpedicion ?? null,
    fechaNacimiento: r.fechaNacimiento ?? null,
    lugarNacimiento: r.lugarNacimiento ?? null,
    genero: r.genero ?? null,
    direccion: r.direccion ?? null,
    barrio: r.barrio ?? null,
    municipio: r.municipio ?? null,
    correoPersonal: r.correoPersonal ?? null,
  }
}

function mapFamiliar(r: FamiliarRow): Familiar {
  return {
    id: r.id,
    funcionarioId: r.funcionarioId,
    parentesco: r.parentesco,
    nombre: r.nombre,
    fechaNacimiento: r.fechaNacimiento ?? null,
    genero: r.genero ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

function mapFormacion(r: FormacionRow): Formacion {
  return {
    id: r.id,
    funcionarioId: r.funcionarioId,
    nivel: r.nivel,
    titulo: r.titulo,
    institucion: r.institucion ?? null,
    anioInicio: r.anioInicio ?? null,
    anioFin: r.anioFin ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

function mapExperiencia(r: ExperienciaRow): Experiencia {
  return {
    id: r.id,
    funcionarioId: r.funcionarioId,
    empresa: r.empresa,
    cargo: r.cargo,
    fechaInicio: r.fechaInicio ?? null,
    fechaFin: r.fechaFin ?? null,
    descripcion: r.descripcion ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

function mapSalarial(r: SalarialRow): DatosSalariales {
  return {
    salarioBasico: numOrNull(r.salarioBasico),
    auxilioTransporte: numOrNull(r.auxilioTransporte),
    promedioDevengado: numOrNull(r.promedioDevengado),
    valorEnLetras: r.valorEnLetras ?? null,
    honorarios: numOrNull(r.honorarios),
    eps: r.eps ?? null,
    afp: r.afp ?? null,
  }
}

/** 404 homogéneo para las mutaciones de bloque satélite (el empleado debe existir). */
async function assertEmpleadoExiste(id: string): Promise<void> {
  const [row] = await db
    .select({ id: funcionarios.id })
    .from(funcionarios)
    .where(eq(funcionarios.id, id))
    .limit(1)
  if (!row) throw new ErrorNoEncontrado("El empleado no existe.")
}

// ── Estado-area ordering (mirrors supabase.ts RANGO_ESTADO_AREA) ─────────────

const RANGO_ESTADO_AREA: Record<EstadoArea, number> = {
  PENDIENTE: 0,
  NO_APROBADO: 1,
  APROBADO: 2,
  NO_APLICA: 3,
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
      return recomputarEstado(funcionarioId, tx)
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
      return recomputarEstado(funcionarioId, tx)
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
  },

  async listarMatrizPaginado(
    filtro?: FiltroFuncionarios,
  ): Promise<MatrizGestion> {
    // (1) La página de funcionarios reusa la lógica de filtro/orden/paginación
    // del catálogo: misma fuente de verdad, sin duplicar el SQL.
    const pagina = await this.listarFuncionariosPaginado(filtro)

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
  },

  async listarGestionAreaPaginado(
    areaId: string,
    filtro?: FiltroGestionArea,
  ): Promise<ColaGestionArea> {
    // La cola del área (ya filtrada por área activa + ordenada) se parte por
    // bucket y se pagina en memoria; el volumen por área está acotado.
    const filas = await this.listarGestionArea(areaId)
    return particionarCola(filas, filtro)
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

  // ── Maestro de empleados (Administración de Personal) ────────────────────────

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

    const [row] = await db
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
    return db.transaction(async (tx) => {
      // 1) Puente atómico con guarda TOCTOU: solo dispara si el empleado está
      //    ACTIVO (fecha_retiro NULL). Un segundo intento afecta 0 filas → 400.
      const flip = await tx
        .update(funcionarios)
        .set({ fechaRetiro, updatedAt: new Date() })
        .where(and(eq(funcionarios.id, id), isNull(funcionarios.fechaRetiro)))
        .returning({ id: funcionarios.id })
      if (flip.length === 0) {
        const existe = await tx
          .select({ id: funcionarios.id })
          .from(funcionarios)
          .where(eq(funcionarios.id, id))
          .limit(1)
        if (existe.length === 0) throw new ErrorNoEncontrado("El empleado no existe.")
        throw new ErrorValidacion(
          "El contrato ya fue finalizado; el trámite ya está en curso.",
        )
      }

      // 2) Backfill de aprobaciones PENDIENTE para las áreas ACTIVAS (mismo
      //    mecanismo que `crearArea`). onConflictDoNothing es defensivo.
      const areasActivas = await tx
        .select({ id: areas.id })
        .from(areas)
        .where(eq(areas.activa, true))
      if (areasActivas.length > 0) {
        await tx
          .insert(aprobaciones)
          .values(
            areasActivas.map((a) => ({
              funcionarioId: id,
              areaId: a.id,
              estado: "PENDIENTE" as const,
            })),
          )
          .onConflictDoNothing()
      }

      // 3) Recalcular el estado global (PENDIENTE, o LISTO_PARA_LIQUIDAR si no hay
      //    áreas activas). Reusa la máquina de estados sin tocarla.
      return recomputarEstado(id, tx)
    })
  },

  async registrarNovedad(
    id: string,
    novedad: RegistrarNovedadInput,
    autor: string,
  ): Promise<EmpleadoDetalle> {
    return db.transaction(async (tx) => {
      const [emp] = await tx
        .select()
        .from(funcionarios)
        .where(eq(funcionarios.id, id))
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

  async obtenerExpediente(
    id: string,
    incluyeSalarial: boolean,
  ): Promise<ExpedienteCompleto | null> {
    const [row] = await db
      .select()
      .from(funcionarios)
      .where(eq(funcionarios.id, id))
      .limit(1)
    if (!row) return null

    const [persRows, famRows, formRows, expRows, novRows] = await Promise.all([
      db.select().from(empleadoPersonales).where(eq(empleadoPersonales.funcionarioId, id)).limit(1),
      db
        .select()
        .from(empleadoFamiliares)
        .where(eq(empleadoFamiliares.funcionarioId, id))
        .orderBy(asc(empleadoFamiliares.createdAt)),
      db
        .select()
        .from(empleadoFormacion)
        .where(eq(empleadoFormacion.funcionarioId, id))
        .orderBy(desc(empleadoFormacion.anioFin)),
      db
        .select()
        .from(empleadoExperiencia)
        .where(eq(empleadoExperiencia.funcionarioId, id))
        .orderBy(desc(empleadoExperiencia.fechaInicio)),
      db.select().from(novedades).where(eq(novedades.funcionarioId, id)).orderBy(desc(novedades.createdAt)),
    ])

    const expediente: ExpedienteCompleto = {
      empleado: mapEmpleado(row),
      contractual: mapContractual(row),
      personales: persRows[0] ? mapPersonales(persRows[0]) : null,
      familiares: famRows.map(mapFamiliar),
      formacion: formRows.map(mapFormacion),
      experiencia: expRows.map(mapExperiencia),
      novedades: novRows.map(mapNovedad),
      salarialVisible: incluyeSalarial,
    }

    if (incluyeSalarial) {
      const [salRow] = await db
        .select()
        .from(empleadoSalarial)
        .where(eq(empleadoSalarial.funcionarioId, id))
        .limit(1)
      expediente.salarial = salRow ? mapSalarial(salRow) : null
    }

    return expediente
  },

  // ── Hoja de vida 360°: captura por bloque satélite (Sprint 2) ─────────────

  async guardarPersonales(
    id: string,
    datos: GuardarPersonalesInput,
  ): Promise<DatosPersonales> {
    await assertEmpleadoExiste(id)
    const patch: Partial<typeof empleadoPersonales.$inferInsert> = {}
    if (datos.fechaExpedicion !== undefined) patch.fechaExpedicion = datos.fechaExpedicion
    if (datos.lugarExpedicion !== undefined) patch.lugarExpedicion = datos.lugarExpedicion
    if (datos.fechaNacimiento !== undefined) patch.fechaNacimiento = datos.fechaNacimiento
    if (datos.lugarNacimiento !== undefined) patch.lugarNacimiento = datos.lugarNacimiento
    if (datos.genero !== undefined) patch.genero = datos.genero
    if (datos.direccion !== undefined) patch.direccion = datos.direccion
    if (datos.barrio !== undefined) patch.barrio = datos.barrio
    if (datos.municipio !== undefined) patch.municipio = datos.municipio
    if (datos.correoPersonal !== undefined) patch.correoPersonal = datos.correoPersonal

    const [row] = await db
      .insert(empleadoPersonales)
      .values({ funcionarioId: id, ...patch })
      .onConflictDoUpdate({
        target: empleadoPersonales.funcionarioId,
        set: { ...patch, updatedAt: new Date() },
      })
      .returning()
    if (!row) throw new Error("guardarPersonales: el upsert no devolvió la fila.")
    return mapPersonales(row)
  },

  async crearFamiliar(id: string, datos: CrearFamiliarInput): Promise<Familiar> {
    await assertEmpleadoExiste(id)
    const [row] = await db
      .insert(empleadoFamiliares)
      .values({
        funcionarioId: id,
        parentesco: datos.parentesco,
        nombre: datos.nombre,
        fechaNacimiento: datos.fechaNacimiento ?? null,
        genero: datos.genero ?? null,
      })
      .returning()
    if (!row) throw new Error("crearFamiliar: la inserción no devolvió el familiar.")
    return mapFamiliar(row)
  },

  async eliminarFamiliar(id: string, familiarId: string): Promise<void> {
    const borrados = await db
      .delete(empleadoFamiliares)
      .where(and(eq(empleadoFamiliares.id, familiarId), eq(empleadoFamiliares.funcionarioId, id)))
      .returning({ id: empleadoFamiliares.id })
    if (borrados.length === 0) throw new ErrorNoEncontrado("El familiar no existe.")
  },

  async crearFormacion(id: string, datos: CrearFormacionInput): Promise<Formacion> {
    await assertEmpleadoExiste(id)
    const [row] = await db
      .insert(empleadoFormacion)
      .values({
        funcionarioId: id,
        nivel: datos.nivel,
        titulo: datos.titulo,
        institucion: datos.institucion ?? null,
        anioInicio: datos.anioInicio ?? null,
        anioFin: datos.anioFin ?? null,
      })
      .returning()
    if (!row) throw new Error("crearFormacion: la inserción no devolvió el registro.")
    return mapFormacion(row)
  },

  async eliminarFormacion(id: string, formacionId: string): Promise<void> {
    const borrados = await db
      .delete(empleadoFormacion)
      .where(and(eq(empleadoFormacion.id, formacionId), eq(empleadoFormacion.funcionarioId, id)))
      .returning({ id: empleadoFormacion.id })
    if (borrados.length === 0) throw new ErrorNoEncontrado("El registro de formación no existe.")
  },

  async crearExperiencia(id: string, datos: CrearExperienciaInput): Promise<Experiencia> {
    await assertEmpleadoExiste(id)
    const [row] = await db
      .insert(empleadoExperiencia)
      .values({
        funcionarioId: id,
        empresa: datos.empresa,
        cargo: datos.cargo,
        fechaInicio: datos.fechaInicio ?? null,
        fechaFin: datos.fechaFin ?? null,
        descripcion: datos.descripcion ?? null,
      })
      .returning()
    if (!row) throw new Error("crearExperiencia: la inserción no devolvió el registro.")
    return mapExperiencia(row)
  },

  async eliminarExperiencia(id: string, experienciaId: string): Promise<void> {
    const borrados = await db
      .delete(empleadoExperiencia)
      .where(
        and(eq(empleadoExperiencia.id, experienciaId), eq(empleadoExperiencia.funcionarioId, id)),
      )
      .returning({ id: empleadoExperiencia.id })
    if (borrados.length === 0) throw new ErrorNoEncontrado("El registro de experiencia no existe.")
  },

  async guardarSalarial(id: string, datos: GuardarSalarialInput): Promise<DatosSalariales> {
    await assertEmpleadoExiste(id)
    const patch: Partial<typeof empleadoSalarial.$inferInsert> = {}
    if (datos.salarioBasico !== undefined) patch.salarioBasico = numAString(datos.salarioBasico)
    if (datos.auxilioTransporte !== undefined)
      patch.auxilioTransporte = numAString(datos.auxilioTransporte)
    if (datos.promedioDevengado !== undefined)
      patch.promedioDevengado = numAString(datos.promedioDevengado)
    if (datos.valorEnLetras !== undefined) patch.valorEnLetras = datos.valorEnLetras
    if (datos.honorarios !== undefined) patch.honorarios = numAString(datos.honorarios)
    if (datos.eps !== undefined) patch.eps = datos.eps
    if (datos.afp !== undefined) patch.afp = datos.afp

    const [row] = await db
      .insert(empleadoSalarial)
      .values({ funcionarioId: id, ...patch })
      .onConflictDoUpdate({
        target: empleadoSalarial.funcionarioId,
        set: { ...patch, updatedAt: new Date() },
      })
      .returning()
    if (!row) throw new Error("guardarSalarial: el upsert no devolvió la fila.")
    return mapSalarial(row)
  },

  async editarContractual(
    id: string,
    datos: EditarContractualInput,
  ): Promise<EmpleadoContractual> {
    const patch: Partial<typeof funcionarios.$inferInsert> = { updatedAt: new Date() }
    if (datos.areaId !== undefined) patch.areaId = datos.areaId
    if (datos.tipoContrato !== undefined) patch.tipoContrato = datos.tipoContrato
    if (datos.modalidad !== undefined) patch.modalidad = datos.modalidad
    if (datos.programa !== undefined) patch.programa = datos.programa
    if (datos.escalafon !== undefined) patch.escalafon = datos.escalafon
    if (datos.jefeInmediato !== undefined) patch.jefeInmediato = datos.jefeInmediato
    if (datos.fechaPrimerIngreso !== undefined)
      patch.fechaPrimerIngreso = datos.fechaPrimerIngreso
    if (datos.observacion !== undefined) patch.observacion = datos.observacion

    const [row] = await db
      .update(funcionarios)
      .set(patch)
      .where(eq(funcionarios.id, id))
      .returning()
    if (!row) throw new ErrorNoEncontrado("El empleado no existe.")
    return mapContractual(row)
  },

  async guardarFotoPath(id: string, fotoPath: string | null): Promise<EmpleadoContractual> {
    const [row] = await db
      .update(funcionarios)
      .set({ fotoPath, updatedAt: new Date() })
      .where(eq(funcionarios.id, id))
      .returning()
    if (!row) throw new ErrorNoEncontrado("El empleado no existe.")
    return mapContractual(row)
  },

  async obtenerFotoPath(id: string): Promise<string | null> {
    const [row] = await db
      .select({ fotoPath: funcionarios.fotoPath })
      .from(funcionarios)
      .where(eq(funcionarios.id, id))
      .limit(1)
    return row?.fotoPath ?? null
  },
}
