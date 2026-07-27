import { Router } from "express"
import { casos, requireAuth, requirePermiso } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { paramUuid } from "../middleware/paramUuid.js"
import { planificadorController } from "../controllers/planificadorController.js"

const c = planificadorController(casos)

/**
 * Router del Planificador (agenda anual de capacitaciones planeadas). Sin flujo
 * público — a diferencia de Cursos/Capacitaciones, todo aquí requiere sesión.
 * Montado en `/api/planificador`.
 */
export const planificadorRouter = Router()

planificadorRouter.param("id", paramUuid("id"))

planificadorRouter.use(requireAuth, requireActivo)
// El planificador vive dentro del módulo Capacitaciones a efectos de RBAC.
planificadorRouter.use(requirePermiso("capacitaciones"))

const ROLES_PLANIFICADOR = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

planificadorRouter.get("/", requireRol(...ROLES_PLANIFICADOR), asyncHandler(c.listar))
planificadorRouter.post("/", requireRol(...ROLES_PLANIFICADOR), asyncHandler(c.crear))
planificadorRouter.patch("/:id", requireRol(...ROLES_PLANIFICADOR), asyncHandler(c.editar))
planificadorRouter.post(
  "/:id/eliminar",
  requireRol(...ROLES_PLANIFICADOR),
  asyncHandler(c.eliminar),
)
