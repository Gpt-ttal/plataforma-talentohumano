import type { NextFunction, Request, RequestHandler, Response } from "express"
import type { RolUsuario } from "@pys/shared"
import { ErrorAutenticacion, ErrorAutorizacion } from "../../application/errors.js"

/**
 * Guarda de rol a nivel de ruta. Exige que `req.usuario` (cargado por
 * `requireAuth`) tenga uno de los roles indicados; si no, 403. Refleja en el
 * borde HTTP la misma guarda que los casos de uso aplican internamente.
 */
export function requireRol(...roles: RolUsuario[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return next(new ErrorAutenticacion("No autenticado."))
    }
    if (!roles.includes(req.usuario.rol)) {
      return next(new ErrorAutorizacion("No tiene permiso para esta operación."))
    }
    next()
  }
}
