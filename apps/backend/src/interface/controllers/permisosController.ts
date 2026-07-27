import type { Request, Response } from "express"
import { ROLES_USUARIO, actualizarPermisosRolSchema } from "@pys/shared"
import type { RolUsuario } from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import type { Casos } from "../container.js"

function mensajeZod(error: {
  issues: { path: (string | number)[]; message: string }[]
}): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ")
}

function parseRol(valor: string): RolUsuario {
  if (!(ROLES_USUARIO as readonly string[]).includes(valor)) {
    throw new ErrorValidacion(`Rol desconocido: ${valor}.`)
  }
  return valor as RolUsuario
}

/**
 * Controllers del RBAC editable. `GET /` y `PUT /:rol` exigen SUPERADMIN (montados
 * bajo `requireRol`); `GET /mios` lo puede llamar cualquier usuario activo para
 * conocer su propia visibilidad de módulos.
 */
export function permisosController(casos: Casos) {
  return {
    listar: async (req: Request, res: Response) => {
      res.json(await casos.listarMatrizPermisos(req.usuario!))
    },

    actualizarRol: async (req: Request, res: Response) => {
      const rol = parseRol(req.params.rol ?? "")
      const parsed = actualizarPermisosRolSchema.safeParse(req.body)
      if (!parsed.success) throw new ErrorValidacion(mensajeZod(parsed.error))
      await casos.actualizarPermisosRol(req.usuario!, rol, parsed.data)
      res.status(204).end()
    },

    mios: async (req: Request, res: Response) => {
      res.json(await casos.modulosVisibles(req.usuario!))
    },
  }
}
