import type { Request, Response } from "express"

/**
 * Controller de auth. `GET /api/auth/me` devuelve el usuario que `requireAuth`
 * resolvió a partir del JWT (incluye estado/rol/area), para que el frontend
 * decida la UX inicial. La autorización ya la garantizó el middleware.
 */
export const authController = {
  me: (req: Request, res: Response) => {
    res.json(req.usuario)
  },
}
