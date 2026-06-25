import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AsignarRolInput, CambiarEstadoUsuarioInput } from "@pys/shared"
import { apiUsuarios } from "../lib/api"

/**
 * Lista paginada de usuarios del sistema (solo SUPERADMIN).
 */
export function useUsuarios(pagina?: number) {
  return useQuery({
    queryKey: ["usuarios", pagina],
    queryFn: () => apiUsuarios.listar(pagina),
  })
}

/**
 * Asigna rol y área a un usuario PENDIENTE, activándolo.
 * Invalida la lista de usuarios.
 */
export function useAsignarRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AsignarRolInput) => apiUsuarios.asignarRol(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["usuarios"] })
    },
  })
}

/**
 * Cambia el estado de un usuario (ACTIVO ↔ INACTIVO).
 * Invalida la lista de usuarios.
 */
export function useCambiarEstadoUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CambiarEstadoUsuarioInput) => apiUsuarios.cambiarEstado(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["usuarios"] })
    },
  })
}
