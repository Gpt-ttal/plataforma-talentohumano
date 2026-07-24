import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CrearVacanteInput,
  EditarVacanteInput,
  FiltroVacantes,
  SugerenciasVacanteInput,
} from "@pys/shared"
import { apiVacantes } from "../lib/api"

const CLAVE = "vacantes"

/** Listado paginado del catálogo de vacantes (búsqueda + estado + área). */
export function useVacantes(filtro: FiltroVacantes = {}) {
  return useQuery({
    queryKey: [CLAVE, filtro],
    queryFn: () => apiVacantes.listar(filtro),
  })
}

/** Detalle de una vacante (derivada: status, vencimiento, días en proceso, avisos). */
export function useVacanteDetalle(id: string | undefined) {
  return useQuery({
    queryKey: [CLAVE, "detalle", id],
    queryFn: () => apiVacantes.detalle(id!),
    enabled: !!id,
  })
}

/** 7 KPIs + 6 series del dashboard de Vacantes (`/vacantes/resumen`). */
export function useVacantesDashboard() {
  return useQuery({
    queryKey: [CLAVE, "dashboard"],
    queryFn: () => apiVacantes.dashboard(),
  })
}

/** Catálogos descriptivos (modalidad/dedicación/escalafón/motivo/fuente) + áreas. */
export function useVacantesCatalogos() {
  return useQuery({
    queryKey: [CLAVE, "catalogos"],
    queryFn: () => apiVacantes.catalogos(),
    staleTime: 5 * 60_000,
  })
}

/**
 * Autocompletar de alta: jefe/dedicación/modalidad sugeridos a partir de
 * vacantes previas con área/cargo equivalentes. `habilitado` lo controla el
 * llamador (el modal ya debouncea el valor antes de pasarlo aquí).
 */
export function useSugerenciasVacante(input: SugerenciasVacanteInput, habilitado: boolean) {
  return useQuery({
    queryKey: [CLAVE, "sugerencias", input],
    queryFn: () => apiVacantes.sugerencias(input),
    enabled: habilitado,
  })
}

/** Alta de una vacante nueva (3 campos obligatorios; el resto se completa en el detalle). */
export function useCrearVacante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearVacanteInput) => apiVacantes.crear(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}

/** Edición parcial (PATCH real) — usada por el stepper de fase y cada editor de sección. */
export function useEditarVacante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: EditarVacanteInput }) =>
      apiVacantes.editar(args.id, args.input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}
