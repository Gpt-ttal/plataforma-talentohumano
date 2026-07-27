import type { EstadoUsuario, Preaprobacion, RolUsuario } from "@pys/shared"

/** Datos para crear una entrada de la allowlist (email ya normalizado). */
export interface CrearPreaprobacionArgs {
  email: string
  rol: RolUsuario
  areaId: string | null
  estado: EstadoUsuario
  invitadoPor: string | null
}

/**
 * Resultado de consultar la allowlist. Distingue explícitamente "la tabla aún no
 * existe" (migración 0022 sin aplicar → el gate no está activo, se preserva el
 * autoregistro histórico) de "la tabla existe pero no hay pre-aprobación para ese
 * correo" (gate activo → rechazo). Patrón de la 0019: el código se mergea antes de
 * aplicar la migración sin romper los logins.
 */
export type ConsultaPreaprobacion =
  | { tabla: "ausente" }
  | { tabla: "presente"; preaprobacion: Preaprobacion | null }

export interface PreaprobacionRepo {
  /** Consulta la allowlist por correo, señalando si la tabla existe todavía. */
  buscarPorEmail(email: string): Promise<ConsultaPreaprobacion>
  listar(): Promise<Preaprobacion[]>
  crear(datos: CrearPreaprobacionArgs): Promise<Preaprobacion>
  eliminar(email: string): Promise<void>
}
