import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Capacitacion, FiltroCapacitaciones } from "@pys/shared"
import { apiCapacitaciones } from "../lib/api"

const CLAVE = "capacitaciones"

/**
 * Listado paginado de capacitaciones con filtros (q, ambito, estado, pagina).
 * El backend filtra el ámbito por rol: TH solo ve TH, SST solo SST, SA ve ambos.
 */
export function useCapacitaciones(filtro: FiltroCapacitaciones = {}) {
  return useQuery({
    queryKey: [CLAVE, filtro],
    queryFn: () => apiCapacitaciones.listar(filtro),
  })
}

/** Detalle completo de una capacitación: evento + asistencias + total. */
export function useCapacitacionDetalle(id: string | undefined) {
  return useQuery({
    queryKey: [CLAVE, "detalle", id],
    queryFn: () => apiCapacitaciones.detalle(id!),
    enabled: !!id,
  })
}

function useMutacionCapacitacion<TArgs>(
  fn: (args: TArgs) => Promise<Capacitacion>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}

/** Crea una nueva capacitación. Revalida el listado. */
export function useCrearCapacitacion() {
  return useMutacionCapacitacion(
    (input: Parameters<typeof apiCapacitaciones.crear>[0]) =>
      apiCapacitaciones.crear(input),
  )
}

/** Edita una capacitación existente (solo en BORRADOR). */
export function useEditarCapacitacion() {
  return useMutacionCapacitacion(
    (args: { id: string; input: Parameters<typeof apiCapacitaciones.editar>[1] }) =>
      apiCapacitaciones.editar(args.id, args.input),
  )
}

/** Abre el registro de asistencia (BORRADOR → ABIERTO). */
export function useAbrirRegistro() {
  return useMutacionCapacitacion((id: string) =>
    apiCapacitaciones.abrirRegistro(id),
  )
}

/** Cierra el registro de asistencia (ABIERTO → CERRADO). */
export function useCerrarRegistro() {
  return useMutacionCapacitacion((id: string) =>
    apiCapacitaciones.cerrarRegistro(id),
  )
}
