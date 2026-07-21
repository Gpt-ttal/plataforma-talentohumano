import type { NextFunction, Request, Response } from "express"
import { ErrorValidacion } from "../../application/errors.js"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Guarda de forma para params de ruta que identifican filas (`:id`,
 * `:cursoId`, `:moduloId`, ...): todas se generan como UUID (`defaultRandom()`
 * en el schema). Sin esto, un valor no-UUID llega intacto al repo y Postgres
 * lo rechaza con `22P02 invalid input syntax for type uuid` — un error sin
 * `.status` que el `errorHandler` traduce a 500 en vez de un 400 legible.
 *
 * Uso vía `router.param(nombre, paramUuid(nombre))`: Express lo invoca solo
 * cuando ESE nombre de param aparece en la ruta que matcheó, sin tocar cada
 * definición de ruta individual. No aplicar a params que no son UUID (p.ej.
 * `:token` de las rutas públicas de Cursos/Capacitaciones).
 */
export function paramUuid(nombre: string) {
  return (req: Request, _res: Response, next: NextFunction, valor: string): void => {
    if (!UUID_RE.test(valor)) {
      next(new ErrorValidacion(`El parámetro "${nombre}" debe ser un identificador válido.`))
      return
    }
    next()
  }
}
