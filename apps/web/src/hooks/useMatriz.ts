import { useQuery } from "@tanstack/react-query"
import type { FiltroFuncionarios } from "@pys/shared"
import { apiFuncionarios } from "../lib/api"

/**
 * Matriz consolidada funcionario × área activa (TH/CI/SA). Revalida cuando cambia
 * el objeto `filtro` (búsqueda + estado global + paginación). Las mutaciones del
 * trámite y del catálogo de áreas invalidan la clave `["matriz"]`.
 */
export function useMatriz(filtro: FiltroFuncionarios = {}) {
  return useQuery({
    queryKey: ["matriz", filtro],
    queryFn: () => apiFuncionarios.matriz(filtro),
  })
}
