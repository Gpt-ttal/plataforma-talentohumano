import { Router } from "express"
import { casos, requireAuth, requirePermiso } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { paramUuid } from "../middleware/paramUuid.js"
import { areasController } from "../controllers/areasController.js"

const c = areasController(casos)

/**
 * Catálogo de áreas. La lectura (datos de referencia: dropdowns, colas) la usa
 * cualquier usuario activo; las mutaciones del catálogo son exclusivas del
 * SUPERADMIN. Montado en `/api/areas`.
 */
export const areasRouter = Router()

areasRouter.param("id", paramUuid("id"))

areasRouter.use(requireAuth, requireActivo)
// El catálogo de áreas es parte del módulo Paz y Salvo.
areasRouter.use(requirePermiso("paz-y-salvo"))

// Lectura: cualquier usuario activo (`?incluirInactivas=1` lo gobierna el caso de uso).
areasRouter.get("/", asyncHandler(c.listar))

// Mutaciones del catálogo: solo SUPERADMIN.
areasRouter.post("/", requireRol("SUPERADMIN"), asyncHandler(c.crear))
areasRouter.post("/:id/nombre", requireRol("SUPERADMIN"), asyncHandler(c.renombrar))
areasRouter.post("/:id/mover", requireRol("SUPERADMIN"), asyncHandler(c.mover))
areasRouter.post("/:id/activa", requireRol("SUPERADMIN"), asyncHandler(c.cambiarActiva))
