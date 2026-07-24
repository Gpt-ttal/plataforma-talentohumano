import type {
  AprobacionPresupuestoVacante,
  CatalogoVacanteItem,
  EstadoVacante,
  FaseVacante,
  FiltroVacantes,
  SugerenciasVacante,
  Vacante,
} from "@pys/shared"
import type { ResultadoPaginado } from "@pys/shared"

/**
 * Datos capturados de una vacante nueva/editada, tal como los expone el
 * contrato HTTP: los catálogos viajan por FK (`*Id`) — el repo resuelve la
 * `clave` al leer, para que el dominio (`evaluarFila`/`derivarVacante`)
 * compare valores canónicos sin volver a tocar la base.
 */
export interface NuevaVacanteInput {
  cargo: string
  posiciones: number
  areaId: string | null
  modalidadId: string | null
  dedicacionId: string | null
  escalafonId: string | null
  motivoId: string | null
  fuenteId: string | null
  jefe: string | null
  reemplazo: string | null
  nombreNuevo: string | null
  salario: number | null
  aprobacion: AprobacionPresupuestoVacante | null
  fechaAprobacion: string | null
  fechaRequerimiento: string
  fase: FaseVacante
  estado: EstadoVacante
  fechaContratacion: string | null
  cedula: string | null
}

/** Parche parcial de `NuevaVacanteInput` para `PATCH /api/vacantes/:id`. */
export type CambiosVacante = Partial<NuevaVacanteInput>

export interface CatalogosVacantes {
  areas: CatalogoVacanteItem[]
  modalidades: CatalogoVacanteItem[]
  dedicaciones: CatalogoVacanteItem[]
  escalafones: CatalogoVacanteItem[]
  motivos: CatalogoVacanteItem[]
  fuentes: CatalogoVacanteItem[]
}

export interface VacanteRepo {
  listarVacantes(filtro: FiltroVacantes): Promise<ResultadoPaginado<Vacante>>

  obtenerVacante(id: string): Promise<Vacante | null>

  /** `autor` audita la creación del funcionario si la vacante nace CONTRATADA (ADR-0009). */
  crearVacante(input: NuevaVacanteInput, autor: string): Promise<Vacante>

  /** `autor` audita la creación del funcionario en la transición a CONTRATADO (ADR-0009). */
  actualizarVacante(id: string, cambios: CambiosVacante, autor: string): Promise<Vacante>

  /** Todas las vacantes + nombre de área resuelto, para el dashboard (7 KPIs + 6 series). */
  listarParaDashboard(): Promise<Array<Vacante & { areaNombre: string | null }>>

  obtenerCatalogos(): Promise<CatalogosVacantes>

  /** Autocompletar: jefe/dedicación/modalidad más recientes para área/cargo equivalentes. */
  obtenerSugerencias(input: { areaId?: string; cargo?: string }): Promise<SugerenciasVacante>
}
