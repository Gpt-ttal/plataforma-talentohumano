import type { NextFunction, Request, RequestHandler, Response } from "express"
import type { NivelPermiso, RolUsuario } from "@pys/shared"
import { nivelSuficiente } from "@pys/shared"
import { ErrorAutenticacion, ErrorAutorizacion } from "../../application/errors.js"

export interface DepsRequirePermiso {
  /** Nivel del rol sobre un módulo, resuelto por el loader (lectura fresca). */
  nivelDe: (rol: RolUsuario, moduloId: string) => Promise<NivelPermiso>
}

/** Métodos HTTP que mutan estado → exigen nivel ESCRITURA (los demás, LECTURA). */
const METODOS_ESCRITURA = new Set(["POST", "PUT", "PATCH", "DELETE"])

/**
 * Fábrica del middleware de permisos por módulo. **Suma** a `requireRol`: se monta
 * DESPUÉS de él en cada router de módulo. La matriz solo puede RESTAR acceso sobre
 * el piso de rol; nunca otorga más. Requiere `req.usuario` (lo pone `requireAuth`).
 *
 * Nivel exigido: sensible al método HTTP. Las lecturas (GET/HEAD) piden LECTURA; las
 * mutaciones (POST/PUT/PATCH/DELETE) piden ESCRITURA. Así el nivel LECTURA de la
 * matriz vuelve un módulo de solo-lectura para el rol, no meramente cosmético.
 * Un `requerido` explícito lo fuerza (p.ej. montar el mismo gate con nivel fijo).
 *
 * Fallback merge-safe: mientras la 0023 no esté aplicada, el loader resuelve desde
 * la semilla de MODULOS (ESCRITURA a todo rol visible) → el nivel equivale a la
 * visibilidad actual y nada cambia hoy.
 */
export function crearRequirePermiso(deps: DepsRequirePermiso) {
  return (moduloId: string, requerido?: NivelPermiso): RequestHandler => {
    return async (req: Request, _res: Response, next: NextFunction) => {
      const usuario = req.usuario
      if (!usuario) {
        return next(new ErrorAutenticacion("No autenticado."))
      }
      try {
        const nivelReq: NivelPermiso =
          requerido ?? (METODOS_ESCRITURA.has(req.method) ? "ESCRITURA" : "LECTURA")
        const actual = await deps.nivelDe(usuario.rol, moduloId)
        if (!nivelSuficiente(actual, nivelReq)) {
          return next(
            new ErrorAutorizacion("Tu rol no tiene acceso a este módulo."),
          )
        }
        next()
      } catch (e) {
        next(e)
      }
    }
  }
}
