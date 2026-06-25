import type { NextFunction, Request, RequestHandler, Response } from "express"
import { ErrorAutenticacion, ErrorAutorizacion } from "../../application/errors.js"
import type { ResultadoAlta } from "../../application/auth/asegurarUsuario.js"
import type { ClaimsUsuario } from "../../infrastructure/auth/supabaseJwtVerifier.js"

export interface DepsRequireAuth {
  /** Verifica la firma del JWT y extrae los claims (sub/email/nombre). */
  verificar: (token: string) => Promise<ClaimsUsuario>
  /** Garantiza el Usuario del dominio para esa identidad (autoregistro). */
  asegurar: (uid: string, email: string, nombre: string) => Promise<ResultadoAlta>
}

/**
 * Middleware de autenticación. Lee `Authorization: Bearer <jwt>`, verifica la
 * firma con Supabase, resuelve/crea el `Usuario` del dominio y lo deja en
 * `req.usuario`. Es la frontera donde el backend toma el control de la sesión;
 * la autorización fina la aplican `requireRol` y los casos de uso.
 *
 *  - Sin header o token inválido/expirado → 401.
 *  - Identidad rechazada por el autoregistro (p. ej. fuera del dominio) → 403.
 */
export function crearRequireAuth(deps: DepsRequireAuth): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith("Bearer ")) {
      return next(new ErrorAutenticacion("Falta el token de autenticación."))
    }

    const token = header.slice("Bearer ".length).trim()
    let claims: ClaimsUsuario
    try {
      claims = await deps.verificar(token)
    } catch {
      return next(new ErrorAutenticacion("Token inválido o expirado."))
    }

    try {
      const alta = await deps.asegurar(claims.sub, claims.email, claims.nombre)
      if (!alta.ok) return next(new ErrorAutorizacion(alta.motivo))
      req.usuario = alta.usuario
      next()
    } catch (e) {
      next(e)
    }
  }
}
