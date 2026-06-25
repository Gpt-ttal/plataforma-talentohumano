/**
 * errors.ts — Errores tipados de la capa de aplicación.
 *
 * Cada caso de uso lanza uno de estos cuando una guarda de rol/área, una
 * validación de invariante o una transición de estado no se cumple. El
 * `errorHandler` HTTP (Fase 4) los traduce a su código de estado vía `.status`.
 */

/** Error base con código de estado HTTP asociado. */
export class ErrorAplicacion extends Error {
  readonly status: number

  constructor(status: number, mensaje: string) {
    super(mensaje)
    this.name = new.target.name
    this.status = status
  }
}

/** Falta credencial o el token es inválido/expirado → 401. */
export class ErrorAutenticacion extends ErrorAplicacion {
  constructor(mensaje: string) {
    super(401, mensaje)
  }
}

/** El usuario autenticado no tiene permiso para esta acción → 403. */
export class ErrorAutorizacion extends ErrorAplicacion {
  constructor(mensaje: string) {
    super(403, mensaje)
  }
}

/** Datos de entrada o invariante de dominio violados → 400. */
export class ErrorValidacion extends ErrorAplicacion {
  constructor(mensaje: string) {
    super(400, mensaje)
  }
}

/** El recurso solicitado no existe → 404. */
export class ErrorNoEncontrado extends ErrorAplicacion {
  constructor(mensaje: string) {
    super(404, mensaje)
  }
}
