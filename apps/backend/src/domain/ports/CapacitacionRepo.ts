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

export interface CapacitacionRepo {
  listarCapacitaciones(
    filtro: FiltroCapacitaciones,
  ): Promise<ResultadoPaginado<Capacitacion>>

  crearCapacitacion(
    input: Omit<Capacitacion, "id" | "token" | "estadoRegistro" | "createdAt" | "updatedAt">,
  ): Promise<Capacitacion>

  obtenerDetalle(id: string): Promise<CapacitacionDetalle | null>

  editarCapacitacion(
    id: string,
    input: Partial<
      Pick<Capacitacion, "titulo" | "descripcion" | "lugar" | "instructor" | "iniciaEn" | "terminaEn" | "horas">
    >,
  ): Promise<Capacitacion>

  cambiarEstadoRegistro(
    id: string,
    estado: "BORRADOR" | "ABIERTO" | "CERRADO",
  ): Promise<Capacitacion>

  /** Proyección pública para la pantalla del QR (sin auth requerida). */
  obtenerPorToken(token: string): Promise<CapacitacionPublica | null>

  /**
   * Registra la asistencia de un asistente (formulario público).
   * Idempotente: (capacitacion_id, documento) tiene UNIQUE → doble submit devuelve
   * `yaExistia=true` sin error ni duplicado.
   */
  registrarAsistencia(
    token: string,
    datos: RegistrarAsistenciaInput,
    usuarioId?: string,
  ): Promise<ResultadoRegistro>

  /** Lista completa de asistencias para el export CSV. */
  listarAsistencias(capacitacionId: string): Promise<Asistencia[]>
}
