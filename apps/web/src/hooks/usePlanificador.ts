import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { FiltroCapacitacionesPlaneadas } from "@pys/shared"
import { apiPlanificador } from "../lib/api"

const CLAVE = "planificador"

/**
 * Listado paginado de capacitaciones planeadas con filtros (q, ambito, estado,
 * anio, mes). El backend filtra el ámbito por rol igual que Capacitaciones/Cursos.
 */
export function usePlanificador(filtro: FiltroCapacitacionesPlaneadas = {}) {
  return useQuery({
    queryKey: [CLAVE, filtro],
    queryFn: () => apiPlanificador.listar(filtro),
  })
}

function useMutacionPlaneada<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}

export function useCrearPlaneada() {
  return useMutacionPlaneada((input: Parameters<typeof apiPlanificador.crear>[0]) =>
    apiPlanificador.crear(input),
  )
}

export function useEditarPlaneada() {
  return useMutacionPlaneada(
    (args: { id: string; input: Parameters<typeof apiPlanificador.editar>[1] }) =>
      apiPlanificador.editar(args.id, args.input),
  )
}

export function useEliminarPlaneada() {
  return useMutacionPlaneada((id: string) => apiPlanificador.eliminar(id))
}
