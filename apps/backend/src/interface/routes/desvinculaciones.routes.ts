import { Router } from "express"
import multer from "multer"
import rateLimit from "express-rate-limit"
import { casos, requireAuth, requirePermiso } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { paramUuid } from "../middleware/paramUuid.js"
import { desvinculacionesController } from "../controllers/desvinculacionesController.js"

const c = desvinculacionesController(casos)

// Excel en memoria (sin persistir a disco); tope 5MB — margen amplio para un
// lote de cientos de filas, lejos del límite real de payload de Vercel.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// Rate-limit estricto: subir un Excel es una operación pesada (parseo +
// N validaciones contra BD), no un endpoint de lectura frecuente.
const limiterImportar = rateLimit({ windowMs: 60_000, limit: 10 })

/**
 * Router de importación masiva de desvinculaciones. Se monta en
 * `/api/desvinculaciones`. Ambas rutas exigen SA/TH — mismo guard que ya
 * aplican los casos de uso (defensa en profundidad).
 */
export const desvinculacionesRouter = Router()

desvinculacionesRouter.param("id", paramUuid("id"))

desvinculacionesRouter.use(requireAuth, requireActivo)
// La importación de desvinculaciones opera sobre el maestro de Personal.
desvinculacionesRouter.use(requirePermiso("personal"))

const ROLES_DESVINCULACIONES = ["SUPERADMIN", "TALENTO_HUMANO"] as const

desvinculacionesRouter.post(
  "/importar",
  requireRol(...ROLES_DESVINCULACIONES),
  limiterImportar,
  upload.single("archivo"),
  asyncHandler(c.importar),
)
desvinculacionesRouter.post(
  "/lotes/:id/confirmar",
  requireRol(...ROLES_DESVINCULACIONES),
  asyncHandler(c.confirmar),
)
