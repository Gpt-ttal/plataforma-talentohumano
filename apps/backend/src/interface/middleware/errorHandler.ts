import type { NextFunction, Request, Response } from "express"
import { logger } from "../../infrastructure/logging/logger.js"

/**
 * Manejador de errores central. Traduce los errores tipados de la capa de
 * aplicación (que llevan `.status`) a una respuesta JSON `{ error }`. Cualquier
 * error sin `.status` es un fallo inesperado → 500 (y se registra).
 *
 * Los mensajes de errores 5xx NUNCA se exponen al cliente: un error de la BD o
 * de una librería puede revelar estructura interna (columnas, constraints,
 * fragmentos de query). Solo los errores tipados de aplicación (4xx,
 * intencionalmente legibles) devuelven su mensaje; el resto cae a un texto
 * genérico mientras el detalle completo se registra en el servidor.
 *
 * Debe declarar los 4 argumentos para que Express lo reconozca como
 * error-handling middleware.
 */
const MENSAJE_GENERICO = "Error interno del servidor."

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : 500

  if (status >= 500) {
    // Contexto mínimo para diagnóstico en los logs del servidor (sin PII): qué
    // ruta falló y el error completo. Al cliente solo le llega un texto genérico.
    logger.error({ err, method: req.method, url: req.originalUrl, status }, "error no manejado")
    res.status(status).json({ error: MENSAJE_GENERICO })
    return
  }

  const mensaje =
    err instanceof Error && err.message ? err.message : MENSAJE_GENERICO
  res.status(status).json({ error: mensaje })
}
