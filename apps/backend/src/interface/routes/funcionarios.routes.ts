import { Router } from "express"
import { casos, requireAuth, requirePermiso } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { paramUuid } from "../middleware/paramUuid.js"
import { funcionariosController } from "../controllers/funcionariosController.js"

const c = funcionariosController(casos)

/**
 * Rutas de funcionarios y lecturas de supervisión. Todas tras `requireAuth`;
 * cada operación añade su guarda de rol en el borde (los casos de uso la
 * reaplican como red de seguridad).
 */
export const funcionariosRouter = Router()

funcionariosRouter.param("id", paramUuid("id"))
funcionariosRouter.param("areaId", paramUuid("areaId"))

funcionariosRouter.use(requireAuth, requireActivo)
// La matriz RBAC puede restar acceso al módulo (suma a las guardas de rol por ruta).
funcionariosRouter.use(requirePermiso("paz-y-salvo"))

// Lecturas de supervisión (TH / CI / SA)
funcionariosRouter.get(
  "/",
  requireRol("SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO"),
  asyncHandler(c.listar),
)
// Matriz consolidada funcionario × área. DEBE ir antes de `/:id` para que el
// literal "matriz" no se capture como un id de funcionario.
funcionariosRouter.get(
  "/matriz",
  requireRol("SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO"),
  asyncHandler(c.matriz),
)
funcionariosRouter.get(
  "/:id",
  requireRol("SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO"),
  asyncHandler(c.detalle),
)

// Visto bueno de área (AREA su área / SA cualquiera → guarda fina en el caso de uso)
funcionariosRouter.post(
  "/:id/areas/:areaId/estado",
  requireRol("SUPERADMIN", "AREA"),
  asyncHandler(c.cambiarEstado),
)

// Control Interno devuelve el caso a un área puntual para que lo revise de nuevo.
funcionariosRouter.post(
  "/:id/areas/:areaId/devolver",
  requireRol("SUPERADMIN", "CONTROL_INTERNO"),
  asyncHandler(c.devolverCasoAArea),
)

// Hitos de liquidación. Gestión de Desvinculaciones: guard invertido — CI valida
// (penúltimo hito), TH cierra oficialmente (último hito).
funcionariosRouter.post(
  "/:id/liquidacion",
  requireRol("SUPERADMIN", "CONTROL_INTERNO"),
  asyncHandler(c.generarLiquidacion),
)
funcionariosRouter.post(
  "/:id/paz-y-salvo",
  requireRol("SUPERADMIN", "TALENTO_HUMANO"),
  asyncHandler(c.registrarLiquidacion),
)

// Archivado formal: solo sobre un trámite ya cerrado (PAZ_Y_SALVO).
funcionariosRouter.post(
  "/:id/archivar",
  requireRol("SUPERADMIN", "TALENTO_HUMANO"),
  asyncHandler(c.archivarCaso),
)
