import type { Request, Response } from "express"
import {
  crearCapacitacionPlaneadaSchema,
  editarCapacitacionPlaneadaSchema,
  filtroCapacitacionesPlaneadasSchema,
} from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/** Controllers autenticados del Planificador. */
export function planificadorController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      const parsed = filtroCapacitacionesPlaneadasSchema.safeParse(req.query)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.listarCapacitacionesPlaneadas(req.usuario!, parsed.data))
    },

    crear: async (req: Request, res: Response) => {
      const parsed = crearCapacitacionPlaneadaSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.status(201).json(await casos.crearCapacitacionPlaneada(req.usuario!, parsed.data))
    },

    editar: async (req: Request, res: Response) => {
      const parsed = editarCapacitacionPlaneadaSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(
        await casos.editarCapacitacionPlaneada(req.usuario!, String(req.params.id), parsed.data),
      )
    },

    eliminar: async (req: Request, res: Response) => {
      await casos.eliminarCapacitacionPlaneada(req.usuario!, String(req.params.id))
      res.status(204).send()
    },
  }
}
