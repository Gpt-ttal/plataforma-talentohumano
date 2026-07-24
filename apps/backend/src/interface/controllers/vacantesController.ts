import type { Request, Response } from "express"
import { crearVacanteSchema, editarVacanteSchema, filtroVacantesSchema, sugerenciasVacanteSchema } from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/** Controllers autenticados del módulo de Vacantes. */
export function vacantesController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      const parsed = filtroVacantesSchema.safeParse(req.query)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.listarVacantes(req.usuario!, parsed.data))
    },

    crear: async (req: Request, res: Response) => {
      const parsed = crearVacanteSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.status(201).json(await casos.crearVacante(req.usuario!, parsed.data))
    },

    detalle: async (req: Request, res: Response) => {
      res.json(await casos.obtenerVacante(req.usuario!, String(req.params.id)))
    },

    editar: async (req: Request, res: Response) => {
      const parsed = editarVacanteSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.actualizarVacante(req.usuario!, String(req.params.id), parsed.data))
    },

    dashboard: async (req: Request, res: Response) => {
      res.json(await casos.obtenerDashboardVacantes(req.usuario!))
    },

    catalogos: async (req: Request, res: Response) => {
      res.json(await casos.obtenerCatalogosVacantes(req.usuario!))
    },

    sugerencias: async (req: Request, res: Response) => {
      const parsed = sugerenciasVacanteSchema.safeParse(req.query)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.obtenerSugerenciasVacante(req.usuario!, parsed.data))
    },
  }
}
