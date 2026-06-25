import type { NextFunction, Request, RequestHandler, Response } from "express"

/**
 * Envuelve un handler async para que cualquier rechazo de promesa llegue al
 * `errorHandler` (Express 4 no captura errores async por sí mismo).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
