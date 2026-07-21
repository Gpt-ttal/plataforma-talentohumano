import type { Request, Response } from "express"
import { confirmarImportacionParcialSchema } from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

/** Convierte un fallo de Zod en un mensaje 400 legible. */
function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/**
 * Controllers de la importación masiva de desvinculaciones. `importar` recibe
 * el archivo ya en memoria vía `req.file` (multer); `confirmar` valida el
 * body con Zod antes de delegar en el caso de uso.
 */
export function desvinculacionesController(casos: Casos) {
  return {
    importar: async (req: Request, res: Response) => {
      if (!req.file) throw new ErrorValidacion("Debes adjuntar un archivo.")
      res.json(
        await casos.previsualizarImportacionDesvinculaciones(req.usuario!, {
          nombreArchivo: req.file.originalname,
          buffer: req.file.buffer,
        }),
      )
    },

    confirmar: async (req: Request, res: Response) => {
      const parsed = confirmarImportacionParcialSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(
        await casos.confirmarImportacionParcial(
          req.usuario!,
          String(req.params.id),
          parsed.data.filaIds,
        ),
      )
    },
  }
}
