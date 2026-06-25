import { asc, eq, sql } from "drizzle-orm"
import type { Usuario } from "@pys/shared"
import { normalizarEmail, normalizarPagina } from "@pys/shared"
import type {
  ActualizarUsuarioArgs,
  CrearUsuarioArgs,
  UsuarioRepo,
} from "../../domain/ports/UsuarioRepo.js"
import type { Pagina, ResultadoPaginado } from "@pys/shared"
import { db } from "./client.js"
import { usuarios } from "./schema.js"

type UsuarioRow = typeof usuarios.$inferSelect

function mapUsuario(r: UsuarioRow): Usuario {
  return {
    id: r.id,
    email: r.email,
    nombre: r.nombre,
    rol: r.rol,
    areaId: r.areaId ?? null,
    estado: r.estado,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export const usuarioRepository: UsuarioRepo = {
  async obtenerUsuarioPorId(id: string): Promise<Usuario | null> {
    const rows = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .limit(1)
    return rows[0] ? mapUsuario(rows[0]) : null
  },

  async obtenerUsuarioPorEmail(email: string): Promise<Usuario | null> {
    const normalizado = normalizarEmail(email)
    const rows = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, normalizado))
      .limit(1)
    return rows[0] ? mapUsuario(rows[0]) : null
  },

  async crearUsuario(datos: CrearUsuarioArgs): Promise<Usuario> {
    const rows = await db
      .insert(usuarios)
      .values({
        id: datos.id,
        email: normalizarEmail(datos.email),
        nombre: datos.nombre,
        rol: datos.rol,
        areaId: datos.areaId ?? null,
        estado: datos.estado,
      })
      .returning()
    const row = rows[0]
    if (!row) throw new Error("crearUsuario: no se obtuvo la fila insertada")
    return mapUsuario(row)
  },

  async listarUsuarios(
    pagina?: Pagina,
  ): Promise<ResultadoPaginado<Usuario>> {
    const { pagina: p, porPagina } = normalizarPagina(pagina)
    const desde = (p - 1) * porPagina

    // PENDIENTE primero (requiere acción del superadmin), luego por nombre.
    const rows = await db
      .select()
      .from(usuarios)
      .orderBy(asc(usuarios.estado), asc(usuarios.nombre))
      .limit(porPagina)
      .offset(desde)

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usuarios)
    const total = countResult[0]?.count ?? 0

    const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
    return {
      items: rows.map(mapUsuario),
      total,
      pagina: p,
      porPagina,
      totalPaginas,
    }
  },

  async actualizarUsuario(
    id: string,
    parche: ActualizarUsuarioArgs,
  ): Promise<Usuario> {
    const update: Partial<UsuarioRow> & { updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (parche.nombre !== undefined) update.nombre = parche.nombre
    if (parche.rol !== undefined) update.rol = parche.rol
    if (parche.areaId !== undefined) update.areaId = parche.areaId
    if (parche.estado !== undefined) update.estado = parche.estado

    const rows = await db
      .update(usuarios)
      .set(update)
      .where(eq(usuarios.id, id))
      .returning()
    const row = rows[0]
    if (!row) throw new Error(`actualizarUsuario: usuario ${id} no encontrado`)
    return mapUsuario(row)
  },
}
