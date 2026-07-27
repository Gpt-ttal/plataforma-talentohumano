import { Router } from "express"
import { casos, requireAuth } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { permisosController } from "../controllers/permisosController.js"

const c = permisosController(casos)

/**
 * RBAC editable (matriz rol × módulo). ANTI-LOCKOUT: el router se gobierna por
 * `requireRol("SUPERADMIN")`, NUNCA por la propia matriz → la Configuración jamás
 * puede cerrarse el acceso a sí misma. `GET /mios` es la excepción: cualquier
 * usuario activo consulta su propia visibilidad (para el filtrado de la UI).
 */
export const permisosRouter = Router()

permisosRouter.use(requireAuth, requireActivo)

permisosRouter.get("/mios", asyncHandler(c.mios))
permisosRouter.get("/", requireRol("SUPERADMIN"), asyncHandler(c.listar))
permisosRouter.put("/:rol", requireRol("SUPERADMIN"), asyncHandler(c.actualizarRol))
