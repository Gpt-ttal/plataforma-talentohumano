import type { CatalogoVacanteItem, CrearVacanteInput, HallazgoVacante, Usuario, VacanteEvaluable } from "@pys/shared"
import { evaluarFila, tieneBloqueoVacante } from "@pys/shared"
import type { VacanteRepo } from "../../domain/ports/VacanteRepo.js"
import { ErrorValidacion } from "../errors.js"
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

export function crearVacante(deps: { repo: VacanteRepo }) {
  return async (actor: Usuario, input: CrearVacanteInput) => {
    exigirRol(actor, [...ROLES_VACANTES], "Solo Talento Humano puede crear vacantes.")

    const catalogos = await deps.repo.obtenerCatalogos()

    const fase = input.fase ?? "RECLUTAMIENTO"
    const estado = input.estado ?? "PENDIENTE"

    // Se valida un borrador ANTES de escribir: un BLOQUEO no debe llegar a la BD.
    const draft: VacanteEvaluable = {
      requerimiento: null,
      cargo: input.cargo,
      posiciones: input.posiciones,
      areaId: input.areaId ?? null,
      modalidad: claveDe(catalogos.modalidades, input.modalidadId),
      dedicacion: claveDe(catalogos.dedicaciones, input.dedicacionId),
      escalafon: claveDe(catalogos.escalafones, input.escalafonId),
      motivo: claveDe(catalogos.motivos, input.motivoId),
      fuente: claveDe(catalogos.fuentes, input.fuenteId),
      jefe: input.jefe ?? null,
      reemplazo: input.reemplazo ?? null,
      nombreNuevo: input.nombreNuevo ?? null,
      salario: input.salario ?? null,
      aprobacion: input.aprobacion ?? null,
      fechaAprobacion: input.fechaAprobacion ?? null,
      fechaRequerimiento: input.fechaRequerimiento,
      fase,
      estado,
      fechaContratacion: input.fechaContratacion ?? null,
      cedula: input.cedula ?? null,
    }

    const hoy = new Date().toISOString().slice(0, 10)
    const hallazgos = evaluarFila(draft, hoy)
    if (tieneBloqueoVacante(hallazgos)) {
      throw new ErrorValidacion(mensajesBloqueo(hallazgos))
    }

    const vacante = await deps.repo.crearVacante({
      cargo: input.cargo,
      posiciones: input.posiciones,
      areaId: input.areaId ?? null,
      modalidadId: input.modalidadId ?? null,
      dedicacionId: input.dedicacionId ?? null,
      escalafonId: input.escalafonId ?? null,
      motivoId: input.motivoId ?? null,
      fuenteId: input.fuenteId ?? null,
      jefe: input.jefe ?? null,
      reemplazo: input.reemplazo ?? null,
      nombreNuevo: input.nombreNuevo ?? null,
      salario: input.salario ?? null,
      aprobacion: input.aprobacion ?? null,
      fechaAprobacion: input.fechaAprobacion ?? null,
      fechaRequerimiento: input.fechaRequerimiento,
      fase,
      estado,
      fechaContratacion: input.fechaContratacion ?? null,
      cedula: input.cedula ?? null,
    }, actor.nombre)

    const avisos = hallazgos.filter((h) => h.severidad === "AVISO")
    return { ...vacante, avisos }
  }
}
