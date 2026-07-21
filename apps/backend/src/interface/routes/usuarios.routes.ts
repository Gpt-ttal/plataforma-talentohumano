import { Router } from "express"
import { casos, requireAuth } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { paramUuid } from "../middleware/paramUuid.js"
import { usuariosController } from "../controllers/usuariosController.js"

const c = usuariosController(casos)

/**
 * Administración de usuarios. Todo el router exige SUPERADMIN tras `requireAuth`.
 */
export const usuariosRouter = Router()

usuariosRouter.param("id", paramUuid("id"))

usuariosRouter.use(requireAuth, requireActivo, requireRol("SUPERADMIN"))

usuariosRouter.get("/", asyncHandler(c.listar))
usuariosRouter.post("/:id/rol", asyncHandler(c.asignarRol))
usuariosRouter.post("/:id/estado", asyncHandler(c.cambiarEstado))
