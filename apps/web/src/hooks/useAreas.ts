import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AreaVistoBueno } from "@pys/shared"
import { apiAreas } from "../lib/api"

/**
 * Catálogo de áreas activas. Dato de referencia que casi nunca cambia, por lo
 * que `staleTime` es de 5 minutos para evitar recargas innecesarias.
 */
export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: () => apiAreas.listar(),
    staleTime: 5 * 60_000,
  })
}

/**
 * Vista de administración del catálogo: incluye las áreas inactivas (solo
 * SUPERADMIN). El backend rechaza a cualquier otro rol con 403.
 */
export function useAreasAdmin() {
  return useQuery({
    queryKey: ["areas-admin"],
    queryFn: () => apiAreas.listarAdmin(),
  })
}

/**
 * Toda mutación del catálogo cambia el conjunto de áreas (y, en crear/activar,
 * el estado global de funcionarios). Refresca la vista admin con el resultado y
 * revalida cuanto depende de las áreas: lectura pública, catálogos, colas,
 * métricas y la futura matriz.
 */
function useMutacionArea<TArgs>(fn: (args: TArgs) => Promise<AreaVistoBueno[]>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (lista) => {
      qc.setQueryData(["areas-admin"], lista)
      for (const key of [
        ["areas"],
        ["funcionarios"],
        ["funcionarios-todos"],
        ["mi-area"],
        ["metricas"],
        ["matriz"],
      ]) {
        void qc.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useCrearArea() {
  return useMutacionArea((nombre: string) => apiAreas.crear(nombre))
}

export function useRenombrarArea() {
  return useMutacionArea((args: { id: string; nombre: string }) =>
    apiAreas.renombrar(args.id, args.nombre),
  )
}

export function useMoverArea() {
  return useMutacionArea((args: { id: string; direccion: "subir" | "bajar" }) =>
    apiAreas.mover(args.id, args.direccion),
  )
}

export function useCambiarActivaArea() {
  return useMutacionArea((args: { id: string; activa: boolean }) =>
    apiAreas.cambiarActiva(args.id, args.activa),
  )
}
