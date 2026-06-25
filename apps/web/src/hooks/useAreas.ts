import { useQuery } from "@tanstack/react-query"
import { apiAreas } from "../lib/api"

/**
 * Catálogo de áreas institucionales. Casi nunca cambia, por lo que
 * `staleTime` es de 5 minutos para evitar recargas innecesarias.
 */
export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: () => apiAreas.listar(),
    staleTime: 5 * 60_000,
  })
}
