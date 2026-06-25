import { useQuery } from "@tanstack/react-query"
import { apiMetricas } from "../lib/api"

/**
 * Métricas del Panel de control (totales por estado global, aging, pendientes por
 * área). Disponible para SUPERADMIN y TALENTO_HUMANO; el backend rechaza al resto.
 * `enabled` permite no dispararla cuando quien mira no la necesita.
 *
 * `staleTime` de 2 min: las métricas se invalidan en cada mutación del trámite
 * (`invalidateQueries(["metricas"])`), así que no hace falta revalidar pasivamente
 * cada 30s con el panel abierto.
 */
export function useMetricas(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["metricas"],
    queryFn: () => apiMetricas.obtener(),
    enabled: opts.enabled ?? true,
    staleTime: 120_000,
  })
}
