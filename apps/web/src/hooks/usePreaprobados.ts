import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CrearPreaprobadoInput } from "@pys/shared"
import { apiPreaprobados } from "../lib/api"

/** Allowlist de acceso: correos pre-aprobados (solo SUPERADMIN). */
export function usePreaprobados() {
  return useQuery({
    queryKey: ["preaprobados"],
    queryFn: () => apiPreaprobados.listar(),
  })
}

/** Pre-aprueba (o re-pre-aprueba) un correo. Invalida la allowlist. */
export function useCrearPreaprobado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearPreaprobadoInput) => apiPreaprobados.crear(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["preaprobados"] })
    },
  })
}

/** Retira un correo de la allowlist. Invalida la allowlist. */
export function useEliminarPreaprobado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => apiPreaprobados.eliminar(email),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["preaprobados"] })
    },
  })
}
