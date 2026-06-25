import type { Request, Response } from "express"
import { parseFiltroArchivo } from "@pys/shared"
import type { Casos } from "../container.js"

/** Lee el filtro del Archivo desde el query-string (todo opcional). */
function filtroDeQuery(req: Request) {
  return parseFiltroArchivo({
    q: req.query.q as string | undefined,
    retiroDesde: req.query.retiroDesde as string | undefined,
    retiroHasta: req.query.retiroHasta as string | undefined,
    pagina: req.query.pagina as string | undefined,
  })
}

/**
 * Controllers del Archivo institucional. La autorización (SA + TH) vive en el
 * caso de uso y en la guarda de ruta; aquí solo se traduce HTTP ↔ caso de uso.
 */
export function archivoController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      res.json(await casos.listarArchivo(req.usuario!, filtroDeQuery(req)))
    },

    expediente: async (req: Request, res: Response) => {
      res.json(await casos.obtenerExpediente(req.usuario!, String(req.params.id)))
    },

    exportar: async (req: Request, res: Response) => {
      const csv = await casos.exportarArchivo(req.usuario!, filtroDeQuery(req))
      res.setHeader("Content-Type", "text/csv; charset=utf-8")
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="archivo-paz-y-salvo.csv"',
      )
      // BOM para que Excel reconozca UTF-8 (acentos del español).
      res.send("﻿" + csv)
    },
  }
}
