import type { Request, Response } from "express"
import {
  cambiarEstadoAreaSchema,
  filtroFuncionariosSchema,
  filtroMatrizSchema,
  filtroMiAreaSchema,
} from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

/** Convierte un fallo de Zod en un mensaje 400 legible. */
function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/**
 * Controllers de funcionarios y lecturas de supervisión. Cada handler valida la
 * entrada con el schema Zod de `@pys/shared` (→ 400), delega en el caso de uso
 * con `req.usuario` (la autorización vive ahí) y responde JSON.
 */
export function funcionariosController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      const parsed = filtroFuncionariosSchema.safeParse(req.query)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.listarFuncionarios(req.usuario!, parsed.data))
    },

    matriz: async (req: Request, res: Response) => {
      const parsed = filtroMatrizSchema.safeParse(req.query)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.obtenerMatriz(req.usuario!, parsed.data))
    },

    detalle: async (req: Request, res: Response) => {
      res.json(await casos.obtenerDetalle(req.usuario!, String(req.params.id)))
    },

    cambiarEstado: async (req: Request, res: Response) => {
      const parsed = cambiarEstadoAreaSchema.safeParse({
        ...req.body,
        funcionarioId: req.params.id,
        areaId: req.params.areaId,
      })
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.cambiarEstadoArea(req.usuario!, parsed.data))
    },

    generarLiquidacion: async (req: Request, res: Response) => {
      res.json(await casos.generarLiquidacion(req.usuario!, String(req.params.id)))
    },

    registrarLiquidacion: async (req: Request, res: Response) => {
      res.json(await casos.registrarLiquidacion(req.usuario!, String(req.params.id)))
    },

    miArea: async (req: Request, res: Response) => {
      const parsed = filtroMiAreaSchema.safeParse(req.query)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      const { areaId, ...filtro } = parsed.data
      res.json(await casos.listarGestionArea(req.usuario!, areaId, filtro))
    },

    metricas: async (req: Request, res: Response) => {
      res.json(await casos.obtenerMetricas(req.usuario!))
    },
  }
}
