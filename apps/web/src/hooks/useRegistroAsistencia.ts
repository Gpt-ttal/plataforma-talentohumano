import { useMutation, useQuery } from "@tanstack/react-query"
import type { RegistrarAsistenciaInput } from "@pys/shared"
import { apiRegistro } from "../lib/api"

/**
 * Carga la info pública de la capacitación por token (sin auth).
 * Se usa en la página pública de registro que escanea el QR.
 */
export function useCapacitacionPublica(token: string | undefined) {
  return useQuery({
    queryKey: ["capacitacion-publica", token],
    queryFn: () => apiRegistro.info(token!),
    enabled: !!token,
    retry: false,
  })
}

/**
 * Mutación para registrar asistencia (sin auth). Idempotente por documento:
 * si ya existe, el backend responde { registrada: false, yaExistia: true }.
 */
export function useRegistrarAsistencia(token: string) {
  return useMutation({
    mutationFn: (datos: RegistrarAsistenciaInput) =>
      apiRegistro.registrar(token, datos),
  })
}
