import { Router } from "express"
import rateLimit from "express-rate-limit"
import { casos, requireAuth } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { capacitacionesController } from "../controllers/capacitacionesController.js"
import { registroPublicoController } from "../controllers/registroPublicoController.js"

const c = capacitacionesController(casos)
const pub = registroPublicoController(casos)

/**
 * Rate-limit estricto para el endpoint público de registro por QR: ~10 req/min/IP.
 * Más restrictivo que el global (120/min) para resistir doble-escaneo y bots.
 */
const limiterPublico = rateLimit({ windowMs: 60_000, limit: 10 })

/**
 * Router del módulo de Capacitaciones. Se monta en `/api/capacitaciones`.
 *
 * ⚠️ ORDEN CRÍTICO: las rutas PÚBLICAS de `/registro/*` se definen ANTES del
 * middleware `requireAuth` para que Express las resuelva sin requerir JWT.
 * El middleware `requireAuth` solo aplica a las rutas debajo del `.use()`.
 */
export const capacitacionesRouter = Router()

// ── Rutas públicas (sin requireAuth) — registro por QR ───────────────────────
// Montadas en el mismo router antes de requerir auth. El token de URL identifica
// el evento; no hay sesión del sistema involucrada.
capacitacionesRouter.get(
  "/registro/:token",
  limiterPublico,
  asyncHandler(pub.info),
)
capacitacionesRouter.post(
  "/registro/:token",
  limiterPublico,
  asyncHandler(pub.registrar),
)

// ── Rutas autenticadas ────────────────────────────────────────────────────────
capacitacionesRouter.use(requireAuth, requireActivo)

const ROLES_CAP = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

capacitacionesRouter.get("/", requireRol(...ROLES_CAP), asyncHandler(c.listar))
capacitacionesRouter.post("/", requireRol(...ROLES_CAP), asyncHandler(c.crear))
// /:id y sus sub-rutas
capacitacionesRouter.get("/:id", requireRol(...ROLES_CAP), asyncHandler(c.detalle))
capacitacionesRouter.patch("/:id", requireRol(...ROLES_CAP), asyncHandler(c.editar))
capacitacionesRouter.post("/:id/registro/abrir", requireRol(...ROLES_CAP), asyncHandler(c.abrir))
capacitacionesRouter.post("/:id/registro/cerrar", requireRol(...ROLES_CAP), asyncHandler(c.cerrar))
capacitacionesRouter.get(
  "/:id/asistencias/export",
  requireRol(...ROLES_CAP),
  asyncHandler(c.exportarAsistencias),
)
