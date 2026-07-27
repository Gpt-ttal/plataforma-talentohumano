import { asc, eq } from "drizzle-orm"
import type { Preaprobacion } from "@pys/shared"
import { normalizarEmail } from "@pys/shared"
import type {
  ConsultaPreaprobacion,
  CrearPreaprobacionArgs,
  PreaprobacionRepo,
} from "../../domain/ports/PreaprobacionRepo.js"
import { db } from "./client.js"
import { usuariosPreaprobados } from "./schema.js"

type Row = typeof usuariosPreaprobados.$inferSelect

function mapPreaprobacion(r: Row): Preaprobacion {
  return {
    email: r.email,
    rol: r.rol,
    areaId: r.areaId ?? null,
    estado: r.estado,
    invitadoPor: r.invitadoPor ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

/**
 * ¿El error es "la relación no existe" (Postgres 42P01)? Recorre la cadena de causas
 * porque Drizzle envuelve el error del driver `pg`. Se usa para el fallback merge-
 * safe: si la tabla `usuarios_preaprobados` aún no existe (0022 sin aplicar), la
 * consulta devuelve `{ tabla: "ausente" }` en vez de propagar el error.
 */
function esTablaAusente(error: unknown): boolean {
  let e: unknown = error
  for (let i = 0; i < 5 && e; i++) {
    if (typeof e === "object" && e !== null && "code" in e) {
      if ((e as { code?: unknown }).code === "42P01") return true
    }
    e = (e as { cause?: unknown })?.cause
  }
  return false
}

export const preaprobacionRepository: PreaprobacionRepo = {
  async buscarPorEmail(email: string): Promise<ConsultaPreaprobacion> {
    const normalizado = normalizarEmail(email)
    try {
      const rows = await db
        .select()
        .from(usuariosPreaprobados)
        .where(eq(usuariosPreaprobados.email, normalizado))
        .limit(1)
      return {
        tabla: "presente",
        preaprobacion: rows[0] ? mapPreaprobacion(rows[0]) : null,
      }
    } catch (e) {
      if (esTablaAusente(e)) return { tabla: "ausente" }
      throw e
    }
  },

  async listar(): Promise<Preaprobacion[]> {
    const rows = await db
      .select()
      .from(usuariosPreaprobados)
      .orderBy(asc(usuariosPreaprobados.createdAt))
    return rows.map(mapPreaprobacion)
  },

  async crear(datos: CrearPreaprobacionArgs): Promise<Preaprobacion> {
    const rows = await db
      .insert(usuariosPreaprobados)
      .values({
        email: normalizarEmail(datos.email),
        rol: datos.rol,
        areaId: datos.areaId,
        estado: datos.estado,
        invitadoPor: datos.invitadoPor,
      })
      .onConflictDoUpdate({
        target: usuariosPreaprobados.email,
        set: { rol: datos.rol, areaId: datos.areaId, estado: datos.estado },
      })
      .returning()
    const row = rows[0]
    if (!row) throw new Error("crearPreaprobado: no se obtuvo la fila insertada")
    return mapPreaprobacion(row)
  },

  async eliminar(email: string): Promise<void> {
    await db
      .delete(usuariosPreaprobados)
      .where(eq(usuariosPreaprobados.email, normalizarEmail(email)))
  },
}
