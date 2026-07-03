import type { Request, Response } from "express"
import {
  crearEmpleadoSchema,
  crearExperienciaSchema,
  crearFamiliarSchema,
  crearFormacionSchema,
  crearUrlSubidaFotoSchema,
  editarContractualSchema,
  editarEmpleadoSchema,
  filtroEmpleadosSchema,
  finalizarContratoSchema,
  guardarFotoSchema,
  guardarPersonalesSchema,
  guardarSalarialSchema,
  registrarNovedadSchema,
} from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/**
 * Controllers del maestro de empleados (Administración de Personal). Todas las
 * rutas exigen SUPERADMIN/TALENTO_HUMANO (reaplicado en los casos de uso).
 */
export function personalController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      const parsed = filtroEmpleadosSchema.safeParse(req.query)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.listarEmpleados(req.usuario!, parsed.data))
    },

    crear: async (req: Request, res: Response) => {
      const parsed = crearEmpleadoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.status(201).json(await casos.crearEmpleado(req.usuario!, parsed.data))
    },

    detalle: async (req: Request, res: Response) => {
      res.json(await casos.obtenerEmpleado(req.usuario!, String(req.params.id)))
    },

    expediente: async (req: Request, res: Response) => {
      res.json(await casos.obtenerExpedientePersonal(req.usuario!, String(req.params.id)))
    },

    editar: async (req: Request, res: Response) => {
      const parsed = editarEmpleadoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.editarEmpleado(req.usuario!, String(req.params.id), parsed.data))
    },

    finalizarContrato: async (req: Request, res: Response) => {
      const parsed = finalizarContratoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(
        await casos.finalizarContrato(req.usuario!, String(req.params.id), parsed.data.fechaRetiro),
      )
    },

    registrarNovedad: async (req: Request, res: Response) => {
      const parsed = registrarNovedadSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.registrarNovedad(req.usuario!, String(req.params.id), parsed.data))
    },

    // ── Hoja de vida 360°: captura por bloque satélite ─────────────────────

    guardarPersonales: async (req: Request, res: Response) => {
      const parsed = guardarPersonalesSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.guardarPersonales(req.usuario!, String(req.params.id), parsed.data))
    },

    crearFamiliar: async (req: Request, res: Response) => {
      const parsed = crearFamiliarSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.status(201).json(await casos.crearFamiliar(req.usuario!, String(req.params.id), parsed.data))
    },

    eliminarFamiliar: async (req: Request, res: Response) => {
      await casos.eliminarFamiliar(req.usuario!, String(req.params.id), String(req.params.familiarId))
      res.status(204).send()
    },

    crearFormacion: async (req: Request, res: Response) => {
      const parsed = crearFormacionSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.status(201).json(await casos.crearFormacion(req.usuario!, String(req.params.id), parsed.data))
    },

    eliminarFormacion: async (req: Request, res: Response) => {
      await casos.eliminarFormacion(req.usuario!, String(req.params.id), String(req.params.formacionId))
      res.status(204).send()
    },

    crearExperiencia: async (req: Request, res: Response) => {
      const parsed = crearExperienciaSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.status(201).json(await casos.crearExperiencia(req.usuario!, String(req.params.id), parsed.data))
    },

    eliminarExperiencia: async (req: Request, res: Response) => {
      await casos.eliminarExperiencia(
        req.usuario!,
        String(req.params.id),
        String(req.params.experienciaId),
      )
      res.status(204).send()
    },

    guardarSalarial: async (req: Request, res: Response) => {
      const parsed = guardarSalarialSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.guardarSalarial(req.usuario!, String(req.params.id), parsed.data))
    },

    editarContractual: async (req: Request, res: Response) => {
      const parsed = editarContractualSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.editarContractual(req.usuario!, String(req.params.id), parsed.data))
    },

    crearUrlSubidaFoto: async (req: Request, res: Response) => {
      const parsed = crearUrlSubidaFotoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(
        await casos.crearUrlSubidaFoto(req.usuario!, String(req.params.id), parsed.data.extension),
      )
    },

    guardarFoto: async (req: Request, res: Response) => {
      const parsed = guardarFotoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.guardarFoto(req.usuario!, String(req.params.id), parsed.data.fotoPath))
    },

    obtenerUrlFoto: async (req: Request, res: Response) => {
      res.json(await casos.obtenerUrlFoto(req.usuario!, String(req.params.id)))
    },
  }
}
