import { Router } from "express"
import { casos, requireAuth } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { preaprobadosController } from "../controllers/preaprobadosController.js"

const c = preaprobadosController(casos)

/**
 * Allowlist de acceso (pre-aprobación por correo). Todo el router exige SUPERADMIN
 * tras `requireAuth`. La eliminación llavea por email (en el body, no en la ruta:
 * un correo tiene `@` y puntos que ensucian el path) → POST `/eliminar`.
 */
export const preaprobadosRouter = Router()

preaprobadosRouter.use(requireAuth, requireActivo, requireRol("SUPERADMIN"))

preaprobadosRouter.get("/", asyncHandler(c.listar))
preaprobadosRouter.post("/", asyncHandler(c.crear))
preaprobadosRouter.post("/eliminar", asyncHandler(c.eliminar))
