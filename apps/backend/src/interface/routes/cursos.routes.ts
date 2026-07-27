import { Router } from "express"
import rateLimit from "express-rate-limit"
import { casos, requireAuth, requirePermiso } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { paramUuid } from "../middleware/paramUuid.js"
import { cursosController } from "../controllers/cursosController.js"
import { cursosPublicoController } from "../controllers/cursosPublicoController.js"

const c = cursosController(casos)
const pub = cursosPublicoController(casos)

/**
 * Rate-limit para las rutas públicas "tomar el curso por cédula": 60 req/min/IP.
 * Protege endpoints anónimos idempotentes (protegidos además por un token de
 * ~131 bits no enumerable) sin estrangular a una sala entera de asistentes tras
 * un mismo NAT/WiFi, que comparten IP saliente.
 */
const limiterPublico = rateLimit({ windowMs: 60_000, limit: 60 })

/**
 * Router de Cursos. Se monta en `/api/cursos`.
 *
 * ⚠️ ORDEN CRÍTICO: las rutas PÚBLICAS de `/tomar/:token` se definen ANTES del
 * middleware `requireAuth` para que Express las resuelva sin requerir JWT
 * (mismo patrón que `capacitaciones.routes.ts` con `/registro/:token`).
 */
export const cursosRouter = Router()

// Guarda de forma UUID (400 en vez de 500 pg 22P02). NO se registra `token`:
// las rutas públicas usan un token base64url, no un UUID.
cursosRouter.param("id", paramUuid("id"))
cursosRouter.param("moduloId", paramUuid("moduloId"))
cursosRouter.param("leccionId", paramUuid("leccionId"))

// ── Rutas públicas (sin requireAuth) — "tomar el curso por cédula" ───────────
cursosRouter.get("/tomar/:token", limiterPublico, asyncHandler(pub.info))
cursosRouter.post("/tomar/:token/ingresar", limiterPublico, asyncHandler(pub.ingresar))
cursosRouter.post(
  "/tomar/:token/lecciones/:leccionId/completar",
  limiterPublico,
  asyncHandler(pub.completar),
)

// ── Rutas autenticadas ────────────────────────────────────────────────────────
cursosRouter.use(requireAuth, requireActivo)
// Cursos vive dentro del módulo Capacitaciones a efectos de visibilidad RBAC.
cursosRouter.use(requirePermiso("capacitaciones"))

const ROLES_CURSOS = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

cursosRouter.get("/", requireRol(...ROLES_CURSOS), asyncHandler(c.listar))
cursosRouter.post("/", requireRol(...ROLES_CURSOS), asyncHandler(c.crear))
cursosRouter.get("/:id", requireRol(...ROLES_CURSOS), asyncHandler(c.detalle))
cursosRouter.patch("/:id", requireRol(...ROLES_CURSOS), asyncHandler(c.editar))
cursosRouter.post("/:id/registro/abrir", requireRol(...ROLES_CURSOS), asyncHandler(c.abrir))
cursosRouter.post("/:id/registro/cerrar", requireRol(...ROLES_CURSOS), asyncHandler(c.cerrar))
cursosRouter.get("/:id/inscritos", requireRol(...ROLES_CURSOS), asyncHandler(c.inscritos))
cursosRouter.post("/:id/modulos", requireRol(...ROLES_CURSOS), asyncHandler(c.crearModulo))
cursosRouter.patch(
  "/:id/modulos/:moduloId",
  requireRol(...ROLES_CURSOS),
  asyncHandler(c.editarModulo),
)
cursosRouter.post(
  "/:id/modulos/:moduloId/mover",
  requireRol(...ROLES_CURSOS),
  asyncHandler(c.moverModulo),
)
cursosRouter.post(
  "/:id/modulos/:moduloId/eliminar",
  requireRol(...ROLES_CURSOS),
  asyncHandler(c.eliminarModulo),
)
cursosRouter.post(
  "/:id/modulos/:moduloId/lecciones",
  requireRol(...ROLES_CURSOS),
  asyncHandler(c.crearLeccion),
)
cursosRouter.patch(
  "/:id/modulos/:moduloId/lecciones/:leccionId",
  requireRol(...ROLES_CURSOS),
  asyncHandler(c.editarLeccion),
)
cursosRouter.post(
  "/:id/modulos/:moduloId/lecciones/:leccionId/mover",
  requireRol(...ROLES_CURSOS),
  asyncHandler(c.moverLeccion),
)
cursosRouter.post(
  "/:id/modulos/:moduloId/lecciones/:leccionId/eliminar",
  requireRol(...ROLES_CURSOS),
  asyncHandler(c.eliminarLeccion),
)
