import { Router } from "express"
import { casos, requireAuth } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { archivoController } from "../controllers/archivoController.js"

const c = archivoController(casos)

/**
 * Archivo institucional: lecturas de trámites cerrados + export CSV. Todo el
 * router exige la plataforma de gestión (SUPERADMIN + TALENTO_HUMANO); Control
 * Interno y AREA reciben 403. Los casos de uso reaplican la guarda (red de
 * seguridad).
 */
export const archivoRouter = Router()

archivoRouter.use(
  requireAuth,
  requireActivo,
  requireRol("SUPERADMIN", "TALENTO_HUMANO"),
)

archivoRouter.get("/", asyncHandler(c.listar))
archivoRouter.get("/export", asyncHandler(c.exportar))
archivoRouter.get("/:id", asyncHandler(c.expediente))
