import type { RequestHandler } from "express"
import { ErrorAutenticacion, ErrorAutorizacion } from "../../application/errors.js"

/**
 * Guarda de habilitación. Exige que el usuario resuelto por `requireAuth` esté
 * en estado ACTIVO. Un usuario PENDIENTE (recién autoregistrado, sin rol/área
 * asignados) o INACTIVO (revocado por el superadmin) conserva un JWT válido
 * hasta su `exp`, pero NO debe poder operar: esta guarda hace que la
 * desactivación surta efecto inmediato en cada request, sin esperar a que el
 * token expire.
 *
 * No se monta sobre `GET /api/auth/me`: esa ruta debe responder también a un
 * usuario PENDIENTE para que el frontend lo enrute a /pendiente.
 */
export const requireActivo: RequestHandler = (req, _res, next) => {
  if (!req.usuario) {
    return next(new ErrorAutenticacion("No autenticado."))
  }
  if (req.usuario.estado !== "ACTIVO") {
    return next(new ErrorAutorizacion("Usuario no activo."))
  }
  next()
}
