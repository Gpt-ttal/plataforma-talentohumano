import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import type { CambiarEstadoAreaInput, DevolverCasoAAreaInput, FiltroFuncionarios } from "@pys/shared"
import { apiFuncionarios } from "../lib/api"

/**
 * Invalida TODAS las vistas que dependen del trámite tras cualquier mutación.
 * Cualquier transición (área, liquidación, paz y salvo) puede mover a un
 * funcionario entre el catálogo, la cola del área, la matriz, las métricas, el
 * desglose del Panel (`funcionarios-todos`) y el Archivo (`archivo`/`expediente`,
 * lista de cerrados). Invalidar de más es barato (solo marca *stale*); garantiza
 * sincronización 100% y elimina la deriva entre mutaciones que dejaba vistas viejas.
 */
export function invalidarVistasTramite(qc: QueryClient) {
  for (const key of [
    "funcionarios",
    "funcionario",
    "mi-area",
    "matriz",
    "metricas",
    "funcionarios-todos",
    "archivo",
    "expediente",
    "personal",
  ]) {
    void qc.invalidateQueries({ queryKey: [key] })
  }
}

/**
 * Lista paginada de funcionarios con filtros opcionales (q, estado, pagina, porPagina).
 * Revalida cuando cambia el objeto `filtro`. `opciones.enabled` permite suprimir la
 * query cuando no aplica (p. ej. el conteo de bandeja en la vista "todos").
 */
export function useFuncionarios(
  filtro: FiltroFuncionarios = {},
  opciones: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["funcionarios", filtro],
    queryFn: () => apiFuncionarios.listar(filtro),
    enabled: opciones.enabled ?? true,
  })
}

/**
 * Detalle completo de un funcionario (áreas, aprobaciones, observaciones).
 * Se mantiene suspendido mientras `id` sea undefined.
 */
export function useFuncionarioDetalle(id: string | undefined) {
  return useQuery({
    queryKey: ["funcionario", id],
    queryFn: () => apiFuncionarios.detalle(id!),
    enabled: !!id,
  })
}

/**
 * Cambia el estado de un área para un funcionario (aprueba, rechaza, etc.).
 * Invalida todas las vistas del trámite (ver `invalidarVistasTramite`).
 */
export function useCambiarEstadoArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CambiarEstadoAreaInput) => apiFuncionarios.cambiarEstadoArea(input),
    onSuccess: () => invalidarVistasTramite(qc),
  })
}

/**
 * Genera la liquidación de un funcionario cuando todas las áreas están OK.
 * Invalida todas las vistas del trámite (ver `invalidarVistasTramite`).
 */
export function useGenerarLiquidacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFuncionarios.generarLiquidacion(id),
    onSuccess: () => invalidarVistasTramite(qc),
  })
}

/**
 * Registra el paz y salvo final de un funcionario (solo Control Interno).
 * Invalida todas las vistas del trámite (ver `invalidarVistasTramite`).
 */
export function useRegistrarPazYSalvo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFuncionarios.registrarPazYSalvo(id),
    onSuccess: () => invalidarVistasTramite(qc),
  })
}

/**
 * Control Interno devuelve el caso a un área puntual para que lo revise de
 * nuevo (`DEVUELTO_POR_CI`, distinguible de un rechazo). Invalida todas las
 * vistas del trámite.
 */
export function useDevolverCasoAArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      funcionarioId,
      ...input
    }: DevolverCasoAAreaInput & { funcionarioId: string }) =>
      apiFuncionarios.devolverCasoAArea(funcionarioId, input),
    onSuccess: () => invalidarVistasTramite(qc),
  })
}

/**
 * Archivado formal de un trámite ya cerrado (PAZ_Y_SALVO). Invalida todas
 * las vistas del trámite (el Archivo muestra la fecha de archivado).
 */
export function useArchivarCaso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFuncionarios.archivarCaso(id),
    onSuccess: () => invalidarVistasTramite(qc),
  })
}
