import { useQuery } from "@tanstack/react-query"
import type { FiltroArchivo } from "@pys/shared"
import { apiArchivo } from "../lib/api"

/**
 * Listado del Archivo institucional (trámites cerrados) con filtros opcionales.
 * Revalida cuando cambia el objeto `filtro`. Solo lo consultan SA y TH; el backend
 * rechaza al resto con 403.
 */
export function useArchivo(filtro: FiltroArchivo = {}) {
  return useQuery({
    queryKey: ["archivo", filtro],
    queryFn: () => apiArchivo.listar(filtro),
  })
}

/** Expediente (detalle completo) de un funcionario archivado. */
export function useExpediente(id: string | undefined) {
  return useQuery({
    queryKey: ["expediente", id],
    queryFn: () => apiArchivo.expediente(id!),
    enabled: !!id,
  })
}
