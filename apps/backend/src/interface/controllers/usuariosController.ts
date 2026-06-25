import type { Request, Response } from "express"
import {
  asignarRolSchema,
  cambiarEstadoUsuarioSchema,
  normalizarPagina,
} from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

function numQuery(v: unknown): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Controllers de administración de usuarios. Todas las rutas que los montan
 * exigen `requireRol("SUPERADMIN")`; los casos de uso reaplican la guarda.
 */
export function usuariosController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      const pagina = normalizarPagina({
        pagina: numQuery(req.query.pagina),
        porPagina: numQuery(req.query.porPagina),
      })
      res.json(await casos.listarUsuarios(req.usuario!, pagina))
    },

    asignarRol: async (req: Request, res: Response) => {
      const parsed = asignarRolSchema.safeParse({
        ...req.body,
        usuarioId: req.params.id,
      })
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.asignarRol(req.usuario!, parsed.data))
    },

    cambiarEstado: async (req: Request, res: Response) => {
      const parsed = cambiarEstadoUsuarioSchema.safeParse({
        ...req.body,
        usuarioId: req.params.id,
      })
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.cambiarEstadoUsuario(req.usuario!, parsed.data))
    },
  }
}
