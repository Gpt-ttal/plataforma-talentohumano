import type { Request, Response } from "express"
import { registrarAsistenciaSchema } from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/**
 * Controllers PÚBLICOS del registro de asistencia por QR.
 * No requieren autenticación; aplican rate-limit estricto en el router.
 */
export function registroPublicoController(casos: Casos) {
  return {
    /** Proyección pública del evento para la pantalla del formulario. */
    info: async (req: Request, res: Response) => {
      const token = String(req.params.token)
      const info = await casos.obtenerInfoPublica(token)
      if (!info) {
        res.status(404).json({ error: "Capacitación no encontrada." })
        return
      }
      res.json(info)
    },

    registrar: async (req: Request, res: Response) => {
      const token = String(req.params.token)
      const parsed = registrarAsistenciaSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))

      // usuarioId opcional: si el asistente está logueado, el frontend puede
      // pasar el JWT; el middleware lo pone en req.usuario si está presente.
      const usuarioId = req.usuario?.id

      const resultado = await casos.registrarAsistenciaPublica(token, parsed.data, usuarioId)
      res.status(resultado.registrada ? 201 : 200).json(resultado)
    },
  }
}
