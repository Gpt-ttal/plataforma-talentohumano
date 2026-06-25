import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CambiarEstadoAreaInput, FiltroFuncionarios } from "@pys/shared"
import { apiFuncionarios } from "../lib/api"

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
 * Invalida funcionarios, detalle del funcionario, mi-area y métricas.
 */
export function useCambiarEstadoArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CambiarEstadoAreaInput) => apiFuncionarios.cambiarEstadoArea(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["funcionarios"] })
      void qc.invalidateQueries({ queryKey: ["funcionario"] })
      void qc.invalidateQueries({ queryKey: ["mi-area"] })
      void qc.invalidateQueries({ queryKey: ["metricas"] })
    },
  })
}

/**
 * Genera la liquidación de un funcionario cuando todas las áreas están OK.
 * Invalida funcionarios, detalle del funcionario y métricas.
 */
export function useGenerarLiquidacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFuncionarios.generarLiquidacion(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["funcionarios"] })
      void qc.invalidateQueries({ queryKey: ["funcionario"] })
      void qc.invalidateQueries({ queryKey: ["metricas"] })
    },
  })
}

/**
 * Registra el paz y salvo final de un funcionario (solo Control Interno).
 * Invalida funcionarios, detalle del funcionario y métricas.
 */
export function useRegistrarPazYSalvo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFuncionarios.registrarPazYSalvo(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["funcionarios"] })
      void qc.invalidateQueries({ queryKey: ["funcionario"] })
      void qc.invalidateQueries({ queryKey: ["metricas"] })
    },
  })
}
