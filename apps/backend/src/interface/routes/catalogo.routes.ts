import { Router } from "express"
import { casos, requireAuth } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { funcionariosController } from "../controllers/funcionariosController.js"

const c = funcionariosController(casos)

/**
 * Rutas de catálogo de referencia y vistas operativas montadas directamente
 * bajo `/api`: cola de área, áreas y métricas del panel.
 */
export const catalogoRouter = Router()

catalogoRouter.use(requireAuth, requireActivo)

// Cola de trabajo de un área (AREA su propia cola / SA cualquiera → guarda fina)
catalogoRouter.get(
  "/mi-area",
  requireRol("SUPERADMIN", "AREA"),
  asyncHandler(c.miArea),
)

// Métricas del panel: la plataforma (superadministrador y talento humano)
catalogoRouter.get(
  "/metricas",
  requireRol("SUPERADMIN", "TALENTO_HUMANO"),
  asyncHandler(c.metricas),
)
