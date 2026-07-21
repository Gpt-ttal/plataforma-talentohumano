import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiDesvinculaciones } from "../lib/api"
import { invalidarVistasTramite } from "./useFuncionarios"

/** Sube un Excel y lo previsualiza (parsea + valida cada fila contra la BD). */
export function useImportarDesvinculaciones() {
  return useMutation({
    mutationFn: (archivo: File) => apiDesvinculaciones.importar(archivo),
  })
}

/**
 * Confirma (parcial o total) las filas VALIDA seleccionadas de un lote ya
 * previsualizado. Cada fila confirmada abre un trámite nuevo, así que
 * invalida también todas las vistas del trámite (catálogo/mi-área/matriz/
 * métricas/archivo), además de la vista de importación.
 */
export function useConfirmarImportacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ loteId, filaIds }: { loteId: string; filaIds: string[] }) =>
      apiDesvinculaciones.confirmar(loteId, filaIds),
    onSuccess: () => {
      invalidarVistasTramite(qc)
      void qc.invalidateQueries({ queryKey: ["importacion"] })
    },
  })
}
