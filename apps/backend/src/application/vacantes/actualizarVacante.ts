import type { CatalogoVacanteItem, EditarVacanteInput, HallazgoVacante, Usuario, VacanteEvaluable } from "@pys/shared"
import { evaluarFila, tieneBloqueoVacante } from "@pys/shared"
import type { VacanteRepo } from "../../domain/ports/VacanteRepo.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../errors.js"
import { exigirRol } from "../guards.js"
import { ROLES_VACANTES } from "./listarVacantes.js"

function claveDe(lista: CatalogoVacanteItem[], id: string | null | undefined): string | null {
  if (!id) return null
  return lista.find((c) => c.id === id)?.clave ?? null
}

function mensajesBloqueo(hallazgos: HallazgoVacante[]): string {
  return hallazgos
    .filter((h) => h.severidad === "BLOQUEO")
    .map((h) => h.mensaje)
    .join(" ")
}

export function actualizarVacante(deps: { repo: VacanteRepo }) {
  return async (actor: Usuario, id: string, input: EditarVacanteInput) => {
    exigirRol(actor, [...ROLES_VACANTES], "Solo Talento Humano puede editar vacantes.")

    const actual = await deps.repo.obtenerVacante(id)
    if (!actual) throw new ErrorNoEncontrado("La vacante no existe.")

    const catalogos = await deps.repo.obtenerCatalogos()

    // Rango fusionado: un PATCH parcial se valida contra la vacante YA
    // fusionada con el cambio (nunca solo el fragmento entrante), igual que
    // `editarCapacitacion`. `undefined` = no cambia; `null` = borra el campo.
    const draft: VacanteEvaluable = {
      requerimiento: actual.requerimiento,
      cargo: input.cargo ?? actual.cargo,
      posiciones: input.posiciones ?? actual.posiciones,
      areaId: input.areaId !== undefined ? input.areaId : actual.areaId,
      modalidad:
        input.modalidadId !== undefined ? claveDe(catalogos.modalidades, input.modalidadId) : actual.modalidad,
      dedicacion:
        input.dedicacionId !== undefined ? claveDe(catalogos.dedicaciones, input.dedicacionId) : actual.dedicacion,
      escalafon:
        input.escalafonId !== undefined ? claveDe(catalogos.escalafones, input.escalafonId) : actual.escalafon,
      motivo: input.motivoId !== undefined ? claveDe(catalogos.motivos, input.motivoId) : actual.motivo,
      fuente: input.fuenteId !== undefined ? claveDe(catalogos.fuentes, input.fuenteId) : actual.fuente,
      jefe: input.jefe !== undefined ? input.jefe : actual.jefe,
      reemplazo: input.reemplazo !== undefined ? input.reemplazo : actual.reemplazo,
      nombreNuevo: input.nombreNuevo !== undefined ? input.nombreNuevo : actual.nombreNuevo,
      salario: input.salario !== undefined ? input.salario : actual.salario,
      aprobacion: input.aprobacion !== undefined ? input.aprobacion : actual.aprobacion,
      fechaAprobacion: input.fechaAprobacion !== undefined ? input.fechaAprobacion : actual.fechaAprobacion,
      fechaRequerimiento: input.fechaRequerimiento ?? actual.fechaRequerimiento,
      fase: input.fase ?? actual.fase,
      estado: input.estado ?? actual.estado,
      fechaContratacion:
        input.fechaContratacion !== undefined ? input.fechaContratacion : actual.fechaContratacion,
      cedula: input.cedula !== undefined ? input.cedula : actual.cedula,
    }

    const hoy = new Date().toISOString().slice(0, 10)
    const hallazgos = evaluarFila(draft, hoy)
    if (tieneBloqueoVacante(hallazgos)) {
      throw new ErrorValidacion(mensajesBloqueo(hallazgos))
    }

    const vacante = await deps.repo.actualizarVacante(id, {
      cargo: input.cargo,
      posiciones: input.posiciones,
      areaId: input.areaId,
      modalidadId: input.modalidadId,
      dedicacionId: input.dedicacionId,
      escalafonId: input.escalafonId,
      motivoId: input.motivoId,
      fuenteId: input.fuenteId,
      jefe: input.jefe,
      reemplazo: input.reemplazo,
      nombreNuevo: input.nombreNuevo,
      salario: input.salario,
      aprobacion: input.aprobacion,
      fechaAprobacion: input.fechaAprobacion,
      fechaRequerimiento: input.fechaRequerimiento,
      fase: input.fase,
      estado: input.estado,
      fechaContratacion: input.fechaContratacion,
      cedula: input.cedula,
    }, actor.nombre)

    const avisos = hallazgos.filter((h) => h.severidad === "AVISO")
    return { ...vacante, avisos }
  }
}
