import { and, count, desc, eq, ilike, or } from "drizzle-orm"
import type { CatalogoVacanteItem, FiltroVacantes, SugerenciasVacante, Vacante } from "@pys/shared"
import type { ResultadoPaginado } from "@pys/shared"
import { ErrorNoEncontrado, ErrorValidacion } from "../../application/errors.js"
import { db } from "./client.js"
import { vacanteAreas, vacanteDedicaciones, vacanteEscalafones, vacanteFuentes, vacanteModalidades, vacanteMotivos, vacantes } from "./schema.js"
import { type Ejecutor } from "./recomputarEstado.js"
import { crearFuncionarioDesdeVacante } from "./crearFuncionarioDesdeVacante.js"
import type {
  CambiosVacante,
  CatalogosVacantes,
  NuevaVacanteInput,
  VacanteRepo,
} from "../../domain/ports/VacanteRepo.js"

// ── Mapas de catálogo (id -> clave) ──────────────────────────────────────────
// Los 5 catálogos son pequeños (decenas de filas): se cargan enteros por
// llamada en vez de mantener caché — simplicidad sobre micro-optimización en
// esta fundación; se puede cachear si el volumen lo justifica más adelante.

interface MapasCatalogo {
  modalidad: Map<string, string>
  dedicacion: Map<string, string>
  escalafon: Map<string, string>
  motivo: Map<string, string>
  fuente: Map<string, string>
}

function aMapa(rows: { id: string; clave: string }[]): Map<string, string> {
  return new Map(rows.map((r) => [r.id, r.clave]))
}

async function cargarMapasCatalogo(): Promise<MapasCatalogo> {
  const [modalidades, dedicaciones, escalafones, motivos, fuentes] = await Promise.all([
    db.select({ id: vacanteModalidades.id, clave: vacanteModalidades.clave }).from(vacanteModalidades),
    db.select({ id: vacanteDedicaciones.id, clave: vacanteDedicaciones.clave }).from(vacanteDedicaciones),
    db.select({ id: vacanteEscalafones.id, clave: vacanteEscalafones.clave }).from(vacanteEscalafones),
    db.select({ id: vacanteMotivos.id, clave: vacanteMotivos.clave }).from(vacanteMotivos),
    db.select({ id: vacanteFuentes.id, clave: vacanteFuentes.clave }).from(vacanteFuentes),
  ])
  return {
    modalidad: aMapa(modalidades),
    dedicacion: aMapa(dedicaciones),
    escalafon: aMapa(escalafones),
    motivo: aMapa(motivos),
    fuente: aMapa(fuentes),
  }
}

function mapVacante(row: typeof vacantes.$inferSelect, mapas: MapasCatalogo): Vacante {
  return {
    id: row.id,
    requerimiento: row.requerimiento,
    cargo: row.cargo,
    posiciones: row.posiciones,
    areaId: row.areaId,
    modalidad: row.modalidadId ? (mapas.modalidad.get(row.modalidadId) ?? null) : null,
    dedicacion: row.dedicacionId ? (mapas.dedicacion.get(row.dedicacionId) ?? null) : null,
    escalafon: row.escalafonId ? (mapas.escalafon.get(row.escalafonId) ?? null) : null,
    motivo: row.motivoId ? (mapas.motivo.get(row.motivoId) ?? null) : null,
    fuente: row.fuenteId ? (mapas.fuente.get(row.fuenteId) ?? null) : null,
    jefe: row.jefe,
    reemplazo: row.reemplazo,
    nombreNuevo: row.nombreNuevo,
    salario: row.salario !== null ? Number(row.salario) : null,
    aprobacion: row.aprobacion,
    fechaAprobacion: row.fechaAprobacion,
    fechaRequerimiento: row.fechaRequerimiento,
    fase: row.fase,
    estado: row.estado,
    fechaContratacion: row.fechaContratacion,
    cedula: row.cedula,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapCatalogoItem(row: { id: string; clave: string; nombre: string; activo: boolean; orden: number }): CatalogoVacanteItem {
  return { id: row.id, clave: row.clave, nombre: row.nombre, activo: row.activo, orden: row.orden }
}

/** Traduce los campos `*Id` del input HTTP a las columnas FK de la tabla. */
function valoresInsert(input: NuevaVacanteInput) {
  return {
    cargo: input.cargo,
    posiciones: input.posiciones,
    areaId: input.areaId,
    modalidadId: input.modalidadId,
    dedicacionId: input.dedicacionId,
    escalafonId: input.escalafonId,
    motivoId: input.motivoId,
    fuenteId: input.fuenteId,
    jefe: input.jefe,
    reemplazo: input.reemplazo,
    nombreNuevo: input.nombreNuevo,
    salario: input.salario !== null ? String(input.salario) : null,
    aprobacion: input.aprobacion,
    fechaAprobacion: input.fechaAprobacion,
    fechaRequerimiento: input.fechaRequerimiento,
    fase: input.fase,
    estado: input.estado,
    fechaContratacion: input.fechaContratacion,
    cedula: input.cedula,
  }
}

function valoresUpdate(cambios: CambiosVacante): Record<string, unknown> {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (cambios.cargo !== undefined) set.cargo = cambios.cargo
  if (cambios.posiciones !== undefined) set.posiciones = cambios.posiciones
  if (cambios.areaId !== undefined) set.areaId = cambios.areaId
  if (cambios.modalidadId !== undefined) set.modalidadId = cambios.modalidadId
  if (cambios.dedicacionId !== undefined) set.dedicacionId = cambios.dedicacionId
  if (cambios.escalafonId !== undefined) set.escalafonId = cambios.escalafonId
  if (cambios.motivoId !== undefined) set.motivoId = cambios.motivoId
  if (cambios.fuenteId !== undefined) set.fuenteId = cambios.fuenteId
  if (cambios.jefe !== undefined) set.jefe = cambios.jefe
  if (cambios.reemplazo !== undefined) set.reemplazo = cambios.reemplazo
  if (cambios.nombreNuevo !== undefined) set.nombreNuevo = cambios.nombreNuevo
  if (cambios.salario !== undefined) set.salario = cambios.salario !== null ? String(cambios.salario) : null
  if (cambios.aprobacion !== undefined) set.aprobacion = cambios.aprobacion
  if (cambios.fechaAprobacion !== undefined) set.fechaAprobacion = cambios.fechaAprobacion
  if (cambios.fechaRequerimiento !== undefined) set.fechaRequerimiento = cambios.fechaRequerimiento
  if (cambios.fase !== undefined) set.fase = cambios.fase
  if (cambios.estado !== undefined) set.estado = cambios.estado
  if (cambios.fechaContratacion !== undefined) set.fechaContratacion = cambios.fechaContratacion
  if (cambios.cedula !== undefined) set.cedula = cambios.cedula
  return set
}

/** Nombre del área de contratación (catálogo `vacante_areas`) por su id. */
async function resolverAreaNombre(areaId: string, ex: Ejecutor): Promise<string | null> {
  const [row] = await ex
    .select({ nombre: vacanteAreas.nombre })
    .from(vacanteAreas)
    .where(eq(vacanteAreas.id, areaId))
    .limit(1)
  return row?.nombre ?? null
}

/**
 * Dispara el puente Vacante→Funcionario (ADR-0009) dentro de la transacción `ex`.
 * `evaluarFila` ya garantiza `areaId` en CONTRATADO y la FK 0021 garantiza el
 * nombre; el guardián es defensivo por si el puente se alcanza por otra vía.
 */
async function dispararPuenteContratacion(
  vacante: Vacante,
  areaId: string | null,
  autor: string,
  ex: Ejecutor,
): Promise<void> {
  const areaNombre = areaId ? await resolverAreaNombre(areaId, ex) : null
  if (!areaNombre) {
    throw new ErrorValidacion(
      "No se puede crear el empleado desde la vacante: falta un área válida.",
    )
  }
  await crearFuncionarioDesdeVacante(vacante, areaNombre, autor, ex)
}

export const vacanteRepository: VacanteRepo = {
  async listarVacantes(filtro: FiltroVacantes): Promise<ResultadoPaginado<Vacante>> {
    const pagina = filtro.pagina ?? 1
    const porPagina = filtro.porPagina ?? 10
    const offset = (pagina - 1) * porPagina

    const condiciones = []
    if (filtro.estado) condiciones.push(eq(vacantes.estado, filtro.estado))
    if (filtro.areaId) condiciones.push(eq(vacantes.areaId, filtro.areaId))
    if (filtro.q) {
      const like = `%${filtro.q}%`
      condiciones.push(or(ilike(vacantes.cargo, like), ilike(vacantes.requerimiento, like)))
    }
    const where = condiciones.length > 0 ? and(...condiciones) : undefined

    const [totalRow] = await db.select({ n: count() }).from(vacantes).where(where)
    const total = Number(totalRow?.n ?? 0)
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

    const rows = await db
      .select()
      .from(vacantes)
      .where(where)
      .orderBy(desc(vacantes.createdAt))
      .limit(porPagina)
      .offset(offset)

    const mapas = await cargarMapasCatalogo()
    return {
      items: rows.map((r) => mapVacante(r, mapas)),
      total,
      pagina,
      porPagina,
      totalPaginas,
    }
  },

  async obtenerVacante(id: string): Promise<Vacante | null> {
    const [row] = await db.select().from(vacantes).where(eq(vacantes.id, id)).limit(1)
    if (!row) return null
    const mapas = await cargarMapasCatalogo()
    return mapVacante(row, mapas)
  },

  async crearVacante(input: NuevaVacanteInput, autor: string): Promise<Vacante> {
    // Transacción: si la vacante nace CONTRATADA, la creación del funcionario
    // (puente ADR-0009) debe ser atómica con el INSERT de la vacante.
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(vacantes).values(valoresInsert(input)).returning()
      if (!row) throw new Error("crearVacante: la inserción no devolvió el registro.")
      const mapas = await cargarMapasCatalogo()
      const vacante = mapVacante(row, mapas)
      if (row.estado === "CONTRATADO") {
        await dispararPuenteContratacion(vacante, row.areaId, autor, tx)
      }
      return vacante
    })
  },

  async actualizarVacante(id: string, cambios: CambiosVacante, autor: string): Promise<Vacante> {
    // Transacción con lock pesimista: serializa dos PATCH concurrentes a la misma
    // vacante para que solo UNO observe la transición PENDIENTE→CONTRATADO y cree
    // el funcionario (idempotencia del puente ADR-0009).
    return db.transaction(async (tx) => {
      const [previo] = await tx
        .select({ estado: vacantes.estado })
        .from(vacantes)
        .where(eq(vacantes.id, id))
        .for("update")
        .limit(1)
      if (!previo) throw new ErrorNoEncontrado("La vacante no existe.")

      const [row] = await tx
        .update(vacantes)
        .set(valoresUpdate(cambios))
        .where(eq(vacantes.id, id))
        .returning()
      if (!row) throw new ErrorNoEncontrado("La vacante no existe.")

      const mapas = await cargarMapasCatalogo()
      const vacante = mapVacante(row, mapas)

      // Solo la PRIMERA transición a CONTRATADO dispara el puente.
      if (previo.estado !== "CONTRATADO" && row.estado === "CONTRATADO") {
        await dispararPuenteContratacion(vacante, row.areaId, autor, tx)
      }
      return vacante
    })
  },

  async listarParaDashboard(): Promise<Array<Vacante & { areaNombre: string | null }>> {
    const rows = await db
      .select({ vacante: vacantes, areaNombre: vacanteAreas.nombre })
      .from(vacantes)
      .leftJoin(vacanteAreas, eq(vacantes.areaId, vacanteAreas.id))

    const mapas = await cargarMapasCatalogo()
    return rows.map((r) => ({ ...mapVacante(r.vacante, mapas), areaNombre: r.areaNombre ?? null }))
  },

  async obtenerCatalogos(): Promise<CatalogosVacantes> {
    const [areas, modalidades, dedicaciones, escalafones, motivos, fuentes] = await Promise.all([
      db.select().from(vacanteAreas),
      db.select().from(vacanteModalidades),
      db.select().from(vacanteDedicaciones),
      db.select().from(vacanteEscalafones),
      db.select().from(vacanteMotivos),
      db.select().from(vacanteFuentes),
    ])
    return {
      areas: areas.map(mapCatalogoItem),
      modalidades: modalidades.map(mapCatalogoItem),
      dedicaciones: dedicaciones.map(mapCatalogoItem),
      escalafones: escalafones.map(mapCatalogoItem),
      motivos: motivos.map(mapCatalogoItem),
      fuentes: fuentes.map(mapCatalogoItem),
    }
  },

  async obtenerSugerencias(input: { areaId?: string; cargo?: string }): Promise<SugerenciasVacante> {
    const condiciones = []
    if (input.areaId) condiciones.push(eq(vacantes.areaId, input.areaId))
    if (input.cargo) condiciones.push(ilike(vacantes.cargo, input.cargo))
    if (condiciones.length === 0) return {}

    const [row] = await db
      .select()
      .from(vacantes)
      .where(and(...condiciones))
      .orderBy(desc(vacantes.createdAt))
      .limit(1)
    if (!row) return {}

    const mapas = await cargarMapasCatalogo()
    const sugerencias: SugerenciasVacante = {}
    if (row.jefe) sugerencias.jefe = row.jefe
    if (row.dedicacionId) {
      const clave = mapas.dedicacion.get(row.dedicacionId)
      if (clave) sugerencias.dedicacion = clave
    }
    if (row.modalidadId) {
      const clave = mapas.modalidad.get(row.modalidadId)
      if (clave) sugerencias.modalidad = clave
    }
    return sugerencias
  },
}
