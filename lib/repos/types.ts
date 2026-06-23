/**
 * types.ts — Contrato de la capa de persistencia.
 * Permite intercambiar la implementación (memoria para demo, Supabase para prod)
 * sin tocar las server actions ni la UI.
 */

import type {
  EstadoArea,
  Funcionario,
  FuncionarioDetalle,
  MetricasDashboard,
} from "../domain";

export interface CambiarEstadoAreaArgs {
  funcionarioId: string;
  areaId: string;
  estado: EstadoArea;
  /** Obligatoria para PENDIENTE y NO_APROBADO (se valida en la acción). */
  observacion?: string;
  autor?: string;
}

export interface ResultadoMutacion {
  estadoGlobal: Funcionario["estadoGlobal"];
  hayRechazo: boolean;
}

export interface Repo {
  listarFuncionarios(): Promise<Funcionario[]>;
  obtenerDetalle(funcionarioId: string): Promise<FuncionarioDetalle | null>;
  cambiarEstadoArea(args: CambiarEstadoAreaArgs): Promise<ResultadoMutacion>;
  registrarLiquidacion(funcionarioId: string): Promise<ResultadoMutacion>;
  obtenerMetricas(): Promise<MetricasDashboard>;
}
