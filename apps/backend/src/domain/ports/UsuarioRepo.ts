import type {
  EstadoUsuario,
  Pagina,
  ResultadoPaginado,
  RolUsuario,
  Usuario,
} from "@pys/shared"

/** Datos para crear un usuario (id = auth.users.id en Supabase). */
export interface CrearUsuarioArgs {
  id: string
  email: string
  nombre: string
  rol: RolUsuario
  areaId?: string | null
  estado: EstadoUsuario
}

/** Parche para actualizar un usuario (campos administrables por el superadmin). */
export type ActualizarUsuarioArgs = Partial<
  Pick<Usuario, "nombre" | "rol" | "areaId" | "estado">
>

export interface UsuarioRepo {
  obtenerUsuarioPorId(id: string): Promise<Usuario | null>
  obtenerUsuarioPorEmail(email: string): Promise<Usuario | null>
  crearUsuario(datos: CrearUsuarioArgs): Promise<Usuario>
  listarUsuarios(pagina?: Pagina): Promise<ResultadoPaginado<Usuario>>
  actualizarUsuario(id: string, parche: ActualizarUsuarioArgs): Promise<Usuario>
}
