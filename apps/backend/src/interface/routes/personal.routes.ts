import { Router } from "express"
import { casos, requireAuth } from "../container.js"
import { asyncHandler } from "../asyncHandler.js"
import { requireRol } from "../middleware/requireRol.js"
import { requireActivo } from "../middleware/requireActivo.js"
import { personalController } from "../controllers/personalController.js"

const c = personalController(casos)

/**
 * Maestro de empleados (Administración de Personal). Exclusivo SA/TH, montado
 * en `/api/personal`.
 */
export const personalRouter = Router()

personalRouter.use(requireAuth, requireActivo, requireRol("SUPERADMIN", "TALENTO_HUMANO"))

personalRouter.get("/", asyncHandler(c.listar))
personalRouter.post("/", asyncHandler(c.crear))
personalRouter.get("/:id/expediente", asyncHandler(c.expediente))
personalRouter.get("/:id", asyncHandler(c.detalle))
personalRouter.post("/:id", asyncHandler(c.editar))
personalRouter.post("/:id/finalizar-contrato", asyncHandler(c.finalizarContrato))
personalRouter.post("/:id/novedad", asyncHandler(c.registrarNovedad))

// ── Hoja de vida 360°: captura por bloque satélite ────────────────────────
personalRouter.post("/:id/personales", asyncHandler(c.guardarPersonales))
personalRouter.post("/:id/familiares", asyncHandler(c.crearFamiliar))
personalRouter.post("/:id/familiares/:familiarId/eliminar", asyncHandler(c.eliminarFamiliar))
personalRouter.post("/:id/formacion", asyncHandler(c.crearFormacion))
personalRouter.post("/:id/formacion/:formacionId/eliminar", asyncHandler(c.eliminarFormacion))
personalRouter.post("/:id/experiencia", asyncHandler(c.crearExperiencia))
personalRouter.post("/:id/experiencia/:experienciaId/eliminar", asyncHandler(c.eliminarExperiencia))
personalRouter.post("/:id/salarial", asyncHandler(c.guardarSalarial))
personalRouter.post("/:id/contractual", asyncHandler(c.editarContractual))
personalRouter.post("/:id/foto-url", asyncHandler(c.crearUrlSubidaFoto))
personalRouter.get("/:id/foto-url", asyncHandler(c.obtenerUrlFoto))
personalRouter.post("/:id/foto", asyncHandler(c.guardarFoto))
