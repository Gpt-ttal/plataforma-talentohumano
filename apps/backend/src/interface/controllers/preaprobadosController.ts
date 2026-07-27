import type { Request, Response } from "express"
import { crearPreaprobadoSchema, eliminarPreaprobadoSchema } from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: {
  issues: { path: (string | number)[]; message: string }[]
}): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/**
 * Controllers de la allowlist de acceso (pre-aprobación por correo). Todas las rutas
 * que los montan exigen `requireRol("SUPERADMIN")`; los casos de uso reaplican la
 * verja con `exigirRol`.
 */
export function preaprobadosController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      res.json(await casos.listarPreaprobados(req.usuario!))
    },

    crear: async (req: Request, res: Response) => {
      const parsed = crearPreaprobadoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.status(201).json(await casos.crearPreaprobado(req.usuario!, parsed.data))
    },

    eliminar: async (req: Request, res: Response) => {
      const parsed = eliminarPreaprobadoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      await casos.eliminarPreaprobado(req.usuario!, parsed.data)
      res.status(204).end()
    },
  }
}
