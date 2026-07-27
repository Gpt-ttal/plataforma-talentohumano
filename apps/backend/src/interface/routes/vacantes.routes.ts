import { Router } from "express"
import { casos, requireAuth, requirePermiso } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { paramUuid } from "../middleware/paramUuid.js"
import { vacantesController } from "../controllers/vacantesController.js"

const c = vacantesController(casos)

/** Router del módulo de Vacantes. Se monta en `/api/vacantes`. */
export const vacantesRouter = Router()

vacantesRouter.param("id", paramUuid("id"))
vacantesRouter.use(requireAuth, requireActivo)
vacantesRouter.use(requirePermiso("vacantes"))

const ROLES_VACANTES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

// Rutas fijas ANTES de "/:id" — de lo contrario Express las capturaría como id.
vacantesRouter.get("/dashboard", requireRol(...ROLES_VACANTES), asyncHandler(c.dashboard))
vacantesRouter.get("/catalogos", requireRol(...ROLES_VACANTES), asyncHandler(c.catalogos))
vacantesRouter.get("/sugerencias", requireRol(...ROLES_VACANTES), asyncHandler(c.sugerencias))

vacantesRouter.get("/", requireRol(...ROLES_VACANTES), asyncHandler(c.listar))
vacantesRouter.post("/", requireRol(...ROLES_VACANTES), asyncHandler(c.crear))
vacantesRouter.get("/:id", requireRol(...ROLES_VACANTES), asyncHandler(c.detalle))
vacantesRouter.patch("/:id", requireRol(...ROLES_VACANTES), asyncHandler(c.editar))
