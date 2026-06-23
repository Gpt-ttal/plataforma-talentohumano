/**
 * domain.ts — Tipos y contratos del dominio Paz y Salvo.
 * Fuente única de verdad sobre la forma de los datos. Sin lógica.
 */

/** Estado de una dependencia ("área de visto bueno") respecto a un funcionario. */
export type EstadoArea = "PENDIENTE" | "APROBADO" | "NO_APLICA" | "NO_APROBADO";

/** Estado global (consolidado) del paz y salvo de un funcionario. */
export type EstadoGlobal = "PENDIENTE" | "LISTO_PARA_LIQUIDAR" | "PAZ_Y_SALVO";

export const ESTADOS_AREA: readonly EstadoArea[] = [
  "PENDIENTE",
  "APROBADO",
  "NO_APLICA",
  "NO_APROBADO",
] as const;

export const ESTADOS_GLOBAL: readonly EstadoGlobal[] = [
  "PENDIENTE",
  "LISTO_PARA_LIQUIDAR",
  "PAZ_Y_SALVO",
] as const;

/** Una dependencia que debe dar visto bueno (catálogo configurable). */
export interface AreaVistoBueno {
  id: string;
  nombre: string;
  orden: number;
  activa: boolean;
}

/** Persona en proceso de retiro. */
export interface Funcionario {
  id: string;
  documento: string;
  nombreCompleto: string;
  fechaRetiro: string; // ISO date (yyyy-mm-dd)
  areaOrigen: string; // departamento de origen (del Excel)
  cargo: string;
  estadoGlobal: EstadoGlobal;
  fechaLiquidacion: string | null; // ISO datetime o null
  createdAt: string;
  updatedAt: string;
}

/** Estado de una (área × funcionario). */
export interface Aprobacion {
  id: string;
  funcionarioId: string;
  areaId: string;
  estado: EstadoArea;
  updatedAt: string;
}

/** Registro histórico de un cambio/comentario de área. */
export interface Observacion {
  id: string;
  funcionarioId: string;
  areaId: string;
  estado: EstadoArea;
  texto: string;
  autor: string;
  createdAt: string;
}

/** Aprobación enriquecida con el nombre del área (para la UI del detalle). */
export interface AprobacionConArea extends Aprobacion {
  areaNombre: string;
  orden: number;
}

/** Detalle completo de un funcionario para la pantalla de detalle. */
export interface FuncionarioDetalle {
  funcionario: Funcionario;
  aprobaciones: AprobacionConArea[];
  observaciones: Observacion[];
}

/** Métricas agregadas para el dashboard. */
export interface MetricasDashboard {
  totalFuncionarios: number;
  porEstado: Record<EstadoGlobal, number>;
  pendientesPorArea: { areaId: string; areaNombre: string; pendientes: number }[];
  aging: {
    atrasados: number; // fecha de retiro ya pasó y sigue pendiente
    proximos: number; // retiro en <= 7 días
    masAdelante: number; // retiro a > 7 días
    sinFecha: number;
  };
}
