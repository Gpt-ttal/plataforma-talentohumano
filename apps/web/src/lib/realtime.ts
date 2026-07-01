import type { QueryClient } from "@tanstack/react-query"
import { supabase } from "./supabase"

/**
 * Sincronía en vivo multi-usuario. Un único canal por sesión autenticada,
 * suscrito a cambios en `funcionarios` y `aprobaciones`. Cada evento invalida
 * las vistas de TanStack Query que dependen del trámite → refetch solo de lo
 * necesario.
 *
 * La conexión WebSocket va directo browser↔Supabase (no pasa por Vercel) y
 * respeta RLS: el usuario solo recibe eventos de filas que su política SELECT
 * le permite ver. No se necesita filtro adicional en el cliente.
 *
 * Devuelve una función de limpieza que remueve el canal (llamar en logout /
 * desmontaje).
 */
export function suscribirRealtime(qc: QueryClient): () => void {
  const invalidarTramite = (id?: string) => {
    qc.invalidateQueries({ queryKey: ["funcionarios"] })
    qc.invalidateQueries({ queryKey: ["funcionarios-todos"] })
    qc.invalidateQueries({ queryKey: ["metricas"] })
    qc.invalidateQueries({ queryKey: ["matriz"] })
    qc.invalidateQueries({ queryKey: ["mi-area"] })
    qc.invalidateQueries({ queryKey: ["archivo"] })
    if (id) qc.invalidateQueries({ queryKey: ["funcionario", id] })
  }

  const canal = supabase
    .channel("plataforma-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "funcionarios" },
      (payload) => {
        const fila = (payload.new ?? payload.old) as { id?: string } | null
        invalidarTramite(fila?.id)
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "aprobaciones" },
      (payload) => {
        const fila = (payload.new ?? payload.old) as { funcionario_id?: string } | null
        invalidarTramite(fila?.funcionario_id)
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(canal)
  }
}
