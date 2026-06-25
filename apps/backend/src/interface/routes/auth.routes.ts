import { Router } from "express"
import { requireAuth } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { authController } from "../controllers/authController.js"

/**
 * Rutas de sesión. `GET /api/auth/me` requiere solo estar autenticado: cualquier
 * usuario (incluido uno PENDIENTE recién autoregistrado) puede consultar su
 * propio estado para que el frontend decida a dónde llevarlo.
 */
export const authRouter = Router()

authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => authController.me(req, res)))
