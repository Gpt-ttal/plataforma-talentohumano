import { and, eq, inArray } from "drizzle-orm"
import type {
  ErrorParseoFila,
  FilaCruda,
  LoteImportacionRepo,
} from "../../domain/ports/LoteImportacionRepo.js"
import type {
  FilaLote,
  FilaLoteEstado,
  LoteEstado,
  LotePrevisualizacion,
  ResultadoConfirmacionLote,
} from "@pys/shared"
import { db } from "./client.js"
import { filasLote, funcionarios, lotesImportacion } from "./schema.js"
import { iniciarTramiteDesvinculacion } from "./iniciarTramiteDesvinculacion.js"
import { registrarEvento } from "./eventoAuditoriaRepository.js"
import { ErrorNoEncontrado } from "../../application/errors.js"

type LoteRow = typeof lotesImportacion.$inferSelect
type FilaRow = typeof filasLote.$inferSelect

function mapFila(r: FilaRow): FilaLote {
  return {
    id: r.id,
    numeroFila: r.numeroFila,
    documento: r.documento,
    nombreCompleto: r.nombreCompleto,
    fechaRetiro: r.fechaRetiro,
    cargo: r.cargo,
    estado: r.estado,
    mensajeError: r.mensajeError,
    funcionarioId: r.funcionarioId,
  }
}

function mapLote(
  l: LoteRow,
  filas: FilaRow[],
  erroresParseo: ErrorParseoFila[] = [],
): LotePrevisualizacion {
  return {
    id: l.id,
    nombreArchivo: l.nombreArchivo,
    estado: l.estado,
    totalFilas: l.totalFilas,
    filasConfirmadas: l.filasConfirmadas,
    creadoPor: l.creadoPor,
    createdAt: l.createdAt.toISOString(),
    filas: filas.map(mapFila),
    erroresParseo,
  }
}

export const loteImportacionRepository: LoteImportacionRepo = {
  async crearLoteConFilas(
    nombreArchivo: string,
    filasCrudas: FilaCruda[],
    erroresParseo: ErrorParseoFila[],
    creadoPor: string,
  ): Promise<LotePrevisualizacion> {
    return db.transaction(async (tx) => {
      const [lote] = await tx
        .insert(lotesImportacion)
        .values({
          nombreArchivo,
          estado: "PREVISUALIZADO",
          totalFilas: filasCrudas.length,
          creadoPor,
        })
        .returning()
      if (!lote) throw new Error("No se pudo crear el lote de importación.")

      // Documentos con más de una fila en el propio archivo → DUPLICADA.
      const contadorPorDocumento = new Map<string, number>()
      for (const f of filasCrudas) {
        contadorPorDocumento.set(
          f.documento,
          (contadorPorDocumento.get(f.documento) ?? 0) + 1,
        )
      }

      // Empleados existentes por documento (candidatos a "VALIDA" si están ACTIVO).
      const documentos = filasCrudas.map((f) => f.documento)
      const empleados = documentos.length
        ? await tx
            .select({
              id: funcionarios.id,
              documento: funcionarios.documento,
              fechaRetiro: funcionarios.fechaRetiro,
            })
            .from(funcionarios)
            .where(inArray(funcionarios.documento, documentos))
        : []
      const empleadoPorDocumento = new Map(empleados.map((e) => [e.documento, e]))

      const filasAInsertar = filasCrudas.map((f) => {
        let estado: FilaLoteEstado
        let mensajeError: string | null = null
        if ((contadorPorDocumento.get(f.documento) ?? 0) > 1) {
          estado = "DUPLICADA"
          mensajeError = "Documento repetido en el archivo."
        } else {
          const empleado = empleadoPorDocumento.get(f.documento)
          if (!empleado) {
            estado = "CON_ERROR"
            mensajeError = "No existe un empleado activo con ese documento."
          } else if (empleado.fechaRetiro !== null) {
            estado = "CON_ERROR"
            mensajeError = "El empleado ya tiene un trámite en curso."
          } else {
            estado = "VALIDA"
          }
        }
        return {
          loteId: lote.id,
          numeroFila: f.numeroFila,
          documento: f.documento,
          nombreCompleto: f.nombreCompleto,
          fechaRetiro: f.fechaRetiro,
          cargo: f.cargo,
          estado,
          mensajeError,
        }
      })

      const filasInsertadas = filasAInsertar.length
        ? await tx.insert(filasLote).values(filasAInsertar).returning()
        : []

      return mapLote(lote, filasInsertadas, erroresParseo)
    })
  },

  async obtenerLote(id: string): Promise<LotePrevisualizacion | null> {
    const [lote] = await db
      .select()
      .from(lotesImportacion)
      .where(eq(lotesImportacion.id, id))
      .limit(1)
    if (!lote) return null
    const filas = await db.select().from(filasLote).where(eq(filasLote.loteId, id))
    return mapLote(lote, filas)
  },

  async confirmarParcial(
    loteId: string,
    filaIds: string[],
    autor: string,
  ): Promise<ResultadoConfirmacionLote> {
    return db.transaction(async (tx) => {
      // Lock pesimista sobre el lote: serializa dos confirmaciones concurrentes
      // del MISMO lote (mismo patrón que `cambiarEstadoArea`).
      const [lote] = await tx
        .select()
        .from(lotesImportacion)
        .where(eq(lotesImportacion.id, loteId))
        .for("update")
      if (!lote) throw new ErrorNoEncontrado("Lote no encontrado.")

      const filasSeleccionadas = await tx
        .select()
        .from(filasLote)
        .where(and(eq(filasLote.loteId, loteId), inArray(filasLote.id, filaIds)))

      const fallidas: { filaId: string; motivo: string }[] = []
      let confirmadasEnEstaLlamada = 0

      for (const fila of filasSeleccionadas) {
        if (fila.estado !== "VALIDA") {
          fallidas.push({
            filaId: fila.id,
            motivo: `La fila no está en estado VALIDA (está ${fila.estado}).`,
          })
          continue
        }

        const [empleado] = await tx
          .select({ id: funcionarios.id })
          .from(funcionarios)
          .where(eq(funcionarios.documento, fila.documento))
          .limit(1)

        if (!empleado) {
          const motivo = "El empleado ya no existe."
          fallidas.push({ filaId: fila.id, motivo })
          await tx
            .update(filasLote)
            .set({ estado: "DESCARTADA", mensajeError: motivo })
            .where(eq(filasLote.id, fila.id))
          continue
        }

        try {
          // Reusa el mismo puente que "Finalizar contrato" individual: fija
          // fechaRetiro, backfill de aprobaciones, auditoría y recompute.
          await iniciarTramiteDesvinculacion(
            { id: empleado.id, fechaRetiro: fila.fechaRetiro, autor },
            tx,
          )
          await tx
            .update(filasLote)
            .set({ estado: "CONFIRMADA", funcionarioId: empleado.id, mensajeError: null })
            .where(eq(filasLote.id, fila.id))
          confirmadasEnEstaLlamada++
        } catch (e) {
          // Error de guarda (p. ej. TOCTOU: ya tenía trámite) — no aborta el
          // resto del lote, esta fila queda descartada con el motivo.
          const motivo = e instanceof Error ? e.message : "Error al confirmar la fila."
          fallidas.push({ filaId: fila.id, motivo })
          await tx
            .update(filasLote)
            .set({ estado: "DESCARTADA", mensajeError: motivo })
            .where(eq(filasLote.id, fila.id))
        }
      }

      const filasFinal = await tx
        .select()
        .from(filasLote)
        .where(eq(filasLote.loteId, loteId))
      const filasConfirmadasTotal = filasFinal.filter((f) => f.estado === "CONFIRMADA").length
      const quedanValidas = filasFinal.some((f) => f.estado === "VALIDA")
      const nuevoEstadoLote: LoteEstado =
        filasConfirmadasTotal > 0
          ? quedanValidas
            ? "CONFIRMADO_PARCIAL"
            : "CONFIRMADO_TOTAL"
          : lote.estado

      const [loteFinal] = await tx
        .update(lotesImportacion)
        .set({
          estado: nuevoEstadoLote,
          filasConfirmadas: filasConfirmadasTotal,
          updatedAt: new Date(),
        })
        .where(eq(lotesImportacion.id, loteId))
        .returning()

      await registrarEvento(
        {
          entidadTipo: "lote_importacion",
          entidadId: loteId,
          accion: "CONFIRMAR_IMPORTACION_PARCIAL",
          actorNombre: autor?.trim() || "Talento Humano",
          estadoNuevo: { confirmadas: confirmadasEnEstaLlamada, fallidas: fallidas.length },
        },
        tx,
      )

      return {
        lote: mapLote(loteFinal!, filasFinal),
        confirmadas: confirmadasEnEstaLlamada,
        fallidas,
      }
    })
  },
}
