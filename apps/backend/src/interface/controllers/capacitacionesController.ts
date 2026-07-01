import type { Request, Response } from "express"
import {
  crearCapacitacionSchema,
  editarCapacitacionSchema,
  filtroCapacitacionesSchema,
} from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/** Controllers autenticados del módulo de Capacitaciones. */
export function capacitacionesController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      const parsed = filtroCapacitacionesSchema.safeParse(req.query)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.listarCapacitaciones(req.usuario!, parsed.data))
    },

    crear: async (req: Request, res: Response) => {
      const parsed = crearCapacitacionSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.status(201).json(await casos.crearCapacitacion(req.usuario!, parsed.data))
    },

    detalle: async (req: Request, res: Response) => {
      res.json(await casos.obtenerDetalleCapacitacion(req.usuario!, String(req.params.id)))
    },

    editar: async (req: Request, res: Response) => {
      const parsed = editarCapacitacionSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.editarCapacitacion(req.usuario!, String(req.params.id), parsed.data))
    },

    abrir: async (req: Request, res: Response) => {
      res.json(await casos.abrirRegistro(req.usuario!, String(req.params.id)))
    },

    cerrar: async (req: Request, res: Response) => {
      res.json(await casos.cerrarRegistro(req.usuario!, String(req.params.id)))
    },

    exportarAsistencias: async (req: Request, res: Response) => {
      const csv = await casos.exportarAsistencias(req.usuario!, String(req.params.id))
      res.setHeader("Content-Type", "text/csv; charset=utf-8")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="asistencias-${req.params.id}.csv"`,
      )
      // BOM para que Excel reconozca UTF-8 (acentos del español).
      res.send("﻿" + csv)
    },
  }
}
