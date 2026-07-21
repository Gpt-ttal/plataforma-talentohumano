import type { Empleado, Novedad } from "@pys/shared"
import type { funcionarios, novedades } from "../schema.js"

type FuncionarioRow = typeof funcionarios.$inferSelect
type NovedadRow = typeof novedades.$inferSelect

/**
 * Proyección MAESTRA de la fila de `funcionarios`: `Empleado`. A diferencia de
 * `Funcionario` (trámite), tolera `fechaRetiro === null` (empleado ACTIVO) y
 * expone los campos de núcleo. Compartida entre `empleadoRepo` (núcleo) y
 * `expedienteRepo` (la usa dentro de `obtenerExpediente`, que combina el
 * núcleo con los bloques satélite).
 */
export function mapEmpleado(r: FuncionarioRow): Empleado {
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

export function mapNovedad(r: NovedadRow): Novedad {
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
