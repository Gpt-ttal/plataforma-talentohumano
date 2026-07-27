import { eq } from "drizzle-orm"
import type { CeldaPermiso, NivelPermiso, RolUsuario } from "@pys/shared"
import type {
  ConsultaMatriz,
  PermisoRepo,
} from "../../domain/ports/PermisoRepo.js"
import { db } from "./client.js"
import { permisosRolModulo } from "./schema.js"

type Row = typeof permisosRolModulo.$inferSelect

function mapCelda(r: Row): CeldaPermiso {
  return { rol: r.rol, moduloId: r.moduloId, nivel: r.nivel as NivelPermiso }
}

/**
 * ¿El error es "la relación/tipo no existe" (Postgres 42P01/undefined_table o
 * 42704/undefined_object)? Recorre la cadena de causas (Drizzle envuelve el error
 * del driver `pg`). Habilita el fallback merge-safe: sin tabla `permisos_rol_modulo`
 * (0023 sin aplicar) la matriz se resuelve desde la semilla de MODULOS.
 */
function esEsquemaAusente(error: unknown): boolean {
  let e: unknown = error
  for (let i = 0; i < 5 && e; i++) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code?: unknown }).code
      if (code === "42P01" || code === "42704") return true
    }
    e = (e as { cause?: unknown })?.cause
  }
  return false
}

export const permisoRepository: PermisoRepo = {
  async listarMatriz(): Promise<ConsultaMatriz> {
    try {
      const rows = await db.select().from(permisosRolModulo)
      return { tabla: "presente", celdas: rows.map(mapCelda) }
    } catch (e) {
      if (esEsquemaAusente(e)) return { tabla: "ausente" }
      throw e
    }
  },

  async reemplazarPermisosRol(
    rol: RolUsuario,
    celdas: CeldaPermiso[],
    actorId: string,
  ): Promise<void> {
    // Reemplazo autoritativo: borra TODAS las celdas del rol y reinserta las
    // recibidas, atómicamente. Así las celdas omitidas vuelven al default (NINGUNO
    // por fallback del loader) en vez de conservar su valor previo — la semántica
    // que documenta el puerto ("la fila queda autoritativa").
    await db.transaction(async (tx) => {
      await tx.delete(permisosRolModulo).where(eq(permisosRolModulo.rol, rol))
      if (celdas.length === 0) return
      await tx.insert(permisosRolModulo).values(
        celdas.map((celda) => ({
          rol,
          moduloId: celda.moduloId,
          nivel: celda.nivel,
          actualizadoPor: actorId,
          updatedAt: new Date(),
        })),
      )
    })
  },
}
