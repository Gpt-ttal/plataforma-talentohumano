import type { Request, Response } from "express"
import {
  cambiarActivaAreaSchema,
  crearAreaSchema,
  moverAreaSchema,
  renombrarAreaSchema,
} from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/**
 * Controllers del catálogo de áreas. La lectura admite cualquier usuario activo
 * (`?incluirInactivas=1` lo reserva el caso de uso a SUPERADMIN); las mutaciones
 * las montan rutas con `requireRol("SUPERADMIN")` y los casos de uso reaplican
 * la guarda.
 */
export function areasController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      const incluirInactivas = req.query.incluirInactivas === "1"
      res.json(await casos.listarAreas(req.usuario!, { incluirInactivas }))
    },

    crear: async (req: Request, res: Response) => {
      const parsed = crearAreaSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.crearArea(req.usuario!, parsed.data))
    },

    renombrar: async (req: Request, res: Response) => {
      const parsed = renombrarAreaSchema.safeParse({ ...req.body, areaId: req.params.id })
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.renombrarArea(req.usuario!, parsed.data))
    },

    mover: async (req: Request, res: Response) => {
      const parsed = moverAreaSchema.safeParse({ ...req.body, areaId: req.params.id })
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.moverArea(req.usuario!, parsed.data))
    },

    cambiarActiva: async (req: Request, res: Response) => {
      const parsed = cambiarActivaAreaSchema.safeParse({ ...req.body, areaId: req.params.id })
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.cambiarActivaArea(req.usuario!, parsed.data))
    },
  }
}
