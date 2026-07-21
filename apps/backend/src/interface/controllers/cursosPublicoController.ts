import type { Request, Response } from "express"
import { ingresarCursoSchema, marcarLeccionCompletadaSchema } from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/** Controllers PÚBLICOS del flujo "tomar el curso por cédula". Sin autenticación. */
export function cursosPublicoController(casos: Casos) {
  return {
    info: async (req: Request, res: Response) => {
      const token = String(req.params.token)
      const info = await casos.obtenerCursoPublico(token)
      if (!info) {
        res.status(404).json({ error: "Curso no encontrado." })
        return
      }
      res.json(info)
    },

    ingresar: async (req: Request, res: Response) => {
      const token = String(req.params.token)
      const parsed = ingresarCursoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      // "Ingresar" es get-or-create idempotente: siempre 200, sin distinción con 201.
      res.status(200).json(await casos.ingresarCurso(token, parsed.data))
    },

    completar: async (req: Request, res: Response) => {
      const token = String(req.params.token)
      const leccionId = String(req.params.leccionId)
      const parsed = marcarLeccionCompletadaSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(
        await casos.marcarLeccionCompletadaCurso(token, parsed.data.documento, leccionId),
      )
    },
  }
}
