import { useMutation, useQuery } from "@tanstack/react-query"
import type { IngresarCursoInput } from "@pys/shared"
import { apiCursosPublico } from "../lib/api"

/**
 * Carga la vista previa pública del curso por token (sin auth, sin progreso —
 * eso solo llega tras "ingresar" con la cédula). Usada en la pantalla pública
 * que abre el link/QR del curso, antes de que el funcionario se identifique.
 */
export function useCursoPublico(token: string | undefined) {
  return useQuery({
    queryKey: ["curso-publico", token],
    queryFn: () => apiCursosPublico.info(token!),
    enabled: !!token,
    retry: false,
  })
}

/**
 * Ingresa (o recupera) la inscripción por documento. Idempotente: devuelve el
 * `IngresoCursoResultado` completo — el llamador reemplaza su estado local
 * entero con la respuesta, sin merge (mismo shape que "completar lección").
 */
export function useIngresarCurso(token: string) {
  return useMutation({
    mutationFn: (datos: IngresarCursoInput) => apiCursosPublico.ingresar(token, datos),
  })
}

/**
 * Marca una lección como completada. Idempotente (doble clic no duplica).
 * Devuelve el mismo `IngresoCursoResultado` completo que `ingresar`.
 */
export function useCompletarLeccion(token: string) {
  return useMutation({
    mutationFn: (args: { leccionId: string; documento: string }) =>
      apiCursosPublico.completar(token, args.leccionId, args.documento),
  })
}
