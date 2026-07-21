import type { Request, Response } from "express"
import {
  crearCursoModuloSchema,
  crearCursoSchema,
  crearLeccionSchema,
  editarCursoModuloSchema,
  editarCursoSchema,
  editarLeccionSchema,
  filtroCursosSchema,
  moverCursoModuloSchema,
  moverLeccionSchema,
} from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

/** Controllers autenticados de la gestión de Cursos (el flujo público es Fase 3). */
export function cursosController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      const parsed = filtroCursosSchema.safeParse(req.query)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.listarCursos(req.usuario!, parsed.data))
    },

    crear: async (req: Request, res: Response) => {
      const parsed = crearCursoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.status(201).json(await casos.crearCurso(req.usuario!, parsed.data))
    },

    detalle: async (req: Request, res: Response) => {
      res.json(await casos.obtenerDetalleCurso(req.usuario!, String(req.params.id)))
    },

    editar: async (req: Request, res: Response) => {
      const parsed = editarCursoSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(await casos.editarCurso(req.usuario!, String(req.params.id), parsed.data))
    },

    abrir: async (req: Request, res: Response) => {
      res.json(await casos.abrirRegistroCurso(req.usuario!, String(req.params.id)))
    },

    cerrar: async (req: Request, res: Response) => {
      res.json(await casos.cerrarRegistroCurso(req.usuario!, String(req.params.id)))
    },

    inscritos: async (req: Request, res: Response) => {
      res.json(await casos.listarInscritosCurso(req.usuario!, String(req.params.id)))
    },

    crearModulo: async (req: Request, res: Response) => {
      const parsed = crearCursoModuloSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res
        .status(201)
        .json(
          await casos.crearModuloCurso(req.usuario!, String(req.params.id), parsed.data.titulo),
        )
    },

    editarModulo: async (req: Request, res: Response) => {
      const parsed = editarCursoModuloSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(
        await casos.editarModuloCurso(
          req.usuario!,
          String(req.params.id),
          String(req.params.moduloId),
          parsed.data.titulo,
        ),
      )
    },

    moverModulo: async (req: Request, res: Response) => {
      const parsed = moverCursoModuloSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(
        await casos.moverModuloCurso(
          req.usuario!,
          String(req.params.id),
          String(req.params.moduloId),
          parsed.data.direccion,
        ),
      )
    },

    eliminarModulo: async (req: Request, res: Response) => {
      await casos.eliminarModuloCurso(
        req.usuario!,
        String(req.params.id),
        String(req.params.moduloId),
      )
      res.status(204).send()
    },

    crearLeccion: async (req: Request, res: Response) => {
      const parsed = crearLeccionSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res
        .status(201)
        .json(
          await casos.crearLeccionCurso(
            req.usuario!,
            String(req.params.id),
            String(req.params.moduloId),
            parsed.data,
          ),
        )
    },

    editarLeccion: async (req: Request, res: Response) => {
      const parsed = editarLeccionSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(
        await casos.editarLeccionCurso(
          req.usuario!,
          String(req.params.id),
          String(req.params.moduloId),
          String(req.params.leccionId),
          parsed.data,
        ),
      )
    },

    moverLeccion: async (req: Request, res: Response) => {
      const parsed = moverLeccionSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      res.json(
        await casos.moverLeccionCurso(
          req.usuario!,
          String(req.params.id),
          String(req.params.moduloId),
          String(req.params.leccionId),
          parsed.data.direccion,
        ),
      )
    },

    eliminarLeccion: async (req: Request, res: Response) => {
      await casos.eliminarLeccionCurso(
        req.usuario!,
        String(req.params.id),
        String(req.params.moduloId),
        String(req.params.leccionId),
      )
      res.status(204).send()
    },
  }
}
